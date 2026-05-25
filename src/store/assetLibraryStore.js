import { create } from 'zustand'

function uid() { return Math.random().toString(36).slice(2, 9) }

export const useAssetLibraryStore = create((set) => ({
  // Vocal Studio album cover
  studioAlbumCover: null,  // { id, dataUrl, name, source, timestamp }

  // Builder asset tray
  builderAssets: [],        // [{ id, dataUrl, name, source, timestamp }]

  // Transfer overlay trigger — set this to show the crop animation
  pendingTransfer: null,    // { dataUrl, destination: 'studio' | 'builder', name, onCommit }

  // DAW → Video Editor master audio bridge
  masterAudioExport: null,  // { dataUrl, name, source } — object URL of rendered WAV

  setPendingTransfer: (t) => set({ pendingTransfer: t }),
  clearPendingTransfer: () => set({ pendingTransfer: null }),

  setStudioAlbumCover: (asset) => set({
    studioAlbumCover: { id: uid(), timestamp: Date.now(), ...asset },
  }),
  clearStudioAlbumCover: () => set({ studioAlbumCover: null }),

  addBuilderAsset: (asset) => set(s => ({
    builderAssets: [{ id: uid(), timestamp: Date.now(), ...asset }, ...s.builderAssets].slice(0, 24),
  })),
  removeBuilderAsset: (id) => set(s => ({
    builderAssets: s.builderAssets.filter(a => a.id !== id),
  })),

  setMasterAudioExport: (asset) => set({ masterAudioExport: asset }),
  clearMasterAudioExport: () => set({ masterAudioExport: null }),
}))
