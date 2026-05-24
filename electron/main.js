const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

let mainWindow, browser, page;
const settingsFile = path.join(app.getPath('userData'), 'uilens-settings.json');

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile, 'utf-8')); } catch { return {}; }
}
function saveSettings(data) {
  fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 1000, minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Wait for Vite then load
  const http = require('http');
  const waitAndLoad = () => {
    http.get('http://localhost:5173', () => {
      mainWindow.loadURL('http://localhost:5173');
    }).on('error', () => setTimeout(waitAndLoad, 1000));
  };
  waitAndLoad();

  setupIPC();
}

function setupIPC() {
  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('settings:get', () => loadSettings());
  ipcMain.handle('settings:set', (_e, settings) => { saveSettings({ ...loadSettings(), ...settings }); return true; });
  ipcMain.handle('settings:reset', () => { saveSettings({}); return true; });

  ipcMain.handle('file:read', (_e, filePath) => {
    return fs.readFileSync(path.resolve(filePath), 'utf-8');
  });

  ipcMain.handle('file:write', (_e, { filePath, content }) => {
    fs.writeFileSync(path.resolve(filePath), content, 'utf-8');
    return true;
  });

  ipcMain.handle('file:list', (_e, dirPath) => {
    const abs = path.resolve(dirPath);
    return fs.readdirSync(abs, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => ({ name: e.name, type: e.isDirectory() ? 'directory' : 'file', path: path.join(abs, e.name) }));
  });

  ipcMain.handle('observer:start', async (_e, { url, config }) => {
    try {
      if (browser) { await browser.close().catch(() => {}); }

      console.log('[UILens] Launching browser for:', url);
      browser = await chromium.launch({
        headless: false,
        args: ['--disable-web-security', '--no-sandbox', '--disable-features=VizDisplayCompositor']
      });
      const ctx = await browser.newContext({ bypassCSP: true, ignoreHTTPSErrors: true });
      page = await ctx.newPage();

      // Expose callback functions BEFORE navigation
      await page.exposeFunction('__uilens_event', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('element:clicked', data);
        }
      });
      await page.exposeFunction('__uilens_hover', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('element:hovered', data);
        }
      });

      // Inject observer script
      const scriptPath = path.join(__dirname, '..', 'observer-engine', 'inject.js');
      if (fs.existsSync(scriptPath)) {
        const observerScript = fs.readFileSync(scriptPath, 'utf-8');
        await page.addInitScript(observerScript);
      } else {
        console.error('[UILens] Observer script not found at:', scriptPath);
      }

      // Navigate
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('[UILens] Page loaded:', url);
      return { success: true };
    } catch (e) {
      console.error('[UILens] Observer start error:', e.message);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('observer:stop', async () => {
    if (browser) { await browser.close().catch(() => {}); browser = null; page = null; }
    return true;
  });

  ipcMain.handle('observer:reload', async () => {
    if (page) {
      try {
        await page.evaluate(() => window.location.reload());
      } catch (_) {
        try { await page.reload({ waitUntil: 'domcontentloaded' }); } catch (_) {}
      }
    }
    return true;
  });

  ipcMain.handle('ai:request', async (_e, { prompt }) => {
    try {
      const axios = require('axios');
      const res = await axios.post('http://localhost:3001/api/ai/chat', { messages: [{ role: 'user', content: prompt }] });
      return res.data;
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('ai:suggest', async (_e, { elementInfo, userRequest }) => {
    try {
      const axios = require('axios');
      const res = await axios.post('http://localhost:3001/api/ai/suggest', { elementInfo, userRequest });
      return res.data;
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('app:version', () => app.getVersion());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', async () => { if (browser) await browser.close().catch(() => {}); });
