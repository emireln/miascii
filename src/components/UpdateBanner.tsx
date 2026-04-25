import { useEffect, useState } from 'react'
import { Download, RefreshCw, X, AlertCircle } from 'lucide-react'
import { bridge, isElectron, type UpdateInfo, type UpdateProgress } from '../lib/electronBridge'

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isElectron()) return

    const b = bridge()
    if (!b) return

    // Check for updates on mount
    checkForUpdates()

    // Set up event listeners
    const unsubscribeAvailable = b.updater.onAvailable((info) => {
      setUpdateInfo(info)
      setState('available')
      setError(null)
    })

    const unsubscribeNotAvailable = b.updater.onNotAvailable(() => {
      setState('idle')
    })

    const unsubscribeDownloaded = b.updater.onDownloaded((info) => {
      setUpdateInfo(info)
      setState('downloaded')
      setProgress(null)
    })

    const unsubscribeError = b.updater.onError((err) => {
      setError(err.error)
      setState('error')
    })

    const unsubscribeProgress = b.updater.onProgress((prog) => {
      setProgress(prog)
      if (state === 'downloading') {
        // Keep downloading state
      }
    })

    return () => {
      unsubscribeAvailable()
      unsubscribeNotAvailable()
      unsubscribeDownloaded()
      unsubscribeError()
      unsubscribeProgress()
    }
  }, [])

  const checkForUpdates = async () => {
    if (!isElectron()) return
    const b = bridge()
    if (!b) return

    setState('checking')
    setError(null)
    const result = await b.updater.check()
    if (result.error) {
      setError(result.error)
      setState('error')
    }
  }

  const downloadUpdate = async () => {
    if (!isElectron()) return
    const b = bridge()
    if (!b) return

    setState('downloading')
    setError(null)
    const result = await b.updater.download()
    if (result.error) {
      setError(result.error)
      setState('error')
    }
  }

  const installUpdate = async () => {
    if (!isElectron()) return
    const b = bridge()
    if (!b) return

    await b.updater.install()
  }

  const dismiss = () => {
    setState('idle')
    setUpdateInfo(null)
    setError(null)
    setProgress(null)
  }

  if (state === 'idle' || state === 'checking') return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-900/90 to-emerald-900/90 backdrop-blur-sm border-b border-green-500/30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {state === 'downloading' && (
            <RefreshCw className="w-5 h-5 text-green-400 animate-spin flex-shrink-0" />
          )}
          {state === 'downloaded' && (
            <Download className="w-5 h-5 text-green-400 flex-shrink-0" />
          )}
          {state === 'error' && (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          {state === 'available' && (
            <Download className="w-5 h-5 text-green-400 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            {state === 'available' && updateInfo && (
              <p className="text-sm text-green-100">
                <span className="font-semibold">Update available:</span> miascii {updateInfo.version}
              </p>
            )}
            {state === 'downloading' && progress && (
              <p className="text-sm text-green-100">
                <span className="font-semibold">Downloading update:</span> {progress.percent}%
              </p>
            )}
            {state === 'downloaded' && updateInfo && (
              <p className="text-sm text-green-100">
                <span className="font-semibold">Update ready:</span> miascii {updateInfo.version} — Restart to install
              </p>
            )}
            {state === 'error' && (
              <p className="text-sm text-red-200">
                <span className="font-semibold">Update error:</span> {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {state === 'available' && (
            <button
              onClick={downloadUpdate}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded border border-green-400/30 transition-colors"
            >
              Download
            </button>
          )}
          {state === 'downloading' && progress && (
            <button
              onClick={dismiss}
              className="px-3 py-1.5 bg-transparent hover:bg-white/10 text-green-100 text-sm font-medium rounded border border-green-400/30 transition-colors"
            >
              {progress.percent}%
            </button>
          )}
          {state === 'downloaded' && (
            <button
              onClick={installUpdate}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded border border-green-400/30 transition-colors"
            >
              Restart & Install
            </button>
          )}
          {state === 'error' && (
            <button
              onClick={checkForUpdates}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded border border-green-400/30 transition-colors"
            >
              Retry
            </button>
          )}
          <button
            onClick={dismiss}
            className="p-1.5 hover:bg-white/10 text-green-200 rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
