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

  // Auto-updater bridge
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onAvailable: (handler) => {
      const listener = (_e, info) => handler(info)
      ipcRenderer.on('updater:available', listener)
      return () => ipcRenderer.removeListener('updater:available', listener)
    },
    onNotAvailable: (handler) => {
      const listener = () => handler()
      ipcRenderer.on('updater:not-available', listener)
      return () => ipcRenderer.removeListener('updater:not-available', listener)
    },
    onDownloaded: (handler) => {
      const listener = (_e, info) => handler(info)
      ipcRenderer.on('updater:downloaded', listener)
      return () => ipcRenderer.removeListener('updater:downloaded', listener)
    },
    onError: (handler) => {
      const listener = (_e, error) => handler(error)
      ipcRenderer.on('updater:error', listener)
      return () => ipcRenderer.removeListener('updater:error', listener)
    },
    onProgress: (handler) => {
      const listener = (_e, progress) => handler(progress)
      ipcRenderer.on('updater:progress', listener)
      return () => ipcRenderer.removeListener('updater:progress', listener)
    },
  },
})
