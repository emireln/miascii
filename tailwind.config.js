/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"VT323"', '"Fira Code"', 'ui-monospace', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
        code: ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          bg: '#0a0a0a',
          panel: '#111111',
          border: '#2a2a2a',
          dim: '#6b6b6b',
          mid: '#a0a0a0',
          fg: '#e6e6e6',
          hi: '#ffffff',
        },
        paper: {
          bg: '#f5f5f0',
          panel: '#e8e8e2',
          border: '#1a1a1a',
          dim: '#6b6b6b',
          mid: '#3a3a3a',
          fg: '#0a0a0a',
          hi: '#000000',
        },
      },
      boxShadow: {
        pixel: '4px 4px 0 0 currentColor',
        'pixel-sm': '2px 2px 0 0 currentColor',
      },
      borderRadius: { none: '0' },
    },
  },
  plugins: [],
}
