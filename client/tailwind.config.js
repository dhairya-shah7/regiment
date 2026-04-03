/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080C14',
        surface: 'rgba(255,255,255,0.04)',
        'surface-2': 'rgba(255,255,255,0.07)',
        'surface-3': 'rgba(255,255,255,0.12)',
        accent: '#00D4FF',
        'accent-dim': 'rgba(0,212,255,0.15)',
        alert: '#FF4444',
        'alert-dim': 'rgba(255,68,68,0.15)',
        warning: '#F59E0B',
        'warning-dim': 'rgba(245,158,11,0.15)',
        success: '#10B981',
        'success-dim': 'rgba(16,185,129,0.15)',
        muted: '#4B5563',
        border: 'rgba(255,255,255,0.08)',
        'border-2': 'rgba(255,255,255,0.14)',
        text: {
          primary: '#E8EDF5',
          secondary: '#8892A4',
          muted: '#4B5563',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'blink': 'blink 1.2s step-start infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { from: { opacity: 0, transform: 'translateX(-8px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        blink: { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0 } },
      },
      boxShadow: {
        'accent': '0 0 20px rgba(0,212,255,0.15)',
        'accent-lg': '0 0 40px rgba(0,212,255,0.2)',
        'alert': '0 0 20px rgba(255,68,68,0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
