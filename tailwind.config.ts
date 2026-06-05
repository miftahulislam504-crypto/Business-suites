import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        brand: {
          DEFAULT: '#2563eb',
          dark:    '#1d4ed8',
          light:   '#60a5fa',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        bangla: ['var(--font-hind-siliguri)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
