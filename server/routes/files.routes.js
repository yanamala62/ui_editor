const { Router } = require('express');
const { FileService } = require('../services/file.service');
const router = Router();
const fileService = new FileService(process.env.DEFAULT_REPO_PATH || '');

router.get('/read', (req, res) => {
  try {
    let filePath = req.query.path;
    // Handle various path formats from React fiber _debugSource
    // e.g. "/src/App.jsx" or "C:/Users/.../src/App.jsx" or relative paths
    if (filePath && !require('path').isAbsolute(filePath) && fileService.basePath) {
      filePath = require('path').join(fileService.basePath, filePath);
    }
    const result = fileService.read(filePath);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/write', (req, res) => {
  try {
    const { path: filePath, content, createBackup = true } = req.body;
    const result = fileService.write(filePath, content, createBackup);
    req.app.locals.broadcast('SAVE_COMPLETE', { file: filePath, success: true });
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/list', (req, res) => {
  try { res.json(fileService.list(req.query.path)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/backup', (req, res) => {
  try { res.json({ backupPath: fileService.backup(req.body.path) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/restore', (req, res) => {
  try { res.json(fileService.restore(req.body.path)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/set-repo', (req, res) => {
  fileService.setBasePath(req.body.path);
  const watcher = req.app.locals.watcher;
  if (watcher) watcher.watch(req.body.path);
  res.json({ success: true });
});

module.exports = router;
