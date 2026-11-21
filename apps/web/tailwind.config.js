/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        iris: {
          bg: '#0E0E0E',
          surface: '#151515',
          elevated: '#1D1D1D',
          blue: '#2F6BFF',
          deepBlue: '#2453DB',
          violet: '#5A4CF5',
          purple: '#7C48F0',
          text: '#FFFFFF',
          textSec: '#8C8C8C',
          muted: '#6E6E6E'
        },
        bantai: {
          50: '#fbf8ed',
          100: '#f5edd2',
          200: '#eddba4',
          300: '#e3c26f',
          400: '#daa742',
          500: '#2F6BFF', // Electric Blue (Glass Iris Primary)
          600: '#2453DB',
          700: '#5A4CF5',
          800: '#7C48F0',
          900: '#1D1D1D',
          950: '#0E0E0E',
          dark: '#0E0E0E',
          darkCard: '#151515',
          darkBorder: '#232323'
        }
      },
      animation: {
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
      },
      keyframes: {
        'border-beam': {
          '100%': {
            offsetDistance: '100%',
          },
        },
      }
    }
  },
  plugins: []
};
