const express = require('express');
const router = express.Router();
const {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjectFiles,
  saveProjectFile,
} = require('../controllers/project.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.route('/').get(listProjects).post(createProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);
router.route('/:id/files').get(getProjectFiles).post(saveProjectFile);

module.exports = router;
