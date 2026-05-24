import { create } from 'zustand';

export const useLogsStore = create((set, get) => ({
  logs: [],
  filter: 'all',

  addLog: (log) => set((s) => ({
    logs: [...s.logs, { ...log, id: Date.now() + Math.random(), timestamp: new Date().toISOString() }].slice(-500),
  })),

  clearLogs: () => set({ logs: [] }),
  setFilter: (f) => set({ filter: f }),

  get filteredLogs() {
    const { logs, filter } = get();
    if (filter === 'all') return logs;
    return logs.filter(l => l.type?.toLowerCase() === filter);
  },
}));
