import { useEffect, useMemo, useRef, useState } from 'react'
import { usePersisted } from '../lib/usePersisted'
import { useT } from '../i18n'
import { Download, FlipHorizontal, FlipVertical, Image as ImageIcon, Sparkles, X } from 'lucide-react'
import AsciiColorOutput from '../components/AsciiColorOutput'
import Dropzone from '../components/Dropzone'
import { ColorField, Label, Section, Slider, Toggle } from '../components/Control'
import { CopyButton, OutputBar } from '../components/OutputBar'
import Notice from '../components/Notice'
import PixelSelect from '../components/PixelSelect'
import ToolLayout from '../components/ToolLayout'
import {
  DENSITY_PRESETS,
  loadImageFile,
  resolveRamp,
  sourceToAscii,
  type AsciiResult,
  type ColorMode,
  type DensityKey,
  type DitherMode,
} from '../lib/ascii'
import { downloadAsciiPng, downloadText } from '../lib/export'

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
  const [error, setError] = useState<string | null>(null)

  const preRef = useRef<HTMLPreElement>(null)
  const srcRef = useRef<string | null>(null) // object URL of the loaded image
  const scratchRef = useRef<HTMLCanvasElement | null>(null)
  if (!scratchRef.current) scratchRef.current = document.createElement('canvas')

  const densityChars = resolveRamp(customDensity, densityKey)

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

  // Release the object URL when leaving image mode.
  useEffect(() => () => { if (srcRef.current) URL.revokeObjectURL(srcRef.current) }, [])

  const onFile = async (file: File) => {
    try {
      const loaded = await loadImageFile(file)
      if (srcRef.current) URL.revokeObjectURL(srcRef.current)
      srcRef.current = loaded.src
      setImg(loaded)
      setFileName(file.name)
      setError(null)
    } catch {
      setError(t('image.error.unreadable'))
    }
  }

  const clearImg = () => {
    if (srcRef.current) URL.revokeObjectURL(srcRef.current)
    srcRef.current = null
    setImg(null)
    setFileName('')
    setResult(null)
    setError(null)
  }

  const resetFx = () => {
    setContrast(1); setBrightness(0); setGamma(1); setBlur(0)
    setDither('none'); setEdges(false); setInvert(false)
    setFlipH(false); setFlipV(false); setCharAspect(2)
  }

  const stats = useMemo(() => {
    if (!result) return null
    return t('image.stats', { cols: result.cols, rows: result.rows, chars: result.text.length })
  }, [result, t])

  const ditherLabel = (v: string) => ({
    none: t('image.dither.none'),
    'floyd-steinberg': t('image.dither.floyd'),
    ordered: t('image.dither.ordered'),
  }[v] ?? v)

  const colorLabel = (v: string) => ({
    off: t('image.color.off'),
    full: t('image.color.full'),
    duotone: t('image.color.duotone'),
  }[v] ?? v)

  const controls = (
    <>
      <Section title={t('section.source')}>
        {!img ? (
          <Dropzone
            accept="image/*"
            onFile={onFile}
            label={t('dropzone.dropImage')}
            hint={t('dropzone.imageHint')}
          />
        ) : (
          <div className="source-card pixel-panel">
            <img src={img.src} alt={fileName} className="source-thumb" />
            <div className="source-meta">
              <div className="source-name">{fileName || t('dropzone.dropImage')}</div>
              <p className="field-hint">{img.width}×{img.height}px</p>
            </div>
            <button type="button" className="pixel-btn pixel-btn--sm" onClick={clearImg} aria-label={t('common.remove')}>
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        )}
        {error && <Notice>! {error}</Notice>}
      </Section>

      <Section title={t('section.grid')}>
        <div>
          <Label>{t('image.resolution', { cols })}</Label>
          <Slider value={cols} onChange={setCols} min={20} max={300} step={2} label={t('image.resolution', { cols })} />
        </div>
        <div>
          <Label>{t('image.charAspect', { value: charAspect.toFixed(1) })}</Label>
          <Slider
            value={Math.round(charAspect * 10)}
            onChange={(v) => setCharAspect(v / 10)}
            min={10}
            max={30}
            label={t('image.charAspect', { value: charAspect.toFixed(1) })}
          />
          <p className="field-hint">{t('image.charAspect.hint')}</p>
        </div>
        <div>
          <Label>{t('image.density.label')}</Label>
          <PixelSelect
            label={t('image.density.label')}
            value={densityKey}
            onChange={(v) => setDensityKey(v as DensityKey)}
            options={DENSITY_KEYS}
            searchable={false}
          />
        </div>
        <div>
          <Label>{t('image.density.customLabel')}</Label>
          <div className="field-inset">
            <input
              value={customDensity}
              onChange={(e) => setCustomDensity(e.target.value)}
              placeholder={DENSITY_PRESETS[densityKey]}
              aria-label={t('image.density.customLabel')}
              className="pixel-input"
              spellCheck={false}
            />
          </div>
          <p className="field-hint">{t('image.density.using', { chars: densityChars })}</p>
        </div>
      </Section>

      <Section title={t('section.tone')}>
        <div>
          <Label>{t('image.dither.label')}</Label>
          <PixelSelect
            label={t('image.dither.label')}
            value={dither}
            onChange={(v) => setDither(v as DitherMode)}
            options={DITHER_MODES}
            searchable={false}
            labelOf={ditherLabel}
          />
        </div>
        <div>
          <Label>{t('image.edges.label')}</Label>
          <Toggle value={edges} onChange={setEdges} label={t('image.edges.detect')} />
          {edges && (
            <div className="field-sub">
              <Label>{t('image.edges.threshold', { value: edgeThreshold.toFixed(2) })}</Label>
              <Slider
                value={Math.round(edgeThreshold * 100)}
                onChange={(v) => setEdgeThreshold(v / 100)}
                min={5}
                max={80}
                label={t('image.edges.threshold', { value: edgeThreshold.toFixed(2) })}
              />
            </div>
          )}
        </div>
        <div>
          <Label>{t('image.contrast', { value: contrast.toFixed(2) })}</Label>
          <Slider
            value={Math.round(contrast * 100)}
            onChange={(v) => setContrast(v / 100)}
            min={10}
            max={250}
            label={t('image.contrast', { value: contrast.toFixed(2) })}
          />
        </div>
        <div>
          <Label>{t('image.brightness', { value: `${brightness >= 0 ? '+' : ''}${brightness.toFixed(2)}` })}</Label>
          <Slider
            value={Math.round(brightness * 100)}
            onChange={(v) => setBrightness(v / 100)}
            min={-50}
            max={50}
            label={t('image.brightness', { value: `${brightness >= 0 ? '+' : ''}${brightness.toFixed(2)}` })}
          />
        </div>
        <div>
          <Label>{t('image.gamma', { value: gamma.toFixed(2) })}</Label>
          <Slider
            value={Math.round(gamma * 100)}
            onChange={(v) => setGamma(v / 100)}
            min={30}
            max={300}
            label={t('image.gamma', { value: gamma.toFixed(2) })}
          />
        </div>
        <div>
          <Label>{t('image.blur', { value: blur.toFixed(1) })}</Label>
          <Slider
            value={Math.round(blur * 10)}
            onChange={(v) => setBlur(v / 10)}
            min={0}
            max={30}
            label={t('image.blur', { value: blur.toFixed(1) })}
          />
        </div>
      </Section>

      <Section title={t('section.color')}>
        <div>
          <Label>{t('image.color.label')}</Label>
          <PixelSelect
            label={t('image.color.label')}
            value={color}
            onChange={(v) => setColor(v as ColorMode)}
            options={COLOR_MODES}
            searchable={false}
            labelOf={colorLabel}
          />
        </div>
        {color === 'duotone' && (
          <div className="duo-grid">
            <ColorField label={t('image.color.shadow')} value={duoA} onChange={setDuoA} pickLabel={t('image.color.pick')} />
            <ColorField label={t('image.color.highlight')} value={duoB} onChange={setDuoB} pickLabel={t('image.color.pick')} />
          </div>
        )}
      </Section>

      <Section title={t('image.transform.label')}>
        <div className="btn-row">
          <button type="button" className="pixel-btn" aria-pressed={flipH} data-active={flipH} onClick={() => setFlipH((v) => !v)}>
            <FlipHorizontal size={14} aria-hidden="true" />
            {t('image.transform.flipH')}
          </button>
          <button type="button" className="pixel-btn" aria-pressed={flipV} data-active={flipV} onClick={() => setFlipV((v) => !v)}>
            <FlipVertical size={14} aria-hidden="true" />
            {t('image.transform.flipV')}
          </button>
        </div>
      </Section>

      <Section title={t('section.view')}>
        <div>
          <Label>{t('image.renderSize', { px: fontSize })}</Label>
          <Slider value={fontSize} onChange={setFontSize} min={6} max={20} label={t('image.renderSize', { px: fontSize })} />
        </div>
        <Toggle value={invert} onChange={setInvert} label={t('image.invertBrightness')} />
        <button type="button" className="pixel-btn" onClick={resetFx}>
          <Sparkles size={14} aria-hidden="true" />
          {t('image.resetFx')}
        </button>
      </Section>

      {stats && <div className="ctl-footer">{stats}</div>}
    </>
  )

  const outputPane = (
    <>
      <OutputBar
        title={t('image.output.title')}
        status={color !== 'off' ? t('image.output.colorWarning') : undefined}
      >
        <CopyButton getText={() => result?.text ?? ''} disabled={!result} />
        <button
          type="button"
          className="pixel-btn pixel-btn--sm"
          onClick={() => result && downloadText(result.text, 'miascii-image.txt')}
          disabled={!result}
        >
          <Download size={14} aria-hidden="true" />
          .txt
        </button>
        <button
          type="button"
          className="pixel-btn pixel-btn--sm"
          onClick={() => result && preRef.current && downloadAsciiPng(result, preRef.current, 'miascii-image.png')}
          disabled={!result}
        >
          <ImageIcon size={14} aria-hidden="true" />
          .png
        </button>
      </OutputBar>
      <AsciiColorOutput
        ref={preRef}
        text={result?.text ?? ''}
        colors={result?.colors ?? null}
        cols={result?.cols ?? 0}
        rows={result?.rows ?? 0}
        fontSize={fontSize}
        empty={t('preview.empty.image')}
      />
    </>
  )

  return <ToolLayout output={outputPane} controls={controls} />
}
