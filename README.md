<div align="center">

```
 ███▄ ▄███▓ ██▓ ▄▄▄        ██████  ▄████▄   ██▓ ██▓
▓██▒▀█▀ ██▒▓██▒▒████▄    ▒██    ▒ ▒██▀ ▀█  ▓██▒▓██▒
▓██    ▓██░▒██▒▒██  ▀█▄  ░ ▓██▄   ▒▓█    ▄ ▒██▒▒██▒
▒██    ▒██ ░██░░██▄▄▄▄██   ▒   ██▒▒▓▓▄ ▄██▒░██░░██░
▒██▒   ░██▒░██░ ▓█   ▓██▒▒██████▒▒▒ ▓███▀ ░░██░░██░
░ ▒░   ░  ░░▓   ▒▒   ▓▒█░▒ ▒▓▒ ▒ ░░ ░▒ ▒  ░░▓  ░▓
░  ░      ░ ▒ ░  ▒   ▒▒ ░░ ░▒  ░ ░  ░  ▒    ▒ ░ ▒ ░
░      ░    ▒ ░  ░   ▒   ░  ░  ░  ░         ▒ ░ ▒ ░
       ░    ░        ░  ░      ░  ░ ░       ░   ░
```

### **text · image · video → ascii art**

**100% client-side** · no uploads · no tracking · no backend

[![license](https://img.shields.io/badge/license-MIT-111?style=for-the-badge&labelColor=000)](./LICENSE)
[![electron](https://img.shields.io/badge/electron-29-111?style=for-the-badge&labelColor=000&logo=electron&logoColor=fff)](https://www.electronjs.org/)
[![react](https://img.shields.io/badge/react-18-111?style=for-the-badge&labelColor=000&logo=react&logoColor=fff)](https://react.dev/)
[![vite](https://img.shields.io/badge/vite-5-111?style=for-the-badge&labelColor=000&logo=vite&logoColor=fff)](https://vitejs.dev/)
[![typescript](https://img.shields.io/badge/typescript-5-111?style=for-the-badge&labelColor=000&logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)

<sub>A retro CRT-terminal app that turns anything into ASCII.  Runs in a browser, on your desktop, or without internet.</sub>

</div>

---

## `> whoami`

**miascii** (pronounced _my-ascii_) is a chunky-pixel, retro-terminal studio that converts:

```
 ┌─────────┐       ┌───────────────┐       ┌──────────┐
 │  text   │       │               │       │  .txt    │
 │ images  │  ───▶ │    miascii    │  ───▶ │  .png    │
 │ videos  │       │               │       │  .mp4    │
 │ webcam  │       └───────────────┘       │  .webm   │
 └─────────┘                                └──────────┘
```

…into ASCII art. Everything happens **in the browser**. No servers, no uploads, no accounts.

---

## `> features`

### ◼ text → ascii
- **300+ FIGlet fonts** auto-loaded from the installed catalog (same as TAAG)
- Live preview as you type, horizontal layout modes, max-width wrapping
- Borders (single · double · heavy · dashed · blocks) · case folding · trim
- Random font shuffle · export `.txt` / `.png`

### ◼ image → ascii
- Drop any `png` · `jpg` · `webp` · `gif`
- **Resolution** up to 300 columns · **character aspect** tuning for your font
- **Density ramps** (standard, blocks, bw, discord, `@░▓▒░`, custom)
- **Dithering** (floyd–steinberg · ordered) · **Sobel edge detection**
- **Color modes**: monochrome · full color · **duotone** (pick shadow + highlight)
- Contrast · brightness · gamma · blur · flip H/V
- Export `.txt` · `.png`

### ◼ video & webcam → ascii
- Drop any `mp4` · `webm` · `mov`, **or** use your **webcam** live
- Real-time rendering at up to **60 fps** (target FPS slider with actual-fps readout)
- All the image-mode controls, plus mirror / flip-v
- **Record** the output to `.mp4` or `.webm` via `MediaRecorder` + canvas capture stream
- Copy any paused frame as text / png

### ◼ 12 languages + RTL
English · Español · Português (BR) · Français · Deutsch · Italiano · Nederlands · Русский · 日本語 · 한국어 · 中文 · العربية (RTL)

### ◼ desktop app
Native-feeling installers for **Windows · macOS · Linux** via Electron + electron-builder
- Custom branded installer graphics + multi-resolution icons (16 → 1024)
- **System tray** with context menu
- **Close-to-tray** behaviour (toggleable)
- **Settings panel** with: always-on-top, launch at startup, CRT intensity, UI scale, reduce-motion, export/import/reset
- Single-instance lock · no auto-updater snooping · fully offline

---

## `> install`

### Web
```bash
git clone https://github.com/emireln/miascii.git
cd miascii
npm install
npm run dev            # http://localhost:5173
```

### Desktop (dev)
```bash
npm run electron:dev   # opens a native window, hot-reload
```

### Desktop (build your own installer)
```bash
npm run electron:build:win     # → release/miascii-x.y.z-setup-x64.exe
npm run electron:build:linux   # → release/*.AppImage + *.deb
npm run electron:build:mac     # macOS only, requires Xcode tools
```

> **Want a ready binary?** Grab one from the [**Releases**](https://github.com/emireln/miascii/releases) page.

---

## `> tech stack`

```
▓▓▓ frontend ▓▓▓     react 18 · vite 5 · typescript 5 · tailwind 3
▓▓▓ pixel vibes ▓▓▓  press start 2p · VT323 · fira code
▓▓▓ engine ▓▓▓       html5 canvas · sobel + floyd–steinberg (hand-rolled)
▓▓▓ text ▓▓▓         figlet · lazy-loaded font chunks via import.meta.glob
▓▓▓ video ▓▓▓        MediaRecorder · canvas.captureStream · getUserMedia
▓▓▓ desktop ▓▓▓      electron 29 · electron-builder 24
▓▓▓ icons ▓▓▓        sharp · to-ico · png2icons
▓▓▓ i18n ▓▓▓         custom 1-kb provider · 12 locales · RTL
```

---

## `> project tree`

```
miascii/
├── assets/            logo SVG sources (mascot + mark, dark/light)
├── build/             generated icons + NSIS installer graphics
├── electron/          main.cjs (tray, IPC, close-to-tray) + preload.cjs
├── public/            favicons, PWA icons, banner, logo
├── scripts/           generate-icons.mjs · make-installer-assets.mjs
└── src/
    ├── components/    Shell · SettingsPanel · LanguageSwitcher · Dropzone · …
    ├── i18n/          dict.ts (12 locales) · index.tsx (provider + hooks)
    ├── lib/           ascii.ts · figlet.ts · videoRender.ts · asciiCanvas.ts
    │                  usePersisted.ts · electronBridge.ts · export.ts
    ├── modules/       TextAscii · ImageAscii · VideoAscii
    └── styles/        global.css (pixel tokens, CRT overlay, reduce-motion)
```

---

## `> scripts`

| command | what it does |
|---|---|
| `npm run dev` | Vite dev server on `:5173` |
| `npm run build` | Typecheck + production bundle into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run icons` | Regenerate every icon + installer graphic from SVG + banner |
| `npm run installer:assets` | Regenerate only the NSIS sidebar / header BMPs |
| `npm run electron` | Run electron against the built `dist/` |
| `npm run electron:dev` | Vite + electron concurrently, hot-reload |
| `npm run electron:build` | Build an installer for the current OS |
| `npm run electron:build:{win,mac,linux}` | Target a specific platform |

---

## `> privacy`

> miascii never uploads anything.

- Every operation (including video processing and webcam frames) runs **locally** via the browser's canvas APIs
- No analytics · no telemetry · no accounts · no remote fonts
- The Electron build opens no network connections except for links you explicitly click
- Your `localStorage` (`miascii:*` keys) holds your preferences; export/import/reset them from Settings

---

## `> keyboard`

```
esc           close the settings panel / dropdowns
↑ / ↓ / ↵     navigate + pick inside the FIGlet font list
```

---

## `> roadmap`

- [ ] Animated GIF export from video → ascii
- [ ] Color quantization presets (CGA, EGA, monochrome amber)
- [ ] Custom ramp picker drag-and-drop
- [ ] Configurable hotkeys in Settings
- [ ] Publish to winget / brew / snap
- [ ] Dark theme variants (amber, green phosphor)

---

## `> contributing`

Pull requests welcome. If you add a new string, drop it into `src/i18n/dict.ts` under `en` — the rest fall back to English automatically until translated.

For big changes, open an issue first so we can align on scope.

---

## `> license`

[MIT](./LICENSE) — do whatever, just keep the notice.

---

<div align="center">
<sub>made with <code>█</code> and a lot of <code>&gt;_</code></sub>
</div>
