const { supabase } = require('../config/db');
const logger = require('../utils/logger');

// GET /api/projects
const listProjects = async (req, res) => {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, description, owner_id, status, architecture, requirements, current_session_id, iteration_count, tags, created_at, updated_at')
    .eq('owner_id', req.user._id)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('listProjects error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }

  // Map to frontend expected format
  const mapped = projects.map(p => ({ ...p, _id: p.id }));
  res.json({ success: true, data: mapped });
};

// POST /api/projects
const createProject = async (req, res) => {
  const { name, description, tags } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name required' });

  const { data: project, error } = await supabase
    .from('projects')
    .insert([{
      name,
      description,
      owner_id: req.user._id,
      tags: tags || []
    }])
    .select()
    .single();

  if (error) {
    logger.error('createProject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create project' });
  }

  project._id = project.id;
  res.status(201).json({ success: true, data: project });
};

// GET /api/projects/:id
const getProject = async (req, res) => {
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .eq('owner_id', req.user._id)
    .single();

  if (error || !project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  project._id = project.id;
  res.json({ success: true, data: project });
};

// PUT /api/projects/:id
const updateProject = async (req, res) => {
  const allowedUpdates = ['name', 'description', 'status', 'architecture', 'requirements', 'current_session_id', 'iteration_count', 'tags'];
  const updateData = {};
  
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updateData[key] = req.body[key];
    }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', req.params.id)
    .eq('owner_id', req.user._id)
    .select()
    .single();

  if (error || !project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  project._id = project.id;
  res.json({ success: true, data: project });
};

// DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  const { data: project, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id)
    .eq('owner_id', req.user._id)
    .select()
    .single();

  if (error || !project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  // Activities will auto-delete due to PostgreSQL ON DELETE CASCADE
  res.json({ success: true, message: 'Project deleted' });
};

// GET /api/projects/:id/files
const getProjectFiles = async (req, res) => {
  const { data: project, error } = await supabase
    .from('projects')
    .select('files')
    .eq('id', req.params.id)
    .eq('owner_id', req.user._id)
    .single();

  if (error || !project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  res.json({ success: true, data: project.files || [] });
};

// POST /api/projects/:id/files
const saveProjectFile = async (req, res) => {
  const { filename, path: filePath, content, language, agentSource } = req.body;
  
  // First get current files
  const { data: project, error: fetchErr } = await supabase
    .from('projects')
    .select('files')
    .eq('id', req.params.id)
    .eq('owner_id', req.user._id)
    .single();

  if (fetchErr || !project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  let files = project.files || [];
  const existingIdx = files.findIndex((f) => f.path === filePath);
  
  const newFile = {
    filename, path: filePath, content, language, agentSource, generatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    files[existingIdx] = newFile;
  } else {
    files.push(newFile);
  }

  const { data: updatedProject, error: updateErr } = await supabase
    .from('projects')
    .update({ files })
    .eq('id', req.params.id)
    .eq('owner_id', req.user._id)
    .select('files')
    .single();

  if (updateErr) {
    logger.error('Failed to save file:', updateErr);
    return res.status(500).json({ success: false, message: 'Failed to save file' });
  }

  res.json({ success: true, data: updatedProject.files });
};

module.exports = { listProjects, createProject, getProject, updateProject, deleteProject, getProjectFiles, saveProjectFile };
