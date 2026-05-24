import React, { useState, useEffect } from 'react';
import { useSettingsStore, useObserverStore, useLogsStore } from './store';
import { BrowserToolbar } from './components/browser/BrowserToolbar';
import { LogsPanel } from './components/logs/LogsPanel';
import { SettingsPage } from './components/settings/SettingsPage';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [view, setView] = useState('browser');
  const settings = useSettingsStore();
  const observer = useObserverStore();
  const logs = useLogsStore();

  useEffect(() => { settings.loadFromElectron(); }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsub1 = window.electronAPI.onElementClicked((data) => {
      observer.addToHistory({ type: 'CLICK', ...data });
      logs.addLog({ type: 'CLICK', message: `${data.react?.component || data.type} — "${(data.text || '').substring(0, 40)}"`, data });
    });
    return () => { unsub1?.(); };
  }, []);

  if (!settings.loaded) return <div className="h-screen flex items-center justify-center bg-gray-950"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="h-8 bg-gray-900 flex items-center px-4 border-b border-gray-800 select-none" style={{ WebkitAppRegion: 'drag' }}>
        <span className="text-xs font-bold text-blue-400 tracking-wider">UILens</span>
        <div className="flex-1" />
        <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button onClick={() => setView('browser')} className={`px-3 py-0.5 text-[10px] font-semibold rounded ${view === 'browser' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Observer</button>
          <button onClick={() => setView('settings')} className={`px-3 py-0.5 text-[10px] font-semibold rounded ${view === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Settings</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'settings' ? (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-auto">
            <SettingsPage />
          </motion.div>
        ) : (
          <motion.div key="browser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
            <BrowserToolbar />
            <div className="flex-1 overflow-auto bg-gray-900">
              {observer.isObserving ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">Observing: {observer.webviewUrl}</span>
                    <span className="text-[10px] text-gray-500 ml-2">Double-click elements in the browser to edit</span>
                    <span className="text-[10px] text-gray-600 ml-auto">{observer.interactionHistory.length} interactions</span>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-2">
                    {observer.interactionHistory.length === 0 ? (
                      <div className="text-center mt-20">
                        <p className="text-gray-500 text-sm">Double-click any element in the browser window to edit it</p>
                        <p className="text-gray-600 text-xs mt-2">Single clicks work normally — navigation, buttons, etc.</p>
                      </div>
                    ) : (
                      observer.interactionHistory.slice().reverse().map((item) => (
                        <div key={item.id} className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                            {(item.react?.component || item.type || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">{item.react?.component || `<${item.type}>`}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{item.text || 'No text'}</p>
                            <div className="flex gap-2 mt-1">
                              {item.react?.file && <span className="text-[10px] text-gray-600 font-mono">{item.react.file.split(/[\\/]/).pop()}</span>}
                              <span className="text-[10px] text-gray-700">{new Date(item.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-500 text-sm">Enter a URL and click Start to begin observing</p>
                    <p className="text-gray-600 text-xs mt-2">The editor popup will appear directly in the browser window</p>
                  </div>
                </div>
              )}
            </div>
            <LogsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
