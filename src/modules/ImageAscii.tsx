import { useEffect, useMemo, useRef, useState } from 'react'
import { usePersisted } from '../lib/usePersisted'
import { useT } from '../i18n'
import { Copy, Download, Image as ImageIcon, X, FlipHorizontal, FlipVertical, Sparkles } from 'lucide-react'
import AsciiColorOutput from '../components/AsciiColorOutput'
import Dropzone from '../components/Dropzone'
import { Label, Slider, Toggle } from '../components/Control'
import PixelSelect from '../components/PixelSelect'
import {
  DENSITY_PRESETS,
  loadImageFile,
  sourceToAscii,
  type AsciiResult,
  type ColorMode,
  type DensityKey,
  type DitherMode,
} from '../lib/ascii'
import { copyText, downloadNodeAsPng, downloadText } from '../lib/export'

const DENSITY_KEYS = Object.keys(DENSITY_PRESETS) as DensityKey[]
const DITHER_MODES: DitherMode[] = ['none', 'floyd-steinberg', 'ordered']
const COLOR_MODES: ColorMode[] = ['off', 'full', 'duotone']

export default function ImageAscii() {
  const t = useT()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [cols, setCols] = usePersisted<number>('image.cols', 120)
  const [densityKey, setDensityKey] = usePersisted<DensityKey>('image.densityKey', 'standard')
  const [customDensity, setCustomDensity] = usePersisted<string>('image.customDensity', '')
  const [invert, setInvert] = usePersisted<boolean>('image.invert', false)
  const [color, setColor] = usePersisted<ColorMode>('image.color', 'off')
  const [duoA, setDuoA] = usePersisted<string>('image.duoA', '#000000')
  const [duoB, setDuoB] = usePersisted<string>('image.duoB', '#ffffff')
  const [contrast, setContrast] = usePersisted<number>('image.contrast', 1)
  const [brightness, setBrightness] = usePersisted<number>('image.brightness', 0)
  const [gamma, setGamma] = usePersisted<number>('image.gamma', 1)
  const [blur, setBlur] = usePersisted<number>('image.blur', 0)
  const [dither, setDither] = usePersisted<DitherMode>('image.dither', 'none')
  const [edges, setEdges] = usePersisted<boolean>('image.edges', false)
  const [edgeThreshold, setEdgeThreshold] = usePersisted<number>('image.edgeThreshold', 0.25)
  const [flipH, setFlipH] = usePersisted<boolean>('image.flipH', false)
  const [flipV, setFlipV] = usePersisted<boolean>('image.flipV', false)
  const [charAspect, setCharAspect] = usePersisted<number>('image.charAspect', 2)
  const [fontSize, setFontSize] = usePersisted<number>('image.fontSize', 10)
  const [result, setResult] = useState<AsciiResult | null>(null)
  const [copied, setCopied] = useState(false)

  const preRef = useRef<HTMLPreElement>(null)
  const scratchRef = useRef<HTMLCanvasElement | null>(null)
  if (!scratchRef.current) scratchRef.current = document.createElement('canvas')

  const densityChars = customDensity.trim() || DENSITY_PRESETS[densityKey]

  useEffect(() => {
    if (!img) { setResult(null); return }
    const r = sourceToAscii(
      img,
      {
        cols,
        density: densityChars,
        invert,
        color,
        duotoneA: duoA,
        duotoneB: duoB,
        contrast,
        brightness,
        gamma,
        blur,
        dither,
        edges,
        edgeThreshold,
        flipH,
        flipV,
        charAspect,
      },
      scratchRef.current!,
    )
    setResult(r)
  }, [
    img, cols, densityChars, invert, color, duoA, duoB,
    contrast, brightness, gamma, blur, dither, edges, edgeThreshold,
    flipH, flipV, charAspect,
  ])

  const onFile = async (file: File) => {
    try {
      const loaded = await loadImageFile(file)
      setImg(loaded)
      setFileName(file.name)
    } catch (e) {
      console.error(e)
    }
  }

  const clearImg = () => { setImg(null); setFileName(''); setResult(null) }

  const handleCopy = async () => {
    if (!result) return
    const ok = await copyText(result.text)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1200) }
  }

  const stats = useMemo(() => {
    if (!result) return null
    return t('image.stats', { cols: result.cols, rows: result.rows, chars: result.text.length })
  }, [result, t])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      <aside className="pixel-panel p-4 space-y-5 h-fit">
        <div>
          <Label>{t('image.source.label')}</Label>
          {!img ? (
            <Dropzone
              accept="image/*"
              onFile={onFile}
              label={t('dropzone.dropImage')}
              hint={t('dropzone.imageHint')}
            />
          ) : (
            <div className="pixel-panel !shadow-none p-2 flex items-center gap-2">
              <img
                src={img.src}
                alt=""
                className="w-10 h-10 object-cover"
                style={{ border: '1px solid var(--fg)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="truncate text-base">{fileName || t('dropzone.dropImage')}</div>
                <div className="text-[var(--dim)] text-sm">{img.width}×{img.height}px</div>
              </div>
              <button className="pixel-btn !px-2 !py-1" onClick={clearImg} aria-label={t('common.remove')}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        <div>
          <Label>{t('image.resolution', { cols })}</Label>
          <Slider value={cols} onChange={setCols} min={20} max={300} step={2} />
        </div>

        <div>
          <Label>{t('image.charAspect', { value: charAspect.toFixed(1) })}</Label>
          <Slider
            value={Math.round(charAspect * 10)}
            onChange={(v) => setCharAspect(v / 10)}
            min={10}
            max={30}
          />
          <div className="text-[var(--dim)] text-sm">{t('image.charAspect.hint')}</div>
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
            <Label>{t('image.density.customLabel')}</Label>
            <div className="pixel-panel !shadow-none p-2">
              <input
                value={customDensity}
                onChange={(e) => setCustomDensity(e.target.value)}
                placeholder={DENSITY_PRESETS[densityKey]}
                className="pixel-input text-base"
                spellCheck={false}
              />
            </div>
            <div className="text-[var(--dim)] text-sm mt-1 truncate">
              {t('image.density.using', { chars: densityChars })}
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
        <div>
          <Label>{t('image.blur', { value: blur.toFixed(1) })}</Label>
          <Slider value={Math.round(blur * 10)} onChange={(v) => setBlur(v / 10)} min={0} max={30} />
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
          {color === 'duotone' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ColorField label={t('image.color.shadow')} value={duoA} onChange={setDuoA} pickLabel={t('image.color.pick')} />
              <ColorField label={t('image.color.highlight')} value={duoB} onChange={setDuoB} pickLabel={t('image.color.pick')} />
            </div>
          )}
        </div>

        <div>
          <Label>{t('image.transform.label')}</Label>
          <div className="flex gap-2">
            <button
              className="pixel-btn flex-1 justify-center"
              data-active={flipH}
              onClick={() => setFlipH((v) => !v)}
            >
              <FlipHorizontal size={14} /> {t('image.transform.flipH')}
            </button>
            <button
              className="pixel-btn flex-1 justify-center"
              data-active={flipV}
              onClick={() => setFlipV((v) => !v)}
            >
              <FlipVertical size={14} /> {t('image.transform.flipV')}
            </button>
          </div>
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
              setContrast(1); setBrightness(0); setGamma(1); setBlur(0)
              setDither('none'); setEdges(false); setInvert(false)
              setFlipH(false); setFlipV(false); setCharAspect(2)
            }}
          >
            <Sparkles size={12} /> {t('image.resetFx')}
          </button>
        </div>

        <div className="divider pt-4 space-y-2">
          <Label>{t('image.export.label')}</Label>
          <button className="pixel-btn w-full justify-start" onClick={handleCopy} disabled={!result}>
            <Copy size={14} />
            {copied ? t('common.copied') : t('common.copyToClipboard')}
          </button>
          <button
            className="pixel-btn w-full justify-start"
            onClick={() => result && downloadText(result.text, 'miascii-image.txt')}
            disabled={!result}
          >
            <Download size={14} />
            {t('image.download.txt')}
          </button>
          <button
            className="pixel-btn w-full justify-start"
            onClick={() => preRef.current && downloadNodeAsPng(preRef.current, 'miascii-image.png')}
            disabled={!result}
          >
            <ImageIcon size={14} />
            {t('image.download.png')}
          </button>
        </div>

        {stats && <div className="text-[var(--dim)] text-sm">{stats}</div>}
      </aside>

      <section className="min-w-0 space-y-2 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:flex lg:flex-col">
        <div className="flex items-center justify-between">
          <div className="font-pixel text-[10px] uppercase text-[var(--mid)]">
            {t('image.output.title')}
          </div>
          {color !== 'off' && (
            <div className="text-[var(--dim)] text-sm">
              {t('image.output.colorWarning')}
            </div>
          )}
        </div>
        <AsciiColorOutput
          ref={preRef}
          text={result?.text ?? ''}
          colors={result?.colors ?? null}
          cols={result?.cols ?? 0}
          rows={result?.rows ?? 0}
          fontSize={fontSize}
          className="min-h-[60vh] lg:min-h-0 lg:flex-1"
        />
      </section>
    </div>
  )
}

function ColorField({
  label, value, onChange, pickLabel = 'pick',
}: { label: string; value: string; onChange: (v: string) => void; pickLabel?: string }) {
  return (
    <div>
      <div className="text-[var(--dim)] text-sm uppercase mb-1">{label}</div>
      <div
        className="pixel-panel !shadow-none flex items-center gap-2 px-2 py-1.5"
        style={{ background: 'var(--panel)' }}
      >
        <div
          className="w-5 h-5"
          style={{ background: value, border: '2px solid var(--fg)' }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-0 h-0 opacity-0 absolute pointer-events-none"
          tabIndex={-1}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none font-mono text-base"
          spellCheck={false}
        />
        <label className="pixel-btn !py-0.5 !px-2 !text-xs cursor-pointer">
          {pickLabel}
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
}
