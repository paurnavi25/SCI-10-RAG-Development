/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FDFCF8',
          100: '#FBF9F3',
          200: '#F5F0E6',
          300: '#EAE3D5',
          400: '#DED7C8',
          500: '#C8BFB0',
        },
        forest: {
          DEFAULT: '#263D32',
          light:   '#3A5445',
          muted:   '#4F6B5C',
        },
        sage: {
          DEFAULT: '#7D9277',
          light:   '#9BAF95',
          dark:    '#5E7259',
        },
        warm: {
          grey: '#827D70',
          beige: '#A09890',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        script: ['"Dancing Script"', 'cursive'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'fine-grid': `
          linear-gradient(rgba(38,61,50,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(38,61,50,0.022) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(38,61,50,0.08), 0 1px 2px -1px rgba(38,61,50,0.05)',
        'card-hover': '0 4px 12px 0 rgba(38,61,50,0.10)',
      },
      borderRadius: {
        'xl2': '14px',
      },
    },
  },
  plugins: [],
}

