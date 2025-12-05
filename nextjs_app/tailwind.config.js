/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './app/**/*.{js,ts,jsx,tsx,mdx}',
      './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          // Deep space theme for data visualization
          'viz-bg': '#0a0e1a',
          'viz-surface': '#131928',
          'viz-border': '#1e2a45',
          'viz-text': '#e2e8f0',
          'viz-muted': '#64748b',
          'viz-accent': '#22d3ee',
          'viz-accent-dim': '#0891b2',
          'viz-highlight': '#f472b6',
          'viz-warning': '#fbbf24',
          'viz-success': '#4ade80',
        },
        fontFamily: {
          'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
          'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
          'body': ['Inter', 'system-ui', 'sans-serif'],
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'fade-in': 'fadeIn 0.5s ease-out forwards',
          'slide-up': 'slideUp 0.4s ease-out forwards',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
        },
      },
    },
    plugins: [],
  };