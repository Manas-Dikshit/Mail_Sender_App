import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FCF2D8',
          soft: '#FFFAEE',
          muted: '#F3E6C4',
        },
        primary: {
          50: '#EAF0FB',
          100: '#D0DEF5',
          200: '#A3BEEB',
          300: '#6F97DA',
          400: '#3D6BC0',
          500: '#173C8D',
          600: '#123170',
          700: '#0E2657',
          800: '#0A1C40',
          900: '#07132C',
          DEFAULT: '#173C8D',
        },
        secondary: {
          50: '#EAF6FC',
          100: '#CDEBF7',
          200: '#9BD6EF',
          300: '#68C0E6',
          400: '#3AA6D6',
          500: '#1C86BF',
          600: '#166A99',
          700: '#115173',
          800: '#0B384F',
          900: '#06202C',
          DEFAULT: '#1C86BF',
        },
        accent: {
          50: '#F4FAF8',
          100: '#E4F2EE',
          200: '#CDE7E0',
          300: '#B0D5CE',
          400: '#8FC2B8',
          500: '#6EAFA1',
          600: '#548D80',
          700: '#3E6B61',
          800: '#294842',
          900: '#152522',
          DEFAULT: '#B0D5CE',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(23, 60, 141, 0.08), 0 1px 2px -1px rgba(23, 60, 141, 0.06)',
        card: '0 12px 32px -12px rgba(23, 60, 141, 0.18), 0 4px 12px -4px rgba(23, 60, 141, 0.08)',
        lifted: '0 24px 48px -16px rgba(23, 60, 141, 0.28)',
        glow: '0 0 0 1px rgba(28, 134, 191, 0.15), 0 0 24px rgba(28, 134, 191, 0.25)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(23,60,141,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(23,60,141,0.05) 1px, transparent 1px)',
        'radial-fade': 'radial-gradient(circle at top, rgba(176,213,206,0.5), transparent 60%)',
      },
      backgroundSize: {
        grid: '28px 28px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        shimmer: 'shimmer 1.6s infinite linear',
      },
    },
  },
  plugins: [],
};

export default config;