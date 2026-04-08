/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'cyber-red': '#FF0000',
        'cyber-purple': '#9B00FF',
        'cyber-orange': '#FF6600',
        'cyber-cyan': '#00FFFF',
        'cyber-green': '#00FF41',
        'bg-dark': '#0A0A0F',
        'bg-panel': '#0F0F1A',
        'bg-card': '#13131F',
        'border-cyber': '#1A1A2E',
      },
      fontFamily: {
        mono: ['Courier New', 'Courier', 'monospace'],
        cyber: ['Share Tech Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'border-run': 'border-run 2s linear infinite',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 5px #FF0000, 0 0 10px #FF0000' },
          '50%': { boxShadow: '0 0 20px #FF0000, 0 0 40px #FF0000, 0 0 80px #FF0000' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'flicker': {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: 1 },
          '20%, 24%, 55%': { opacity: 0.4 },
        },
        'glow-pulse': {
          '0%, 100%': { textShadow: '0 0 7px #00FFFF, 0 0 10px #00FFFF' },
          '50%': { textShadow: '0 0 20px #00FFFF, 0 0 30px #00FFFF, 0 0 50px #00FFFF' },
        },
        'border-run': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      boxShadow: {
        'neon-red': '0 0 5px #FF0000, 0 0 20px #FF0000, 0 0 40px #FF0000',
        'neon-cyan': '0 0 5px #00FFFF, 0 0 20px #00FFFF, 0 0 40px #00FFFF',
        'neon-purple': '0 0 5px #9B00FF, 0 0 20px #9B00FF, 0 0 40px #9B00FF',
        'neon-green': '0 0 5px #00FF41, 0 0 20px #00FF41, 0 0 40px #00FF41',
        'neon-orange': '0 0 5px #FF6600, 0 0 20px #FF6600, 0 0 40px #FF6600',
      },
    },
  },
  plugins: [],
};
