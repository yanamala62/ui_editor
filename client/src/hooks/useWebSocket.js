import { useEffect, useRef } from 'react';
import { useLogsStore } from '../store';

export function useWebSocket(url = 'ws://localhost:3001/ws') {
  const ws = useRef(null);
  const logs = useLogsStore();

  useEffect(() => {
    function connect() {
      ws.current = new WebSocket(url);
      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'FILE_CHANGED') {
            logs.addLog({ type: 'INFO', message: `File changed: ${msg.path}` });
          }
        } catch (_) {}
      };
      ws.current.onclose = () => setTimeout(connect, 3000);
      ws.current.onerror = () => ws.current?.close();
    }
    connect();
    return () => ws.current?.close();
  }, [url]);

  return ws;
}
