import { create } from 'zustand';

export const useAIStore = create((set) => ({
  loading: false,
  suggestions: [],
  chatHistory: [],
  error: null,

  setSuggestions: (s) => set({ suggestions: s, loading: false }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e, loading: false }),
  addChatMessage: (msg) => set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
  clearChat: () => set({ chatHistory: [], suggestions: [] }),
}));
