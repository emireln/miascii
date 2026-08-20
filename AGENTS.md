# AGENTS.md

Welcome to **miascii** — a client-side text, image, and video to ASCII art converter built with React, Vite, TypeScript, and Electron.

---

## 1. Architecture Overview

- **`src/modules/`**:
  - `TextAscii.tsx`: FIGlet text generation, kerning, casing, and ASCII borders.
  - `ImageAscii.tsx`: Image-to-ASCII processing with edge detection, dithering, and duotone/full-color support.
  - `VideoAscii.tsx`: Video file & webcam ASCII stream processing, RAF rendering loop, and canvas video recorder.
- **`src/components/`**:
  - `Shell.tsx`: Main layout, sidebar navigation, theme synchronization, and CRT effects.
  - `AsciiColorOutput.tsx` / `AsciiOutput.tsx`: Fast, optimized ASCII display containers.
  - `PixelSelect.tsx`, `Control.tsx`, `Dropzone.tsx`, `SettingsPanel.tsx`, `UpdateBanner.tsx`: Retro terminal design system components.
- **`src/lib/`**:
  - `ascii.ts`: Core luminance mapping, Floyd-Steinberg / ordered Bayer dithering, Sobel edge detection.
  - `asciiCanvas.ts`: Monospace rasterizer for recording and canvas exports.
  - `videoRender.ts`: High-FPS imperative DOM painter for live video.
  - `export.ts`: Safe blob downloads (`.txt`, `.png`) and clipboard copy utilities.
  - `themes.ts`: CRT theme definitions (`phosphor`, `amber`, `synthwave`, `cyan`, `alert`, `paper`, `default-dark`, `default-light`).
  - `usePersisted.ts`: Shared reactive localStorage synchronization.
- **`electron/`**:
  - `main.cjs` & `preload.cjs`: Electron desktop runtime, tray integration, auto-updater, and native window management.

---

## 2. Development Commands

- `npm run dev`: Start standard Vite development server on `localhost:5173`.
- `npm run dev:portless`: Start development with **Portless** at `http://miascii.localhost`.
- `npm run build`: Type-check (`tsc`) and compile production bundle.
- `npm run electron:dev`: Run Vite + Electron concurrently with live reload.
- `npm run electron:build`: Package desktop application with electron-builder.

---

## 3. Agent Coding Guidelines

### 🦣 Caveman (Token-Optimized Prose)
- **Be Terse**: Eliminate pleasantries, greetings, filler narration, and conversational fluff.
- **High Signal**: State findings, root causes, and fixes directly.
- **Direct Output**: Minimize unnecessary tokens in explanations and summaries.

### 🐴 Ponytail (Minimalist Code & YAGNI)
- **Decision Ladder**:
  1. *Does this need to exist?* Reject premature abstractions and speculative features.
  2. *Already in this codebase?* Reuse existing components, hooks (`usePersisted`), and utilities (`cn`, `ascii.ts`).
  3. *Standard Library / Web APIs?* Favor native APIs (`Blob`, `CanvasRenderingContext2D`, `URL`, Array methods) over custom wrappers.
  4. *Native HTML/CSS?* Use native input types and CSS variables before introducing heavy JS logic.
  5. *Existing Dependencies?* Use installed libraries (`lucide-react`, `figlet`, `clsx`, `tailwind-merge`) instead of adding new ones.
  6. *Minimal implementation?* Write the shortest, cleanest code that satisfies the requirements.
- **Lazy, Not Negligent**: Always ensure complete type safety, input validation, error handling, and accessibility.

### 🎨 UI/UX & Theme Integrity
- Maintain the retro pixel CRT aesthetic across all components.
- Use CSS variable tokens (`var(--fg)`, `var(--bg)`, `var(--panel)`, `var(--mid)`, `var(--dim)`).
- Use `pixel-panel`, `pixel-btn`, and `pixel-input` classes.
- Do not introduce rounded modern pill shapes or conflicting generic color gradients.
