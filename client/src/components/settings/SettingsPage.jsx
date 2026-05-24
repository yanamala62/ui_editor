import React, { useState } from 'react';
import { useSettingsStore } from '../../store';

export function SettingsPage() {
  const settings = useSettingsStore();
  const [saved, setSaved] = useState(false);

  const handleBrowse = async () => {
    if (!window.electronAPI?.openFolderDialog) return;
    const folder = await window.electronAPI.openFolderDialog();
    if (folder) settings.updateSettings({ repoPath: folder });
  };

  const handleSave = async () => {
    await settings.saveToElectron();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-xl font-bold text-gray-100">Settings</h1>

      {/* Repository */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Repository</h2>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Repository Path</label>
          <div className="flex gap-2">
            <input value={settings.repoPath} onChange={(e) => settings.updateSettings({ repoPath: e.target.value })} className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 outline-none focus:border-blue-500" placeholder="D:/project/my-app" />
            <button onClick={handleBrowse} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 rounded-lg">Browse</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Localhost URL</label>
          <input value={settings.localhostUrl} onChange={(e) => settings.updateSettings({ localhostUrl: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Framework</label>
          <div className="grid grid-cols-5 gap-2">
            {[['react', '⚛️ React'], ['nextjs', '▲ Next.js'], ['vue', '💚 Vue'], ['angular', '🔴 Angular'], ['html', '🌐 HTML']].map(([val, label]) => (
              <button key={val} onClick={() => settings.updateSettings({ framework: val })} className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${settings.framework === val ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>{label}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Observer */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Observer</h2>
        <Toggle label="Enable hover overlay" value={settings.showOverlay} onChange={(v) => settings.updateSettings({ showOverlay: v })} />
        <Toggle label="Auto-save changes" value={settings.autoSave} onChange={(v) => settings.updateSettings({ autoSave: v })} />
        <Toggle label="Create backups before save" value={settings.backupEnabled} onChange={(v) => settings.updateSettings({ backupEnabled: v })} />
      </section>

      {/* AI */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Assistant</h2>
        <Toggle label="Enable AI" value={settings.aiEnabled} onChange={(v) => settings.updateSettings({ aiEnabled: v })} />
        <div>
          <label className="text-xs text-gray-500 block mb-1">AI Provider</label>
          <select value={settings.aiProvider} onChange={(e) => settings.updateSettings({ aiProvider: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 outline-none">
            <option value="kiro">Kiro</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
        <button onClick={() => settings.resetSettings()} className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:text-white">Reset Defaults</button>
        <button onClick={handleSave} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg">{saved ? '✓ Saved' : 'Save Settings'}</button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <button onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-blue-600' : 'bg-gray-700'}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
