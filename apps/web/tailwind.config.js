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
        bantai: {
          50: '#fbf8ed',
          100: '#f5edd2',
          200: '#eddba4',
          300: '#e3c26f',
          400: '#daa742',
          500: '#cc8e25', // Warm Mumbai Gold
          600: '#b06f1d',
          700: '#8c501a',
          800: '#73411b',
          900: '#61371b',
          950: '#381c0c',
          dark: '#0f1117',
          darkCard: '#1a1d27',
          darkBorder: '#282d3d'
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
