/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        builder: {
          bg: '#0a0a0f',
          surface: '#111118',
          panel: '#16161f',
          border: '#1e1e2e',
          hover: '#1a1a28',
          accent: '#6366f1',
        }
      }
    }
  },
  plugins: []
}
