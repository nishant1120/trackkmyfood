/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Spotify-inspired surfaces (dark mode default)
        bg: {
          DEFAULT: '#000000',
          surface: '#121212',
          elevated: '#1A1A1A',
          card: '#181818',
          alt: '#1F1F1F',
          chip: '#252525',
        },
        // Light mode counterparts
        bgLight: {
          DEFAULT: '#FFFFFF',
          surface: '#F4F4F5',
          elevated: '#FAFAFA',
        },
        // Text
        fg: {
          DEFAULT: '#FFFFFF',
          muted: '#B3B3B3',
          dim: '#7C7C7C',
        },
        fgLight: {
          DEFAULT: '#0A0A0A',
          muted: '#525252',
          dim: '#A3A3A3',
        },
        // Brand
        brand: {
          DEFAULT: '#1DB954',
          bright: '#1ED760',
          dark: '#169B45',
        },
        // Macro accents (per spec)
        macro: {
          protein: '#1DB954',
          carbs: '#F59E0B',
          fats: '#EF4444',
          fibre: '#8B5CF6',
        },
        // Semantic
        danger: '#F3727F',
        warning: '#FFA42B',
        info: '#539DF5',
        // Borders
        border: {
          DEFAULT: '#4D4D4D',
          dim: '#2A2A2A',
        },
      },
      borderRadius: {
        pill: '9999px',
        card: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        title: ['Inter', 'System'],
      },
      letterSpacing: {
        button: '1.4px',
      },
    },
  },
  plugins: [],
};
