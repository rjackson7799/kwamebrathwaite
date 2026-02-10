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
        // Primary Colors
        black: '#000000',
        white: '#FFFFFF',
        charcoal: '#1A1A1A',
        // Accent Colors
        'gray-warm': '#6B6B6B',
        'gray-light': '#E5E5E5',
        gold: '#B8945F',
        // Semantic Colors
        success: '#2D5016',
        error: '#8B0000',
        warning: '#8B6914',
        info: '#1A4D7A',
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'monospace'],
      },
      fontSize: {
        'display-1': ['4.5rem', { lineHeight: '1.11', letterSpacing: '-0.02em', fontWeight: '500' }],
        'display-2': ['3.5rem', { lineHeight: '1.14', letterSpacing: '-0.01em', fontWeight: '500' }],
        'h1': ['3rem', { lineHeight: '1.17', letterSpacing: '-0.01em', fontWeight: '500' }],
        'h2': ['2.25rem', { lineHeight: '1.22', letterSpacing: '-0.005em', fontWeight: '500' }],
        'h3': ['1.75rem', { lineHeight: '1.29', fontWeight: '400' }],
        'h4': ['1.25rem', { lineHeight: '1.4', fontWeight: '400' }],
        'body-lg': ['1rem', { lineHeight: '1.6' }],
        'body': ['0.9375rem', { lineHeight: '1.6' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.33', letterSpacing: '0.01em' }],
        'overline': ['0.688rem', { lineHeight: '1.45', letterSpacing: '0.08em', fontWeight: '600' }],
      },
      spacing: {
        'xs': '0.25rem',   // 4px
        'sm': '0.5rem',    // 8px
        'md': '1rem',      // 16px
        'lg': '1.5rem',    // 24px
        'xl': '2rem',      // 32px
        '2xl': '3rem',     // 48px
        '3xl': '4rem',     // 64px
        '4xl': '6rem',     // 96px
        '5xl': '8rem',     // 128px
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'md': '4px',
        'lg': '8px',
        'xl': '16px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 4px 8px rgba(0,0,0,0.1)',
        'lg': '0 8px 24px rgba(0,0,0,0.15)',
        'xl': '0 16px 48px rgba(0,0,0,0.2)',
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '200ms',
        'slow': '300ms',
        'very-slow': '500ms',
      },
      zIndex: {
        'base': '1',
        'dropdown': '100',
        'sticky': '200',
        'modal': '300',
        'tooltip': '400',
      },
      maxWidth: {
        'container': '1440px',
      },
      keyframes: {
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)'
          },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.0, 0.0, 0.2, 1) forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'scale-in': 'scale-in 0.4s ease-out forwards',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
