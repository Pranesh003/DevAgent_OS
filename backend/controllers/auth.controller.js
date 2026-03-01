const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/db');
const { jwt: jwtConfig } = require('../config/env');
const logger = require('../utils/logger');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
  const refreshToken = jwt.sign({ id: userId, jti: uuidv4() }, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/signup
const signup = async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .or(`email.eq.${email},username.eq.${username}`)
    .single();

  if (existingUser) {
    return res.status(409).json({ success: false, message: 'Email or username already in use' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Insert user
  const { data: user, error } = await supabase
    .from('users')
    .insert([{ username, email, password_hash: passwordHash, role: role || 'developer' }])
    .select()
    .single();

  if (error) {
    logger.error('Signup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Signup failed' });
  }

  const { accessToken, refreshToken } = generateTokens(user.id);
  
  // Save refresh token
  await supabase
    .from('users')
    .update({ refresh_tokens: [refreshToken] })
    .eq('id', user.id);

  logger.info(`New user registered: ${email}`);
  
  // Format for frontend
  const safeUser = { _id: user.id, username: user.username, email: user.email, role: user.role };

  res.status(201).json({
    success: true,
    data: { user: safeUser, accessToken, refreshToken },
  });
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const { accessToken, refreshToken } = generateTokens(user.id);
  
  const refreshTokens = user.refresh_tokens || [];
  refreshTokens.push(refreshToken);

  await supabase
    .from('users')
    .update({ refresh_tokens: refreshTokens, last_login: new Date().toISOString() })
    .eq('id', user.id);

  logger.info(`User logged in: ${email}`);

  const safeUser = { _id: user.id, username: user.username, email: user.email, role: user.role };

  res.json({
    success: true,
    data: { user: safeUser, accessToken, refreshToken },
  });
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', decoded.id)
    .single();

  if (!user || !user.refresh_tokens || !user.refresh_tokens.includes(refreshToken)) {
    return res.status(401).json({ success: false, message: 'Refresh token revoked' });
  }

  // Rotate refresh token
  let refreshTokens = user.refresh_tokens.filter((t) => t !== refreshToken);
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
  refreshTokens.push(newRefreshToken);

  await supabase
    .from('users')
    .update({ refresh_tokens: refreshTokens })
    .eq('id', user.id);

  res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
};

// POST /api/auth/logout
const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken && req.user && req.user._id) {
    const { data: user } = await supabase
      .from('users')
      .select('refresh_tokens')
      .eq('id', req.user._id)
      .single();

    if (user && user.refresh_tokens) {
      const refreshTokens = user.refresh_tokens.filter((t) => t !== refreshToken);
      await supabase
        .from('users')
        .update({ refresh_tokens: refreshTokens })
        .eq('id', req.user._id);
    }
  }
  res.json({ success: true, message: 'Logged out' });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { signup, login, refresh, logout, getMe };
