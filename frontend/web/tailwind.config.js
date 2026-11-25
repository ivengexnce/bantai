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
          base: '#07070f',
          raised: '#0f0f1a',
          float: '#16162a',
          indigo: '#6366f1',
          cyan: '#22d3ee',
          amber: '#f59e0b',
          red: '#ef4444',
          emerald: '#10b981'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        card: '16px',
        button: '8px',
        bubble: '24px'
      },
      boxShadow: {
        'glow-indigo': '0 0 24px -4px rgba(99, 102, 241, 0.45)',
        'glow-cyan': '0 0 24px -4px rgba(34, 211, 238, 0.45)',
        'glow-amber': '0 0 24px -4px rgba(245, 158, 11, 0.45)',
        'glow-red': '0 0 24px -4px rgba(239, 68, 68, 0.45)'
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s steps(1) infinite'
      },
      keyframes: {
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        }
      }
    }
  },
  plugins: []
};
