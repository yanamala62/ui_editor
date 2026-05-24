import React, { useState } from 'react';
import { useObserverStore, useLogsStore, useSettingsStore } from '../../store';

export function BrowserToolbar() {
  const observer = useObserverStore();
  const logs = useLogsStore();
  const settings = useSettingsStore();
  const [url, setUrl] = useState(observer.webviewUrl || settings.localhostUrl);

  const handleStart = async () => {
    if (!window.electronAPI) return;
    observer.setWebviewUrl(url);
    observer.setWebviewLoading(true);
    logs.addLog({ type: 'INFO', message: `Starting observer: ${url}` });
    const result = await window.electronAPI.startObserve(url, { repoPath: settings.repoPath, framework: settings.framework });
    observer.setWebviewLoading(false);
    if (result.success) {
      observer.startObserving();
      logs.addLog({ type: 'INFO', message: 'Observer active - click elements in the browser window' });
    } else {
      logs.addLog({ type: 'ERROR', message: result.error || 'Failed to start' });
    }
  };

  const handleStop = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.stopObserve();
    observer.stopObserving();
    logs.addLog({ type: 'INFO', message: 'Observer stopped' });
  };

  return (
    <div className={`h-14 flex items-center gap-3 px-4 bg-gray-900 border-b border-gray-800 ${observer.isObserving ? 'border-l-2 border-l-green-500' : ''}`}>
      {/* URL Input */}
      <div className="flex-1 flex items-center bg-gray-800 rounded-lg h-9 px-3 border border-gray-700 focus-within:border-blue-500 transition-colors">
        <span className="text-gray-500 text-xs mr-2">{url.startsWith('https') ? '🔒' : '🌐'}</span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
          placeholder="http://localhost:3000"
        />
        {observer.webviewLoading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
      </div>

      {/* Controls */}
      {!observer.isObserving ? (
        <button onClick={handleStart} className="h-9 px-4 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full" />
          Start
        </button>
      ) : (
        <button onClick={handleStop} className="h-9 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors">
          Stop
        </button>
      )}

      {observer.isObserving && (
        <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Observing
        </span>
      )}

      {observer.pendingChanges.length > 0 && (
        <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
          {observer.pendingChanges.length} unsaved
        </span>
      )}
    </div>
  );
}
