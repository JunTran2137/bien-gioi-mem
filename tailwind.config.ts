import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        primary: {
          DEFAULT: 'var(--primary)',
          soft: 'var(--primary-soft)'
        },
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        danger: 'var(--danger)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace']
      },
      borderRadius: {
        xl: '12px',
        '2xl': '20px'
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' }
        },
        'pulse-node': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' }
        }
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
        'pulse-node': 'pulse-node 2.5s ease-in-out infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;
