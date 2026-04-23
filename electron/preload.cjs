// Minimal preload — the renderer is already a fully self-contained SPA and
// doesn't need Node APIs. We just expose a flag so code can detect Electron
// at runtime if it ever needs to (currently unused).
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('miascii', {
  isDesktop: true,
  platform: process.platform,

  // Settings bridge
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    onUpdate: (handler) => {
      const listener = (_e, s) => handler(s)
      ipcRenderer.on('settings:updated', listener)
      return () => ipcRenderer.removeListener('settings:updated', listener)
    },
    revealFile: () => ipcRenderer.invoke('app:reveal-settings-file'),
  },

  // App lifecycle / utility
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
    hide: () => ipcRenderer.invoke('app:hide'),
    show: () => ipcRenderer.invoke('app:show'),
    version: () => ipcRenderer.invoke('app:version'),
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  },
})
