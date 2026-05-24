const { Router } = require('express');
const ai = require('../services/ai.service');
const router = Router();

router.post('/suggest', async (req, res) => {
  try {
    const { elementInfo, userRequest } = req.body;
    res.json(await ai.suggestUIImprovements(elementInfo, userRequest));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/analyze', async (req, res) => {
  try { res.json(await ai.analyzeComponent(req.body.elementInfo)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/chat', async (req, res) => {
  try {
    const result = await ai.chat(req.body.messages);
    res.json({ response: result.content });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/generate', async (req, res) => {
  try { res.json(await ai.generateCode(req.body.prompt, req.body.context)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/status', (_req, res) => { res.json(ai.getStatus()); });

module.exports = router;
