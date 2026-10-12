import { useEffect, useMemo, useRef, useState } from 'react'
import { usePersisted } from '../lib/usePersisted'
import { useT } from '../i18n'
import { Dice5, Download, Eraser, Image as ImageIcon } from 'lucide-react'
import AsciiOutput from '../components/AsciiOutput'
import { Label, Section, Slider, Toggle } from '../components/Control'
import { CopyButton, OutputBar } from '../components/OutputBar'
import Notice from '../components/Notice'
import PixelSelect from '../components/PixelSelect'
import ToolLayout from '../components/ToolLayout'
import {
  FIGLET_FONTS,
  KERNING_METHODS,
  renderFiglet,
  type KerningMethod,
} from '../lib/figlet'
import { downloadAsciiPng, downloadText } from '../lib/export'

const EXAMPLES = ['miascii', 'hello world', 'ascii > pixels', '2026', 'terminal']
const DEFAULT_FONT = 'Standard'

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
  const [font, setFont] = usePersisted<string>('text.font', DEFAULT_FONT)
  // A saved font can disappear from the catalog after an upgrade; fall back
  // instead of showing "Font not found" forever.
  const activeFont = FIGLET_FONTS.includes(font) ? font : DEFAULT_FONT
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
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    let cancelled = false
    const source = applyCase(text, caseMode)
    if (!source.trim()) {
      setOutput('')
      setError(null)
      return
    }
    renderFiglet(source, activeFont, {
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
  }, [text, activeFont, hLayout, maxWidth, whitespaceBreak, caseMode, border, trim])

  const { lines, cols } = useMemo(() => {
    const lns = output ? output.split('\n') : []
    return {
      lines: lns.length,
      cols: lns.reduce((m, l) => Math.max(m, l.length), 0),
    }
  }, [output])

  const randomFont = () => {
    const i = Math.floor(Math.random() * FIGLET_FONTS.length)
    setFont(FIGLET_FONTS[i])
  }

  const top = (
    <section className="input-band pixel-panel" aria-label={t('text.input.label')}>
      <div className="input-band-head">
        <label htmlFor="text-input" className="pixel-label">{t('text.input.label')}</label>
        <span className="input-band-hint">{t('text.input.hint')}</span>
      </div>
      <textarea
        id="text-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="pixel-input input-textarea"
        placeholder={t('text.input.placeholder')}
        spellCheck={false}
        autoFocus={window.matchMedia('(pointer: fine)').matches}
      />
      <div className="chip-row">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" className="pixel-btn pixel-btn--sm" onClick={() => setText(e)}>
            {e}
          </button>
        ))}
        <button type="button" className="pixel-btn pixel-btn--sm" onClick={() => setText('')}>
          <Eraser size={12} aria-hidden="true" />
          {t('common.clear')}
        </button>
      </div>
    </section>
  )

  const controls = (
    <>
      <Section title={t('section.font')}>
        <div className="font-row">
          <div className="font-picker">
            <Label>{t('text.font.label')}</Label>
            <PixelSelect label={t('text.font.label')} value={activeFont} onChange={setFont} options={FIGLET_FONTS} />
          </div>
          <button
            type="button"
            className="pixel-btn font-random"
            onClick={randomFont}
            title={t('text.font.random')}
            aria-label={t('text.font.random')}
          >
            <Dice5 size={14} aria-hidden="true" />
          </button>
        </div>
      </Section>

      <Section title={t('section.layout')}>
        <div>
          <Label>{t('text.case.label')}</Label>
          <PixelSelect
            label={t('text.case.label')}
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
            label={t('text.hLayout.label')}
            value={hLayout}
            onChange={(v) => setHLayout(v as KerningMethod)}
            options={KERNING_METHODS}
            searchable={false}
          />
        </div>
        <div>
          <Label>{t('text.maxWidth', { cols: maxWidth })}</Label>
          <Slider value={maxWidth} onChange={setMaxWidth} min={40} max={300} step={10} label={t('text.maxWidth', { cols: maxWidth })} />
        </div>
        <Toggle value={whitespaceBreak} onChange={setWhitespaceBreak} label={t('text.wrapAtSpaces')} />
        <Toggle value={trim} onChange={setTrim} label={t('text.trimWhitespace')} />
      </Section>

      <Section title={t('text.border.label')}>
        <PixelSelect
          label={t('text.border.label')}
          value={border}
          onChange={(v) => setBorder(v as BorderStyle)}
          options={BORDER_STYLES}
          searchable={false}
          labelOf={borderLabel}
        />
      </Section>

      <Section title={t('section.view')}>
        <div>
          <Label>{t('text.renderSize', { px: fontSize })}</Label>
          <Slider value={fontSize} onChange={setFontSize} min={6} max={28} label={t('text.renderSize', { px: fontSize })} />
        </div>
        <Toggle value={invert} onChange={setInvert} label={t('text.invertColors')} />
      </Section>

      <div className="ctl-footer">
        <div>{t('text.statsFont', { font: activeFont })}</div>
        <div>{t('text.statsSize', { cols, lines, chars: output.length })}</div>
      </div>
    </>
  )

  const outputPane = (
    <>
      <OutputBar title={t('text.output.title')}>
        <CopyButton getText={() => output} disabled={!output} />
        <button
          type="button"
          className="pixel-btn pixel-btn--sm"
          onClick={() => downloadText(output, 'miascii-text.txt')}
          disabled={!output}
        >
          <Download size={14} aria-hidden="true" />
          .txt
        </button>
        <button
          type="button"
          className="pixel-btn pixel-btn--sm"
          onClick={() => preRef.current && downloadAsciiPng({ text: output, cols, rows: lines, colors: null }, preRef.current, 'miascii-text.png')}
          disabled={!output}
        >
          <ImageIcon size={14} aria-hidden="true" />
          .png
        </button>
      </OutputBar>
      {error && <Notice>! {error}</Notice>}
      <AsciiOutput
        ref={preRef}
        text={output}
        empty={t('preview.empty.text')}
        fontSize={fontSize}
        inverted={invert}
      />
    </>
  )

  return <ToolLayout top={top} output={outputPane} controls={controls} />
}
