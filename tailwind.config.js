/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        a24: {
          bg: '#0a0b0d',
          card: '#121418',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#00d2ff',
          avatar: '#2684FF',
          gold: '#e0b04a'
        }
      }
    },
  },
  plugins: [],
}
