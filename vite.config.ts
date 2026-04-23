import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base: './'` makes asset URLs relative so the built index.html works both
// when served by a web server and when opened via file:// inside Electron.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/release/**', '**/dist/**', '**/build/**'],
    },
  },
})
