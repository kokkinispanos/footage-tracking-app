/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Pro Placement / CKTraining brand: navy ground, magenta-purple accent.
        background: '#080A1A',
        surface: '#111530',
        elevated: '#191B4D',
        line: 'rgba(255,255,255,0.08)',
        brand: {
          DEFAULT: '#A020CC',
          dark: '#7A1A9E',
          light: '#C25AE8',
        },
        ink: {
          DEFAULT: '#F4F4F8',
          muted: '#A7ADC9',
          faint: '#6B7295',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 40px -24px rgba(0,0,0,0.9)',
        glow: '0 10px 40px -12px rgba(160,32,204,0.55)',
      },
      backgroundImage: {
        'brand-sheen': 'linear-gradient(135deg, #A020CC 0%, #7A1A9E 100%)',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        riseIn: 'riseIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
