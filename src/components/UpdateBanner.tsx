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
    <div
      className="pixel-panel !shadow-none border-b-2 border-[var(--fg)] px-4 py-2 z-50"
      style={{ background: 'var(--panel)', color: 'var(--fg)' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {state === 'downloading' && (
            <RefreshCw size={14} className="animate-spin flex-shrink-0" />
          )}
          {state === 'downloaded' && (
            <Download size={14} className="flex-shrink-0" />
          )}
          {state === 'error' && (
            <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          )}
          {state === 'available' && (
            <Download size={14} className="flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0 text-base">
            {state === 'available' && updateInfo && (
              <span>
                <span className="font-pixel text-[10px] uppercase tracking-wider mr-2">[update]</span>
                miascii {updateInfo.version} available
              </span>
            )}
            {state === 'downloading' && progress && (
              <span>
                <span className="font-pixel text-[10px] uppercase tracking-wider mr-2">[downloading]</span>
                {progress.percent}%
              </span>
            )}
            {state === 'downloaded' && updateInfo && (
              <span>
                <span className="font-pixel text-[10px] uppercase tracking-wider mr-2">[ready]</span>
                miascii {updateInfo.version} — restart to install
              </span>
            )}
            {state === 'error' && (
              <span className="text-red-400">
                <span className="font-pixel text-[10px] uppercase tracking-wider mr-2">[error]</span>
                {error}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {state === 'available' && (
            <button
              onClick={downloadUpdate}
              className="pixel-btn !py-0.5 !px-2.5 !text-sm"
            >
              Download
            </button>
          )}
          {state === 'downloading' && progress && (
            <button
              onClick={dismiss}
              className="pixel-btn !py-0.5 !px-2.5 !text-sm"
            >
              {progress.percent}%
            </button>
          )}
          {state === 'downloaded' && (
            <button
              onClick={installUpdate}
              className="pixel-btn !py-0.5 !px-2.5 !text-sm"
            >
              Restart & Install
            </button>
          )}
          {state === 'error' && (
            <button
              onClick={checkForUpdates}
              className="pixel-btn !py-0.5 !px-2.5 !text-sm"
            >
              Retry
            </button>
          )}
          <button
            onClick={dismiss}
            className="pixel-btn !p-1"
            title="Dismiss"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
