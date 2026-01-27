import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ============================================
      // COLOR PALETTE
      // ============================================
      colors: {
        // Primary - Blue (#3b82f6 base)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Secondary - Violet (#8b5cf6 base)
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // Accent - Cyan (#06b6d4 base)
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Success - Emerald (#10b981 base)
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Warning - Amber (#f59e0b base)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Error - Red (#ef4444 base)
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },

      // ============================================
      // TYPOGRAPHY
      // ============================================
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      fontSize: {
        // Extended display sizes for headings
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.02em' }],
        '6xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.025em' }],
        '7xl': ['4.5rem', { lineHeight: '4.75rem', letterSpacing: '-0.025em' }],
        '8xl': ['6rem', { lineHeight: '6.25rem', letterSpacing: '-0.03em' }],
        '9xl': ['8rem', { lineHeight: '8.25rem', letterSpacing: '-0.03em' }],
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },

      // ============================================
      // SPACING
      // ============================================
      spacing: {
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '38': '9.5rem',   // 152px
        '42': '10.5rem',  // 168px
        '50': '12.5rem',  // 200px
        '58': '14.5rem',  // 232px
        '66': '16.5rem',  // 264px
      },

      // ============================================
      // BORDER RADIUS
      // ============================================
      borderRadius: {
        '2.5xl': '1.25rem',  // 20px
        '3xl': '1.5rem',     // 24px
        '4xl': '2rem',       // 32px
        '5xl': '2.5rem',     // 40px
      },

      // ============================================
      // BOX SHADOW
      // ============================================
      boxShadow: {
        // Modern shadow scale
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.2)',
        '3xl': '0 35px 60px -15px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'inner-lg': 'inset 0 4px 8px 0 rgb(0 0 0 / 0.08)',

        // Glow effects
        'glow-sm': '0 0 10px -3px rgb(59 130 246 / 0.3)',
        'glow': '0 0 20px -5px rgb(59 130 246 / 0.4)',
        'glow-lg': '0 0 30px -5px rgb(59 130 246 / 0.5)',
        'glow-xl': '0 0 50px -10px rgb(59 130 246 / 0.6)',

        // Colored shadows for primary
        'primary-sm': '0 1px 3px 0 rgb(59 130 246 / 0.2), 0 1px 2px -1px rgb(59 130 246 / 0.2)',
        'primary': '0 4px 6px -1px rgb(59 130 246 / 0.25), 0 2px 4px -2px rgb(59 130 246 / 0.2)',
        'primary-lg': '0 10px 15px -3px rgb(59 130 246 / 0.3), 0 4px 6px -4px rgb(59 130 246 / 0.25)',
        'primary-xl': '0 20px 25px -5px rgb(59 130 246 / 0.3), 0 8px 10px -6px rgb(59 130 246 / 0.25)',

        // Colored shadows for accent
        'accent-sm': '0 1px 3px 0 rgb(6 182 212 / 0.2), 0 1px 2px -1px rgb(6 182 212 / 0.2)',
        'accent': '0 4px 6px -1px rgb(6 182 212 / 0.25), 0 2px 4px -2px rgb(6 182 212 / 0.2)',
        'accent-lg': '0 10px 15px -3px rgb(6 182 212 / 0.3), 0 4px 6px -4px rgb(6 182 212 / 0.25)',
        'accent-xl': '0 20px 25px -5px rgb(6 182 212 / 0.3), 0 8px 10px -6px rgb(6 182 212 / 0.25)',

        // Colored shadows for secondary
        'secondary-sm': '0 1px 3px 0 rgb(139 92 246 / 0.2), 0 1px 2px -1px rgb(139 92 246 / 0.2)',
        'secondary': '0 4px 6px -1px rgb(139 92 246 / 0.25), 0 2px 4px -2px rgb(139 92 246 / 0.2)',
        'secondary-lg': '0 10px 15px -3px rgb(139 92 246 / 0.3), 0 4px 6px -4px rgb(139 92 246 / 0.25)',
        'secondary-xl': '0 20px 25px -5px rgb(139 92 246 / 0.3), 0 8px 10px -6px rgb(139 92 246 / 0.25)',

        // Colored shadows for success
        'success-sm': '0 1px 3px 0 rgb(16 185 129 / 0.2), 0 1px 2px -1px rgb(16 185 129 / 0.2)',
        'success': '0 4px 6px -1px rgb(16 185 129 / 0.25), 0 2px 4px -2px rgb(16 185 129 / 0.2)',
        'success-lg': '0 10px 15px -3px rgb(16 185 129 / 0.3), 0 4px 6px -4px rgb(16 185 129 / 0.25)',

        // Colored shadows for warning
        'warning-sm': '0 1px 3px 0 rgb(245 158 11 / 0.2), 0 1px 2px -1px rgb(245 158 11 / 0.2)',
        'warning': '0 4px 6px -1px rgb(245 158 11 / 0.25), 0 2px 4px -2px rgb(245 158 11 / 0.2)',
        'warning-lg': '0 10px 15px -3px rgb(245 158 11 / 0.3), 0 4px 6px -4px rgb(245 158 11 / 0.25)',

        // Colored shadows for error
        'error-sm': '0 1px 3px 0 rgb(239 68 68 / 0.2), 0 1px 2px -1px rgb(239 68 68 / 0.2)',
        'error': '0 4px 6px -1px rgb(239 68 68 / 0.25), 0 2px 4px -2px rgb(239 68 68 / 0.2)',
        'error-lg': '0 10px 15px -3px rgb(239 68 68 / 0.3), 0 4px 6px -4px rgb(239 68 68 / 0.25)',

        // Elevation shadows (Material Design inspired)
        'elevation-1': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'elevation-2': '0 2px 4px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'elevation-3': '0 4px 8px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'elevation-4': '0 8px 16px -2px rgb(0 0 0 / 0.1), 0 4px 8px -3px rgb(0 0 0 / 0.05)',
        'elevation-5': '0 16px 32px -4px rgb(0 0 0 / 0.12), 0 8px 16px -5px rgb(0 0 0 / 0.05)',
      },

      // ============================================
      // ANIMATION
      // ============================================
      animation: {
        // Fade animations
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'fade-in-left': 'fadeInLeft 0.4s ease-out',
        'fade-in-right': 'fadeInRight 0.4s ease-out',
        'fade-out': 'fadeOut 0.3s ease-in',

        // Scale animations
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in',
        'scale-up': 'scaleUp 0.3s ease-out',

        // Slide animations
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-up': 'slideOutUp 0.3s ease-in',
        'slide-out-down': 'slideOutDown 0.3s ease-in',

        // Bounce animations
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-soft': 'bounceSoft 0.6s ease-out',

        // Shake animation (for errors)
        'shake': 'shake 0.5s ease-in-out',

        // Pulse animations
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-ring': 'pulseRing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',

        // Spin variations
        'spin-slow': 'spin 3s linear infinite',
        'spin-fast': 'spin 0.5s linear infinite',

        // Float animation
        'float': 'float 3s ease-in-out infinite',

        // Shimmer (skeleton loading)
        'shimmer': 'shimmer 2s linear infinite',

        // Progress
        'progress': 'progress 1.5s ease-in-out infinite',

        // Gradient shift
        'gradient-shift': 'gradientShift 3s ease infinite',

        // Counter animation
        'count-up': 'countUp 0.5s ease-out',

        // Attention seekers
        'wiggle': 'wiggle 0.5s ease-in-out',
        'jello': 'jello 0.9s ease-in-out',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',

        // Modal/Drawer animations
        'modal-in': 'modalIn 0.3s ease-out',
        'modal-out': 'modalOut 0.2s ease-in',
        'drawer-in-left': 'drawerInLeft 0.3s ease-out',
        'drawer-in-right': 'drawerInRight 0.3s ease-out',

        // Accordion
        'accordion-down': 'accordionDown 0.2s ease-out',
        'accordion-up': 'accordionUp 0.2s ease-out',

        // Tooltip
        'tooltip-in': 'tooltipIn 0.15s ease-out',
      },

      keyframes: {
        // Fade keyframes
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },

        // Scale keyframes
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.95)' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.8)' },
          '100%': { transform: 'scale(1)' },
        },

        // Slide keyframes
        slideInUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutUp: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        slideOutDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },

        // Bounce keyframes
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceSoft: {
          '0%': { transform: 'translateY(-25%)', opacity: '0' },
          '50%': { transform: 'translateY(5%)' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },

        // Shake keyframe
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },

        // Pulse keyframes
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '50%': { transform: 'scale(1.1)', opacity: '0.5' },
          '100%': { transform: 'scale(0.95)', opacity: '1' },
        },

        // Float keyframe
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },

        // Shimmer keyframe
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },

        // Progress keyframe
        progress: {
          '0%': { width: '0%' },
          '50%': { width: '70%' },
          '100%': { width: '100%' },
        },

        // Gradient shift keyframe
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },

        // Count up keyframe
        countUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },

        // Wiggle keyframe
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
          '75%': { transform: 'rotate(-5deg)' },
        },

        // Jello keyframe
        jello: {
          '0%, 11.1%, 100%': { transform: 'none' },
          '22.2%': { transform: 'skewX(-12.5deg) skewY(-12.5deg)' },
          '33.3%': { transform: 'skewX(6.25deg) skewY(6.25deg)' },
          '44.4%': { transform: 'skewX(-3.125deg) skewY(-3.125deg)' },
          '55.5%': { transform: 'skewX(1.5625deg) skewY(1.5625deg)' },
          '66.6%': { transform: 'skewX(-0.78125deg) skewY(-0.78125deg)' },
          '77.7%': { transform: 'skewX(0.390625deg) skewY(0.390625deg)' },
          '88.8%': { transform: 'skewX(-0.1953125deg) skewY(-0.1953125deg)' },
        },

        // Heartbeat keyframe
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.1)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(1)' },
        },

        // Modal keyframes
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        modalOut: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
        },

        // Drawer keyframes
        drawerInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        drawerInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },

        // Accordion keyframes
        accordionDown: {
          '0%': { height: '0', opacity: '0' },
          '100%': { height: 'var(--accordion-height)', opacity: '1' },
        },
        accordionUp: {
          '0%': { height: 'var(--accordion-height)', opacity: '1' },
          '100%': { height: '0', opacity: '0' },
        },

        // Tooltip keyframe
        tooltipIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },

      // Transition timing functions
      transitionTimingFunction: {
        'ease-spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-snappy': 'cubic-bezier(0.2, 0, 0, 1)',
        'ease-bounce': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
        'ease-elastic': 'cubic-bezier(0.5, 1.5, 0.5, 1)',
        'ease-in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'ease-in-circ': 'cubic-bezier(0.55, 0, 1, 0.45)',
        'ease-out-circ': 'cubic-bezier(0, 0.55, 0.45, 1)',
        'ease-in-out-circ': 'cubic-bezier(0.85, 0, 0.15, 1)',
        'ease-in-back': 'cubic-bezier(0.36, 0, 0.66, -0.56)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'ease-in-out-back': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      },

      // Transition durations
      transitionDuration: {
        '0': '0ms',
        '50': '50ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '350': '350ms',
        '400': '400ms',
        '450': '450ms',
        '500': '500ms',
        '600': '600ms',
        '700': '700ms',
        '800': '800ms',
        '900': '900ms',
        '1000': '1000ms',
      },

      // ============================================
      // CONTAINER
      // ============================================
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          md: '2rem',
          lg: '2.5rem',
          xl: '3rem',
          '2xl': '4rem',
        },
        screens: {
          'xs': '360px',
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1400px',
        },
      },

      // ============================================
      // ADDITIONAL UTILITIES
      // ============================================
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        'gradient-accent': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-warning': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'gradient-error': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },
      backgroundSize: {
        '200%': '200% 200%',
        '300%': '300% 300%',
        '400%': '400% 400%',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      minHeight: {
        'screen-50': '50vh',
        'screen-75': '75vh',
        'screen-90': '90vh',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      aspectRatio: {
        'portrait': '3/4',
        'landscape': '4/3',
        'ultrawide': '21/9',
      },
    },
  },
  plugins: [],
}

export default config
