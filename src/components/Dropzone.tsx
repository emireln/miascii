import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useT } from '../i18n'

type Props = {
  accept: string
  onFile: (file: File) => void
  label?: string
  hint?: string
}

/** Click-or-drop file target. A real button, so keyboard and screen readers work. */
export default function Dropzone({ accept, onFile, label, hint }: Props) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const pick = (file: File | null | undefined) => {
    if (file) onFile(file)
  }

  return (
    <button
      type="button"
      className="dropzone pixel-panel"
      data-drag={drag}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => { e.preventDefault(); setDrag(true) }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDrag(false) }}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        pick(e.dataTransfer.files?.[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = '' // let the same file be picked again
        }}
      />
      <Upload size={20} aria-hidden="true" />
      <span className="dropzone-title">{label ?? t('dropzone.dropImage')}</span>
      <span className="dropzone-hint">{hint ?? t('common.browse')}</span>
    </button>
  )
}
