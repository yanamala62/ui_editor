import { useEffect } from 'react';
import { useObserverStore, useLogsStore } from '../store';

export function useObserver() {
  const observer = useObserverStore();
  const logs = useLogsStore();

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsub = window.electronAPI.onElementClicked((data) => {
      observer.addToHistory({ type: 'CLICK', ...data });
      logs.addLog({ type: 'CLICK', message: `${data.react?.component || data.type} clicked`, data });
      const x = Math.min(data.rect?.right + 16 || 400, window.innerWidth - 400);
      const y = Math.max(data.rect?.top || 100, 60);
      observer.openEditor(data, { x, y });
    });
    return unsub;
  }, []);

  return observer;
}
