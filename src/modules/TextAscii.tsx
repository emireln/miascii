import { useEffect, useMemo, useRef, useState } from 'react'
import { usePersisted } from '../lib/usePersisted'
import { useT } from '../i18n'
import { Copy, Download, Image as ImageIcon, Eraser, Dice5 } from 'lucide-react'
import AsciiOutput from '../components/AsciiOutput'
import { Label, Slider, Toggle } from '../components/Control'
import PixelSelect from '../components/PixelSelect'
import {
  FIGLET_FONTS,
  KERNING_METHODS,
  renderFiglet,
  type KerningMethod,
} from '../lib/figlet'
import { copyText, downloadNodeAsPng, downloadText } from '../lib/export'

const EXAMPLES = ['miascii', 'hello world', 'ascii > pixels', '2026', 'terminal']

const BORDER_STYLES = ['none', 'single', 'double', 'heavy', 'dashed', 'blocks'] as const
type BorderStyle = (typeof BORDER_STYLES)[number]

const CASE_MODES = ['as typed', 'UPPER', 'lower'] as const
type CaseMode = (typeof CASE_MODES)[number]

function applyCase(text: string, mode: CaseMode): string {
  if (mode === 'UPPER') return text.toUpperCase()
  if (mode === 'lower') return text.toLowerCase()
  return text
}

function trimTrailing(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
}

function wrapBorder(text: string, style: BorderStyle, pad = 1): string {
  if (style === 'none' || !text) return text
  const glyphs: Record<Exclude<BorderStyle, 'none'>, { tl: string; tr: string; bl: string; br: string; h: string; v: string }> = {
    single:  { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
    double:  { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    heavy:   { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
    dashed:  { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: ':' },
    blocks:  { tl: '█', tr: '█', bl: '█', br: '█', h: '█', v: '█' },
  }
  const g = glyphs[style as Exclude<BorderStyle, 'none'>]
  const lines = text.split('\n')
  const width = Math.max(...lines.map((l) => l.length))
  const padded = lines.map((l) => ' '.repeat(pad) + l.padEnd(width, ' ') + ' '.repeat(pad))
  const inner = width + pad * 2
  const top = g.tl + g.h.repeat(inner) + g.tr
  const bot = g.bl + g.h.repeat(inner) + g.br
  const body = padded.map((l) => g.v + l + g.v)
  const padLines = Array.from({ length: pad }, () => g.v + ' '.repeat(inner) + g.v)
  return [top, ...padLines, ...body, ...padLines, bot].join('\n')
}

export default function TextAscii() {
  const t = useT()

  const caseLabel = (v: string) => ({
    'as typed': t('text.case.asTyped'),
    'UPPER': t('text.case.upper'),
    'lower': t('text.case.lower'),
  }[v] ?? v)
  const borderLabel = (v: string) => {
    const map: Record<string, string> = {
      none: t('text.border.none'),
      single: t('text.border.single'),
      double: t('text.border.double'),
      heavy: t('text.border.heavy'),
      dashed: t('text.border.dashed'),
      blocks: t('text.border.blocks'),
    }
    return map[v] ?? v
  }
  const [text, setText] = usePersisted<string>('text.input', 'miascii')
  const [font, setFont] = usePersisted<string>('text.font', 'Standard')
  const [fontSize, setFontSize] = usePersisted<number>('text.fontSize', 14)
  const [hLayout, setHLayout] = usePersisted<KerningMethod>('text.hLayout', 'default')
  const [maxWidth, setMaxWidth] = usePersisted<number>('text.maxWidth', 120)
  const [whitespaceBreak, setWhitespaceBreak] = usePersisted<boolean>('text.whitespaceBreak', true)
  const [caseMode, setCaseMode] = usePersisted<CaseMode>('text.caseMode', 'as typed')
  const [border, setBorder] = usePersisted<BorderStyle>('text.border', 'none')
  const [trim, setTrim] = usePersisted<boolean>('text.trim', true)
  const [invert, setInvert] = usePersisted<boolean>('text.invert', false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    let cancelled = false
    const source = applyCase(text, caseMode)
    if (!source.trim()) {
      setOutput('')
      setError(null)
      return
    }
    renderFiglet(source, font, {
      horizontalLayout: hLayout,
      width: maxWidth,
      whitespaceBreak,
    })
      .then((r) => {
        if (cancelled) return
        let out = r
        if (trim) out = trimTrailing(out)
        if (border !== 'none') out = wrapBorder(out, border, 1)
        setOutput(out)
        setError(null)
      })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)) })
    return () => { cancelled = true }
  }, [text, font, hLayout, maxWidth, whitespaceBreak, caseMode, border, trim])

  const { chars, lines, cols } = useMemo(() => {
    const lns = output ? output.split('\n') : []
    return {
      chars: output.length,
      lines: lns.length,
      cols: lns.reduce((m, l) => Math.max(m, l.length), 0),
    }
  }, [output])

  const handleCopy = async () => {
    const ok = await copyText(output)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }

  const randomFont = () => {
    const i = Math.floor(Math.random() * FIGLET_FONTS.length)
    setFont(FIGLET_FONTS[i])
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      {/* Controls */}
      <aside className="pixel-panel p-4 space-y-5 h-fit">
        <div>
          <Label>{t('text.input.label')}</Label>
          <div className="pixel-panel !shadow-none p-2">
            <div className="text-[var(--dim)] text-sm mb-1">{t('text.input.hint')}</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="pixel-input resize-none w-full"
              placeholder={t('text.input.placeholder')}
              spellCheck={false}
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {EXAMPLES.map((e) => (
              <button key={e} className="pixel-btn !py-0.5 !px-2 !text-sm" onClick={() => setText(e)}>
                {e}
              </button>
            ))}
            <button className="pixel-btn !py-0.5 !px-2 !text-sm" onClick={() => setText('')}>
              <Eraser size={12} />
              {t('common.clear')}
            </button>
          </div>
        </div>

        <div>
          <Label>{t('text.font.label')}</Label>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <PixelSelect value={font} onChange={setFont} options={FIGLET_FONTS} />
            </div>
            <button
              className="pixel-btn !px-2"
              onClick={randomFont}
              title={t('text.font.random')}
              aria-label={t('text.font.random')}
            >
              <Dice5 size={14} />
            </button>
          </div>
        </div>

        <div>
          <Label>{t('text.case.label')}</Label>
          <PixelSelect
            value={caseMode}
            onChange={(v) => setCaseMode(v as CaseMode)}
            options={CASE_MODES}
            searchable={false}
            labelOf={caseLabel}
          />
        </div>

        <div>
          <Label>{t('text.hLayout.label')}</Label>
          <PixelSelect
            value={hLayout}
            onChange={(v) => setHLayout(v as KerningMethod)}
            options={KERNING_METHODS}
            searchable={false}
          />
        </div>

        <div>
          <Label>{t('text.border.label')}</Label>
          <PixelSelect
            value={border}
            onChange={(v) => setBorder(v as BorderStyle)}
            options={BORDER_STYLES}
            searchable={false}
            labelOf={borderLabel}
          />
        </div>

        <div>
          <Label>{t('text.maxWidth', { cols: maxWidth })}</Label>
          <Slider value={maxWidth} onChange={setMaxWidth} min={40} max={300} step={10} />
        </div>

        <div>
          <Label>{t('text.renderSize', { px: fontSize })}</Label>
          <Slider value={fontSize} onChange={setFontSize} min={6} max={28} />
        </div>

        <div className="space-y-2">
          <Toggle value={whitespaceBreak} onChange={setWhitespaceBreak} label={t('text.wrapAtSpaces')} />
          <Toggle value={trim} onChange={setTrim} label={t('text.trimWhitespace')} />
          <Toggle value={invert} onChange={setInvert} label={t('text.invertColors')} />
        </div>

        <div className="divider pt-4 text-[var(--dim)] text-sm space-y-0.5">
          <div>{t('text.statsFont', { font })}</div>
          <div>{t('text.statsSize', { cols, lines, chars })}</div>
        </div>
      </aside>

      {/* Output — sticks in place while sidebar scrolls */}
      <section className="min-w-0 space-y-2 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:flex lg:flex-col">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-pixel text-[10px] uppercase text-[var(--mid)]">
            {t('text.output.title')}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="pixel-btn !py-0.5 !px-2 !text-sm"
              onClick={handleCopy}
              disabled={!output}
            >
              <Copy size={12} />
              {copied ? t('common.copied') : t('common.copy')}
            </button>
            <button
              className="pixel-btn !py-0.5 !px-2 !text-sm"
              onClick={() => downloadText(output, 'miascii-text.txt')}
              disabled={!output}
            >
              <Download size={12} />
              .txt
            </button>
            <button
              className="pixel-btn !py-0.5 !px-2 !text-sm"
              onClick={() => preRef.current && downloadNodeAsPng(preRef.current, 'miascii-text.png')}
              disabled={!output}
            >
              <ImageIcon size={12} />
              .png
            </button>
          </div>
        </div>
        <div
          className="lg:flex-1 lg:min-h-0 lg:flex"
          style={invert ? { filter: 'invert(1)' } : undefined}
        >
          <AsciiOutput
            ref={preRef}
            text={output}
            fontSize={fontSize}
            className="min-h-[60vh] lg:min-h-0 lg:flex-1 lg:w-full"
          />
        </div>
        {error && <div className="text-sm text-red-400">! {error}</div>}
      </section>
    </div>
  )
}
