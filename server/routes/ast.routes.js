const { Router } = require('express');
const ast = require('../services/ast.service');
const router = Router();

router.post('/update-text', (req, res) => {
  try {
    const { filePath, elementInfo, newText } = req.body;
    res.json(ast.updateTextContent(filePath, elementInfo, newText));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/search-and-update', async (req, res) => {
  try {
    const { repoPath, originalText, newText, newClasses } = req.body;
    const fs = require('fs');
    const path = require('path');
    const { globSync } = require('glob');

    if (!originalText || !originalText.trim()) {
      return res.json({ success: false, error: 'No text to search for' });
    }

    // Get a short unique search phrase (first 25 chars)
    const searchPhrase = originalText.trim().split('\n')[0].substring(0, 25).trim();
    if (searchPhrase.length < 2) return res.json({ success: false, error: 'Text too short' });

    const files = globSync('{src,app,pages,components,lib}/**/*.{jsx,tsx,js,ts,vue,html}', { cwd: repoPath, ignore: ['node_modules/**', 'dist/**', 'build/**', '.next/**', '.uilens-backups/**'] });
    let found = null;

    for (const file of files) {
      const abs = path.join(repoPath, file);
      const content = fs.readFileSync(abs, 'utf-8');
      if (content.includes(searchPhrase)) {
        found = { file: abs, content, relativePath: file };
        break;
      }
    }

    if (!found) {
      return res.json({ success: false, error: `Text "${searchPhrase}..." not found in any source file under src/. Make sure the text exists in your code (not generated dynamically).` });
    }

    let updated = found.content;
    let changed = false;

    // Replace text: find the line containing searchPhrase and replace the full string value
    if (newText && newText.trim() !== originalText.trim()) {
      // Find the string in quotes/JSX that contains our search phrase
      // Match patterns like: "...searchPhrase..." or >...searchPhrase...<  or `...searchPhrase...`
      const escSearch = searchPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Try JSX text content: >text<
      const jsxPattern = new RegExp(`(>)([^<]*${escSearch}[^<]*)(<)`, 'g');
      const jsxMatch = jsxPattern.exec(updated);
      if (jsxMatch) {
        updated = updated.replace(jsxMatch[0], jsxMatch[1] + newText.trim() + jsxMatch[3]);
        changed = true;
      }
      
      // Try string literal: "text" or 'text'
      if (!changed) {
        const strPattern = new RegExp(`(["'\`])([^"'\`]*${escSearch}[^"'\`]*)\\1`, 'g');
        const strMatch = strPattern.exec(updated);
        if (strMatch) {
          updated = updated.replace(strMatch[0], strMatch[1] + newText.trim() + strMatch[1]);
          changed = true;
        }
      }
    }

    // Update className
    if (newClasses) {
      const lines = updated.split('\n');
      const searchInFile = searchPhrase.substring(0, 15);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchInFile) || (changed && lines[i].includes(newText?.substring(0, 15) || ''))) {
          for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 3); j++) {
            const m = lines[j].match(/className=["'`]([^"'`]*)["'`]/);
            if (m) { lines[j] = lines[j].replace(m[1], newClasses); changed = true; break; }
          }
          break;
        }
      }
      if (changed) updated = lines.join('\n');
    }

    if (!changed) {
      return res.json({ success: false, error: `Found file but could not replace text. The text may be split across JSX elements or generated dynamically. Try editing a shorter/simpler text element.` });
    }

    // Backup and write
    const backupDir = path.join(repoPath, '.uilens-backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(found.file, path.join(backupDir, `${path.basename(found.file)}.${Date.now()}.bak`));
    fs.writeFileSync(found.file, updated, 'utf-8');

    res.json({ success: true, file: found.relativePath });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/update-classes', (req, res) => {
  try {
    const { filePath, elementInfo, newClasses } = req.body;
    res.json(ast.updateClassName(filePath, elementInfo, newClasses));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/update-styles', (req, res) => {
  try {
    const { filePath, elementInfo, styles } = req.body;
    res.json(ast.updateStyles(filePath, elementInfo, styles));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/update-prop', (req, res) => {
  try {
    const { filePath, elementInfo, propName, value } = req.body;
    res.json(ast.updateProp(filePath, elementInfo, propName, value));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/apply-code', (req, res) => {
  try {
    const { filePath, newCode } = req.body;
    res.json(ast.applyCode(filePath, newCode));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/component-map', (req, res) => {
  try { res.json(ast.scanComponents(req.query.repoPath)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
