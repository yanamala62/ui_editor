const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:open-folder'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', { filePath, content }),
  listDirectory: (dirPath) => ipcRenderer.invoke('file:list', dirPath),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),

  startObserve: (url, config) => ipcRenderer.invoke('observer:start', { url, config }),
  stopObserve: () => ipcRenderer.invoke('observer:stop'),
  reloadObserver: () => ipcRenderer.invoke('observer:reload'),

  aiRequest: (prompt) => ipcRenderer.invoke('ai:request', { prompt }),
  aiSuggest: (elementInfo, userRequest) => ipcRenderer.invoke('ai:suggest', { elementInfo, userRequest }),

  getVersion: () => ipcRenderer.invoke('app:version'),

  onElementClicked: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('element:clicked', handler);
    return () => ipcRenderer.removeListener('element:clicked', handler);
  },
  onElementHovered: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('element:hovered', handler);
    return () => ipcRenderer.removeListener('element:hovered', handler);
  },
  onShortcut: (cb) => {
    const handler = (_e, key) => cb(key);
    ipcRenderer.on('shortcut', handler);
    return () => ipcRenderer.removeListener('shortcut', handler);
  },
});
