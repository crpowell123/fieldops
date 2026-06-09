/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#07090f', 1: '#0c1018', 2: '#111827', 3: '#1a2235',
        },
        brand: {
          blue: '#3b82f6', green: '#22c55e', amber: '#f59e0b',
          red: '#ef4444', purple: '#a78bfa', teal: '#14b8a6',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
