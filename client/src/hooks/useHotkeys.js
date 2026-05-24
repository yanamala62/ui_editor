import { useEffect } from 'react';
import { useObserverStore } from '../store';

export function useHotkeys() {
  const observer = useObserverStore();

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && observer.showEditor) { observer.closeEditor(); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);

    let unsub;
    if (window.electronAPI?.onShortcut) {
      unsub = window.electronAPI.onShortcut((key) => {
        if (key === 'save-all') { /* trigger save all */ }
      });
    }

    return () => { window.removeEventListener('keydown', handler); unsub?.(); };
  }, [observer.showEditor]);
}
