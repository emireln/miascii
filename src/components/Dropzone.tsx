import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '../lib/cn'
import { useT } from '../i18n'

type Props = {
  accept: string
  onFile: (file: File) => void
  label?: string
  hint?: string
}

export default function Dropzone({ accept, onFile, label, hint }: Props) {
  const t = useT()
  const effectiveLabel = label ?? t('dropzone.dropImage')
  const effectiveHint = hint ?? t('common.browse')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFile = (f: File | null | undefined) => {
    if (f) onFile(f)
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        pickFile(e.dataTransfer.files?.[0])
      }}
      className={cn(
        'dropzone block pixel-panel p-5 text-center cursor-pointer select-none',
      )}
      data-drag={drag}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0])}
      />
      <div className="flex flex-col items-center gap-1">
        <Upload size={18} />
        <div className="font-semibold">{effectiveLabel}</div>
        <div className="text-[var(--dim)] text-sm">{effectiveHint}</div>
      </div>
    </label>
  )
}
