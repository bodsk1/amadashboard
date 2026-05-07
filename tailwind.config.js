/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        alliance: ["'Alliance No. 2'", 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#060b18',
          900: '#0a0f1e',
          800: '#0d1630',
          700: '#1a2444',
          600: '#243056',
          500: '#2e4070',
          400: '#4d6090',
        },
      },
    },
  },
  plugins: [],
};
