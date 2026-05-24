import { create } from 'zustand';

export const useObserverStore = create((set, get) => ({
  isObserving: false,
  hoveredElement: null,
  selectedElement: null,
  showEditor: false,
  editorPosition: { x: 0, y: 0 },
  pendingChanges: [],
  interactionHistory: [],
  webviewUrl: 'http://localhost:5174/',
  webviewLoading: false,
  overlayEnabled: true,

  startObserving: () => set({ isObserving: true }),
  stopObserving: () => set({ isObserving: false, hoveredElement: null }),
  setHoveredElement: (el) => set({ hoveredElement: el }),
  setSelectedElement: (el) => set({ selectedElement: el }),

  openEditor: (elementInfo, position) => set({ showEditor: true, selectedElement: elementInfo, editorPosition: position }),
  closeEditor: () => set({ showEditor: false, selectedElement: null }),

  addPendingChange: (change) => set((s) => ({ pendingChanges: [...s.pendingChanges, change] })),
  removePendingChange: (id) => set((s) => ({ pendingChanges: s.pendingChanges.filter(c => c.id !== id) })),
  clearPendingChanges: () => set({ pendingChanges: [] }),

  addToHistory: (interaction) => set((s) => ({ interactionHistory: [...s.interactionHistory, { ...interaction, id: Date.now(), timestamp: new Date().toISOString() }] })),
  clearHistory: () => set({ interactionHistory: [] }),

  setWebviewUrl: (url) => set({ webviewUrl: url }),
  setWebviewLoading: (v) => set({ webviewLoading: v }),
  setOverlayEnabled: (v) => set({ overlayEnabled: v }),

  get hasPendingChanges() { return get().pendingChanges.length > 0; },
  get pendingChangesCount() { return get().pendingChanges.length; },
}));
