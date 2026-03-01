const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const { supabase } = require('../config/db');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = jwt.verify(token, jwtConfig.secret);

    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, role, preferences, last_login, created_at, updated_at')
      .eq('id', decoded.id)
      .single();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Map the Supabase id to _id so frontend compatibility isn't broken
    user._id = user.id;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    logger.error('Auth middleware error:', err);
    next(err);
  }
};

module.exports = { authenticate };
