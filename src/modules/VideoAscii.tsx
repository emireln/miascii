import { useEffect, useMemo, useRef, useState } from 'react'
import { usePersisted } from '../lib/usePersisted'
import { useT } from '../i18n'
import {
  Play, Pause, Video as VideoIcon, Camera, X, Copy, Download,
  Image as ImageIcon, FlipHorizontal, FlipVertical, Sparkles, Film, Square,
} from 'lucide-react'
import Dropzone from '../components/Dropzone'
import { Label, Slider, Toggle } from '../components/Control'
import PixelSelect from '../components/PixelSelect'
import {
  DENSITY_PRESETS,
  sourceToAscii,
  type AsciiOptions,
  type AsciiResult,
  type ColorMode,
  type DensityKey,
  type DitherMode,
} from '../lib/ascii'
import { paintAsciiToPre } from '../lib/videoRender'
import { paintAsciiToCanvas, pickSupportedMime } from '../lib/asciiCanvas'
import { copyText, downloadNodeAsPng, downloadText } from '../lib/export'
import { cn } from '../lib/cn'

const DENSITY_KEYS = Object.keys(DENSITY_PRESETS) as DensityKey[]
const DITHER_MODES: DitherMode[] = ['none', 'floyd-steinberg', 'ordered']
const COLOR_MODES: ColorMode[] = ['off', 'full', 'duotone']
type Source = 'none' | 'file' | 'webcam'

export default function VideoAscii() {
  const t = useT()
  // Source
  const [source, setSource] = useState<Source>('none')
  const [fileName, setFileName] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [fps, setFps] = usePersisted<number>('video.fps', 24)
  const [mirror, setMirror] = usePersisted<boolean>('video.mirror', true)

  // Processing
  const [cols, setCols] = usePersisted<number>('video.cols', 100)
  const [densityKey, setDensityKey] = usePersisted<DensityKey>('video.densityKey', 'standard')
  const [customDensity, setCustomDensity] = usePersisted<string>('video.customDensity', '')
  const [invert, setInvert] = usePersisted<boolean>('video.invert', false)
  const [color, setColor] = usePersisted<ColorMode>('video.color', 'off')
  const [duoA, setDuoA] = usePersisted<string>('video.duoA', '#000000')
  const [duoB, setDuoB] = usePersisted<string>('video.duoB', '#ffffff')
  const [contrast, setContrast] = usePersisted<number>('video.contrast', 1)
  const [brightness, setBrightness] = usePersisted<number>('video.brightness', 0)
  const [gamma, setGamma] = usePersisted<number>('video.gamma', 1)
  const [dither, setDither] = usePersisted<DitherMode>('video.dither', 'none')
  const [edges, setEdges] = usePersisted<boolean>('video.edges', false)
  const [edgeThreshold, setEdgeThreshold] = usePersisted<number>('video.edgeThreshold', 0.25)
  const [charAspect, setCharAspect] = usePersisted<number>('video.charAspect', 2)
  const [fontSize, setFontSize] = usePersisted<number>('video.fontSize', 10)
  const [flipV, setFlipV] = usePersisted<boolean>('video.flipV', false)

  // Stats / export
  const [actualFps, setActualFps] = useState(0)
  const [hasFrame, setHasFrame] = useState(false)
  const [copied, setCopied] = useState(false)

  // Recording
  const [recording, setRecording] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const renderCanvasRef = useRef<HTMLCanvasElement>(null)
  const scratchRef = useRef<HTMLCanvasElement | null>(null)
  if (!scratchRef.current) scratchRef.current = document.createElement('canvas')
  const lastResultRef = useRef<AsciiResult | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recChunksRef = useRef<Blob[]>([])
  const recStartRef = useRef<number>(0)
  const recordingRef = useRef(false)

  // Keep a live ref of all options so the RAF loop can read current values
  const densityChars = customDensity.trim() || DENSITY_PRESETS[densityKey]
  const optsRef = useRef<AsciiOptions>({
    cols, density: densityChars, invert, color,
    duotoneA: duoA, duotoneB: duoB,
    contrast, brightness, gamma, dither, edges, edgeThreshold,
    charAspect, flipH: false, flipV: false,
  })
  useEffect(() => {
    optsRef.current = {
      cols, density: densityChars, invert, color,
      duotoneA: duoA, duotoneB: duoB,
      contrast, brightness, gamma, dither, edges, edgeThreshold,
      charAspect,
      flipH: source === 'webcam' ? mirror : false,
      flipV,
    }
  }, [
    cols, densityChars, invert, color, duoA, duoB, contrast, brightness, gamma,
    dither, edges, edgeThreshold, charAspect, flipV, source, mirror,
  ])

  const fpsRef = useRef(fps)
  useEffect(() => { fpsRef.current = fps }, [fps])

  // RAF loop
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let lastFrame = 0
    let fpsSamples: number[] = []
    let lastSampleAt = performance.now()

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      const interval = 1000 / fpsRef.current
      if (t - lastFrame < interval) return
      lastFrame = t

      const v = videoRef.current
      const pre = preRef.current
      if (!v || !pre) return
      if (v.readyState < 2 || v.videoWidth === 0) return

      const r = sourceToAscii(v, optsRef.current, scratchRef.current!)
      if (!r) return
      paintAsciiToPre(pre, r)
      lastResultRef.current = r
      if (!hasFrameRef.current) {
        hasFrameRef.current = true
        setHasFrame(true)
      }
      // Mirror to visible canvas when recording so MediaRecorder captures it
      if (recordingRef.current && renderCanvasRef.current) {
        const bg = getComputedStyle(document.body).getPropertyValue('--panel') || '#000'
        const fg = getComputedStyle(document.body).getPropertyValue('--fg') || '#fff'
        paintAsciiToCanvas(renderCanvasRef.current, r, {
          fontPx: fontSizeRef.current,
          fg: fg.trim() || '#fff',
          bg: bg.trim() || '#000',
        })
        setRecElapsed(Math.floor((performance.now() - recStartRef.current) / 1000))
      }

      // FPS sampling
      const now = performance.now()
      fpsSamples.push(now)
      while (fpsSamples.length && now - fpsSamples[0] > 1000) fpsSamples.shift()
      if (now - lastSampleAt > 250) {
        lastSampleAt = now
        setActualFps(fpsSamples.length)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  // File upload handling
  const onFile = (file: File) => {
    stopWebcam()
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setFileName(file.name)
    setSource('file')
    setPlaying(true)
    setMirror(false)
    setTimeout(() => {
      const v = videoRef.current
      if (v) {
        v.src = url
        v.loop = true
        v.muted = true
        v.play().catch(() => {})
      }
    }, 0)
  }

  // Webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null) }
      setFileName('')
      setSource('webcam')
      setMirror(true)
      setPlaying(true)
      setTimeout(() => {
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          v.muted = true
          v.play().catch(() => {})
        }
      }, 0)
    } catch (e) {
      console.error('webcam denied', e)
      alert(t('video.cameraDenied'))
    }
  }

  const stopWebcam = () => {
    const v = videoRef.current
    const s = v?.srcObject as MediaStream | null
    s?.getTracks().forEach((t) => t.stop())
    if (v) v.srcObject = null
  }

  const clearSource = () => {
    setPlaying(false)
    stopWebcam()
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(null)
    setFileName('')
    setSource('none')
    setHasFrame(false)
    hasFrameRef.current = false
    lastResultRef.current = null
    setActualFps(0)
    if (preRef.current) preRef.current.textContent = ''
  }

  // Cleanup on unmount
  useEffect(() => () => {
    stopWebcam()
    if (videoUrl) URL.revokeObjectURL(videoUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (source === 'file') {
      if (v.paused) { v.play().catch(() => {}); setPlaying(true) }
      else { v.pause(); setPlaying(false) }
    } else if (source === 'webcam') {
      setPlaying((p) => !p)
    }
  }

  const handleCopy = async () => {
    const text = lastResultRef.current?.text
    if (!text) return
    const ok = await copyText(text)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1200) }
  }

  const handleDownloadText = () => {
    const text = lastResultRef.current?.text
    if (text) downloadText(text, 'miascii-frame.txt')
  }

  const handleDownloadPng = () => {
    if (preRef.current) downloadNodeAsPng(preRef.current, 'miascii-frame.png')
  }

  // Recording: start/stop MediaRecorder against the render canvas
  const startRecording = () => {
    const canvas = renderCanvasRef.current
    const r = lastResultRef.current
    if (!canvas || !r) return
    // Paint one frame first so canvas has correct size
    const bg = getComputedStyle(document.body).getPropertyValue('--panel') || '#000'
    const fg = getComputedStyle(document.body).getPropertyValue('--fg') || '#fff'
    paintAsciiToCanvas(canvas, r, {
      fontPx: fontSizeRef.current,
      fg: fg.trim() || '#fff',
      bg: bg.trim() || '#000',
    })

    const picked = pickSupportedMime()
    if (!picked) { alert(t('video.recordNotSupported')); return }
    const stream = canvas.captureStream(fpsRef.current)
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(stream, { mimeType: picked.mime, videoBitsPerSecond: 4_000_000 })
    } catch (e) {
      console.error(e); alert(t('video.recorderFailed')); return
    }
    recChunksRef.current = []
    rec.ondataavailable = (e) => { if (e.data.size) recChunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(recChunksRef.current, { type: picked.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `miascii-recording.${picked.ext}`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
    recorderRef.current = rec
    recordingRef.current = true
    recStartRef.current = performance.now()
    setRecElapsed(0)
    setRecording(true)
    rec.start(250)
  }

  const stopRecording = () => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
    recordingRef.current = false
    recorderRef.current = null
    setRecording(false)
  }

  const hasFrameRef = useRef(false)
  const fontSizeRef = useRef(fontSize)
  useEffect(() => { fontSizeRef.current = fontSize }, [fontSize])

  const statusLine = useMemo(() => {
    const parts: string[] = []
    if (source === 'file') parts.push(fileName || 'video')
    else if (source === 'webcam') parts.push(t('video.webcam.live'))
    else parts.push(t('video.status.noSource'))
    if (playing) parts.push('▶')
    else parts.push('⏸')
    if (source !== 'none') parts.push(`${actualFps}/${fps} fps`)
    return parts.join('  ·  ')
  }, [source, fileName, playing, actualFps, fps, t])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      <aside className="pixel-panel p-4 space-y-5 h-fit">
        <div>
          <Label>{t('video.source.label')}</Label>
          {source === 'none' && (
            <div className="space-y-2">
              <Dropzone
                accept="video/*"
                onFile={onFile}
                label={t('dropzone.dropVideo')}
                hint={t('dropzone.videoHint')}
              />
              <button className="pixel-btn w-full justify-center" onClick={startWebcam}>
                <Camera size={14} /> {t('video.webcam')}
              </button>
            </div>
          )}
          {source !== 'none' && (
            <div className="pixel-panel !shadow-none p-2 flex items-center gap-2">
              {source === 'webcam' ? <Camera size={16} /> : <VideoIcon size={16} />}
              <div className="flex-1 min-w-0 truncate">
                {source === 'webcam' ? t('video.webcam.live') : (fileName || t('dropzone.dropVideo'))}
              </div>
              <button className="pixel-btn !px-2 !py-1" onClick={clearSource} aria-label={t('common.stop')}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            className="pixel-btn flex-1 justify-center"
            onClick={togglePlay}
            disabled={source === 'none'}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? t('video.pause') : t('video.play')}
          </button>
        </div>

        <div>
          <Label>{t('video.targetFps', { fps })}</Label>
          <Slider value={fps} onChange={setFps} min={5} max={60} />
          <div className="text-[var(--dim)] text-sm">
            {t('video.actualFps', { fps: actualFps })}
          </div>
        </div>

        <div>
          <Label>{t('video.resolution', { cols })}</Label>
          <Slider value={cols} onChange={setCols} min={30} max={220} step={2} />
          <div className="text-[var(--dim)] text-sm">{t('video.resolution.hint')}</div>
        </div>

        <div>
          <Label>{t('image.charAspect', { value: charAspect.toFixed(1) })}</Label>
          <Slider
            value={Math.round(charAspect * 10)}
            onChange={(v) => setCharAspect(v / 10)}
            min={10}
            max={30}
          />
        </div>

        <div>
          <Label>{t('image.density.label')}</Label>
          <PixelSelect
            value={densityKey}
            onChange={(v) => setDensityKey(v as DensityKey)}
            options={DENSITY_KEYS}
            searchable={false}
          />
          <div className="mt-2">
            <Label>{t('video.density.custom')}</Label>
            <div className="pixel-panel !shadow-none p-2">
              <input
                value={customDensity}
                onChange={(e) => setCustomDensity(e.target.value)}
                placeholder={DENSITY_PRESETS[densityKey]}
                className="pixel-input text-base"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="divider pt-4" />

        <div>
          <Label>{t('image.dither.label')}</Label>
          <PixelSelect
            value={dither}
            onChange={(v) => setDither(v as DitherMode)}
            options={DITHER_MODES}
            searchable={false}
          />
        </div>

        <div>
          <Label>{t('image.edges.label')}</Label>
          <Toggle value={edges} onChange={setEdges} label={t('image.edges.detect')} />
          {edges && (
            <div className="mt-2">
              <Label>{t('image.edges.threshold', { value: edgeThreshold.toFixed(2) })}</Label>
              <Slider
                value={Math.round(edgeThreshold * 100)}
                onChange={(v) => setEdgeThreshold(v / 100)}
                min={5}
                max={80}
              />
            </div>
          )}
        </div>

        <div className="divider pt-4" />

        <div>
          <Label>{t('image.contrast', { value: contrast.toFixed(2) })}</Label>
          <Slider value={Math.round(contrast * 100)} onChange={(v) => setContrast(v / 100)} min={10} max={250} />
        </div>
        <div>
          <Label>{t('image.brightness', { value: `${brightness >= 0 ? '+' : ''}${brightness.toFixed(2)}` })}</Label>
          <Slider value={Math.round(brightness * 100)} onChange={(v) => setBrightness(v / 100)} min={-50} max={50} />
        </div>
        <div>
          <Label>{t('image.gamma', { value: gamma.toFixed(2) })}</Label>
          <Slider value={Math.round(gamma * 100)} onChange={(v) => setGamma(v / 100)} min={30} max={300} />
        </div>

        <div className="divider pt-4" />

        <div>
          <Label>{t('image.color.label')}</Label>
          <PixelSelect
            value={color}
            onChange={(v) => setColor(v as ColorMode)}
            options={COLOR_MODES}
            searchable={false}
          />
        </div>

        <div className="flex gap-2">
          {source === 'webcam' && (
            <button
              className="pixel-btn flex-1 justify-center"
              data-active={mirror}
              onClick={() => setMirror((v) => !v)}
            >
              <FlipHorizontal size={14} /> {t('video.mirror')}
            </button>
          )}
          <button
            className="pixel-btn flex-1 justify-center"
            data-active={flipV}
            onClick={() => setFlipV((v) => !v)}
          >
            <FlipVertical size={14} /> {t('video.flipV')}
          </button>
        </div>

        <div>
          <Label>{t('image.renderSize', { px: fontSize })}</Label>
          <Slider value={fontSize} onChange={setFontSize} min={6} max={20} />
        </div>

        <div className="space-y-2">
          <Toggle value={invert} onChange={setInvert} label={t('image.invertBrightness')} />
        </div>

        <div className="flex gap-2">
          <button
            className="pixel-btn flex-1 justify-center !text-sm"
            onClick={() => {
              setContrast(1); setBrightness(0); setGamma(1)
              setDither('none'); setEdges(false); setInvert(false)
              setFlipV(false); setCharAspect(2)
            }}
          >
            <Sparkles size={12} /> {t('image.resetFx')}
          </button>
        </div>
      </aside>

      <section className="min-w-0 space-y-2 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:flex lg:flex-col">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-pixel text-[10px] uppercase text-[var(--mid)]">
            {t('video.output.title')} &nbsp;&nbsp; {statusLine}
            {recording && (
              <span className="ml-2 text-red-400">{t('video.recording', { seconds: recElapsed })}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="pixel-btn !py-0.5 !px-2 !text-sm"
              onClick={handleCopy}
              disabled={!hasFrame}
            >
              <Copy size={12} />
              {copied ? t('common.copied') : t('video.copyFrame')}
            </button>
            <button
              className="pixel-btn !py-0.5 !px-2 !text-sm"
              onClick={handleDownloadText}
              disabled={!hasFrame}
            >
              <Download size={12} />
              .txt
            </button>
            <button
              className="pixel-btn !py-0.5 !px-2 !text-sm"
              onClick={handleDownloadPng}
              disabled={!hasFrame}
            >
              <ImageIcon size={12} />
              .png
            </button>
            {!recording ? (
              <button
                className="pixel-btn !py-0.5 !px-2 !text-sm"
                onClick={startRecording}
                disabled={!hasFrame || !playing}
                title={t('video.record')}
              >
                <Film size={12} />
                {t('video.record')}
              </button>
            ) : (
              <button
                className="pixel-btn !py-0.5 !px-2 !text-sm"
                onClick={stopRecording}
                style={{ background: 'var(--fg)', color: 'var(--bg)' }}
                title={t('video.stopSave')}
              >
                <Square size={12} />
                {t('video.stopSave')}
              </button>
            )}
          </div>
        </div>

        {/*
          Live ASCII preview: ref-only <pre>, never given React children,
          to avoid fiber reconciliation conflicts with imperative innerHTML writes.
        */}
        <pre
          ref={preRef}
          className={cn(
            'font-code whitespace-pre overflow-auto leading-[1] p-4 pixel-panel min-h-[60vh] glow',
            'lg:min-h-0 lg:flex-1',
          )}
          style={{ fontSize, color: 'var(--fg)', background: 'var(--panel)' }}
        />
        {!hasFrame && (
          <div className="text-[var(--dim)] text-base">{t('video.placeholder')}</div>
        )}

        {/* Offscreen render canvas: fed into MediaRecorder.captureStream */}
        <canvas ref={renderCanvasRef} className="hidden" />

        {/* Hidden video source */}
        <video
          ref={videoRef}
          className="hidden"
          muted
          playsInline
          loop={source === 'file'}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      </section>
    </div>
  )
}
