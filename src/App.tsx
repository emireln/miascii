import Shell, { type Mode } from './components/Shell'
import TextAscii from './modules/TextAscii'
import ImageAscii from './modules/ImageAscii'
import VideoAscii from './modules/VideoAscii'
import { usePersisted } from './lib/usePersisted'

export default function App() {
  const [mode, setMode] = usePersisted<Mode>('app.mode', 'text')

  return (
    <Shell mode={mode} onMode={setMode}>
      {mode === 'text' && <TextAscii />}
      {mode === 'image' && <ImageAscii />}
      {mode === 'video' && <VideoAscii />}
    </Shell>
  )
}
