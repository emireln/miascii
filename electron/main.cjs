// Electron main process — BrowserWindow + tray + settings persistence.
const {
  app, BrowserWindow, shell, Menu, session, Tray, nativeImage, ipcMain,
} = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('node:path')
const fs = require('node:fs')

const isDev = !app.isPackaged
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

// --- Auto-updater configuration -----------------------------------------------
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'emireln',
  repo: 'miascii',
})

autoUpdater.autoDownload = false // Let user click to install
autoUpdater.autoInstallOnAppQuit = false

// Assets live in two places:
//  - build/          used only at package time by electron-builder (installer
//                    graphics + the .ico written into the exe resource table)
//  - electron/assets shipped inside the asar so the RUNNING app can read them.
// We try the bundled location first, falling back to the build/ copy for `npm
// run electron:dev`.
function resolveAsset(filename) {
  const candidates = [
    path.join(__dirname, 'assets', filename),       // packaged
    path.join(__dirname, '..', 'build', filename),  // dev
  ]
  for (const p of candidates) {
    try { fs.accessSync(p); return p } catch {}
  }
  return candidates[0] // return something; nativeImage will flag it empty
}

const ICON_PATH = resolveAsset('icon.png')
const ICON_ICO = path.join(__dirname, '..', 'build', 'icon.ico') // only needed at package time
const TRAY_ICON_PNG = resolveAsset('tray-icon.png')

// --- Settings persistence ----------------------------------------------------
// Stored in userData/settings.json. These are the electron-side settings;
// the renderer has its own localStorage-backed prefs. Main is the source of
// truth for window/tray behaviors.
const DEFAULT_SETTINGS = {
  closeToTray: true,
  startMinimized: false,
  alwaysOnTop: false,
  launchAtStartup: false,
  minimizeToTray: false, // also intercept minimize events
}

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8')
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(s) {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
    fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2))
  } catch (e) {
    console.error('failed to save settings', e)
  }
}

let settings = loadSettings()

// --- State -------------------------------------------------------------------
/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {Tray | null} */
let tray = null
// True only when the user has confirmed full quit (via tray menu or Cmd+Q).
// Prevents the close-to-tray handler from blocking actual app shutdown.
let isQuitting = false

// Single-instance lock: focus the existing window if user relaunches the exe
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
}

// --- Window ------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    title: 'miascii',
    icon: process.platform === 'win32' ? ICON_ICO : ICON_PATH,
    show: !settings.startMinimized,
    alwaysOnTop: settings.alwaysOnTop,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    if (permission === 'media') return cb(true)
    cb(false)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Close → hide when close-to-tray is on
  mainWindow.on('close', (event) => {
    if (!isQuitting && settings.closeToTray && tray) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  // Optional: minimize → tray
  mainWindow.on('minimize', (event) => {
    if (settings.minimizeToTray && tray) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// --- Tray --------------------------------------------------------------------
function createTray() {
  try {
    let img = nativeImage.createFromPath(TRAY_ICON_PNG)
    if (img.isEmpty()) {
      console.warn(`tray icon empty at ${TRAY_ICON_PNG}, falling back to app icon`)
      img = nativeImage.createFromPath(ICON_PATH)
    }
    if (img.isEmpty()) {
      // No usable image at all — refuse to create an invisible tray, as that
      // would leave the app with no way back from a close-to-tray.
      throw new Error('no tray icon available')
    }
    tray = new Tray(img)
  } catch (e) {
    console.error('failed to create tray — disabling close-to-tray as a safety net', e)
    tray = null
    // Force close-to-tray off so the next window close actually quits the app.
    // Don't persist this flip — it's purely a runtime safety measure.
    settings.closeToTray = false
    settings.minimizeToTray = false
    return
  }

  tray.setToolTip('miascii')

  const rebuildMenu = () => {
    const menu = Menu.buildFromTemplate([
      { label: 'Show miascii', click: showMainWindow },
      { label: 'Hide to tray',  click: () => mainWindow?.hide() },
      { type: 'separator' },
      {
        label: 'Always on top',
        type: 'checkbox',
        checked: settings.alwaysOnTop,
        click: (item) => applySettings({ alwaysOnTop: item.checked }),
      },
      {
        label: 'Close minimizes to tray',
        type: 'checkbox',
        checked: settings.closeToTray,
        click: (item) => applySettings({ closeToTray: item.checked }),
      },
      { type: 'separator' },
      { label: 'Quit miascii', click: quitApp },
    ])
    tray.setContextMenu(menu)
  }
  rebuildMenu()
  tray._rebuildMenu = rebuildMenu

  // Single click (Windows/Linux) or double click toggles the window
  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide()
    else showMainWindow()
  })
  tray.on('double-click', showMainWindow)
}

function showMainWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function quitApp() {
  isQuitting = true
  app.quit()
}

// --- Apply settings ----------------------------------------------------------
// Writes to disk, mutates memory, reflects on the running window + tray.
function applySettings(partial) {
  settings = { ...settings, ...partial }
  saveSettings(settings)

  if (mainWindow) {
    if ('alwaysOnTop' in partial) {
      mainWindow.setAlwaysOnTop(!!settings.alwaysOnTop)
    }
  }
  if ('launchAtStartup' in partial) {
    app.setLoginItemSettings({
      openAtLogin: !!settings.launchAtStartup,
      openAsHidden: !!settings.startMinimized,
    })
  }
  if (tray && tray._rebuildMenu) tray._rebuildMenu()

  // Notify the renderer so any open Settings UI reflects the change
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings:updated', settings)
  }
}

// --- IPC bridge --------------------------------------------------------------
ipcMain.handle('settings:get', () => settings)
ipcMain.handle('settings:set', (_e, partial) => {
  if (partial && typeof partial === 'object') applySettings(partial)
  return settings
})
ipcMain.handle('app:quit', () => { quitApp() })
ipcMain.handle('app:hide', () => { mainWindow?.hide() })
ipcMain.handle('app:show', () => { showMainWindow() })
ipcMain.handle('app:reveal-settings-file', () => {
  shell.showItemInFolder(settingsPath())
})
ipcMain.handle('app:open-external', (_e, url) => {
  if (typeof url === 'string') shell.openExternal(url)
})
ipcMain.handle('app:version', () => app.getVersion())

// --- Auto-updater IPC handlers -----------------------------------------------
ipcMain.handle('updater:check', async () => {
  if (isDev) {
    return { error: 'Updates are disabled in development' }
  }
  try {
    await autoUpdater.checkForUpdates()
    return { success: true }
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('updater:download', async () => {
  if (isDev) {
    return { error: 'Updates are disabled in development' }
  }
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('updater:install', () => {
  if (isDev) {
    return { error: 'Updates are disabled in development' }
  }
  autoUpdater.quitAndInstall()
  return { success: true }
})

// --- Auto-updater event handlers ---------------------------------------------
autoUpdater.on('update-available', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  }
})

autoUpdater.on('update-not-available', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:not-available')
  }
})

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:downloaded', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })
  }
})

autoUpdater.on('error', (error) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:error', { error: error.message })
  }
})

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:progress', {
      percent: Math.floor(progress.percent),
      bytesPerSecond: Math.floor(progress.bytesPerSecond),
      transferred: Math.floor(progress.transferred),
      total: Math.floor(progress.total),
    })
  }
})

// --- Boot --------------------------------------------------------------------
if (!isDev) Menu.setApplicationMenu(null)

app.whenReady().then(() => {
  // Mirror the persisted launchAtStartup to OS login items on boot.
  app.setLoginItemSettings({
    openAtLogin: !!settings.launchAtStartup,
    openAsHidden: !!settings.startMinimized,
  })

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showMainWindow()
  })
})

app.on('before-quit', () => { isQuitting = true })

app.on('window-all-closed', () => {
  // Only stay alive on window-all-closed if close-to-tray is on AND a tray
  // actually exists. Without a tray the app would be stuck invisible.
  if (settings.closeToTray && tray && !isQuitting) return
  if (process.platform !== 'darwin') app.quit()
})
