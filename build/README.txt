App icons go here:

  icon.ico  — Windows installer + exe (256x256 multi-res .ico)
  icon.icns — macOS app bundle
  icon.png  — Linux (512x512 or 1024x1024 png)

Easiest way to generate all three from a single PNG:

  npx electron-icon-builder --input=source.png --output=./build --flatten

or run:

  npx @electron/icon-maker --input=source.png --output=./build

If these files are missing, electron-builder will fall back to its default
Electron icon — the app will still build and run fine.
