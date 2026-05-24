import { create } from 'zustand';

const DEFAULTS = {
  repoPath: 'C:\\Users\\lenovo\\Downloads\\New folder\\Byte-code',
  localhostUrl: 'http://localhost:5174/',
  framework: 'react',
  theme: 'dark',
  autoSave: false,
  showOverlay: true,
  overlayColor: '#3B82F6',
  hotReload: true,
  aiEnabled: true,
  aiProvider: 'kiro',
  fontSize: 14,
  editorTheme: 'vs-dark',
  backupEnabled: true,
  maxBackups: 10,
};

export const useSettingsStore = create((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  updateSettings: (partial) => set(partial),
  resetSettings: () => set(DEFAULTS),

  loadFromElectron: async () => {
    if (!window.electronAPI?.getSettings) { set({ loaded: true }); return; }
    const saved = await window.electronAPI.getSettings();
    if (saved && typeof saved === 'object') set({ ...saved, loaded: true });
    else set({ loaded: true });
  },

  saveToElectron: async () => {
    if (!window.electronAPI?.setSettings) return;
    const { loaded, loadFromElectron, saveToElectron, updateSettings, resetSettings, ...data } = get();
    await window.electronAPI.setSettings(data);
  },
}));
