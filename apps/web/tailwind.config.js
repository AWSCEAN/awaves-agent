/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#e6f4f9',
          100: '#cce9f3',
          200: '#99d3e7',
          300: '#66bddb',
          400: '#33a7cf',
          500: '#0091c3',
          600: '#00749c',
          700: '#005775',
          800: '#003a4e',
          900: '#001d27',
        },
        sand: {
          50: '#fdfbf7',
          100: '#faf6ef',
          200: '#f5eddf',
          300: '#f0e4cf',
          400: '#ebdbbf',
          500: '#e6d2af',
          600: '#b8a88c',
          700: '#8a7e69',
          800: '#5c5446',
          900: '#2e2a23',
        },
        coral: {
          500: '#ff6b6b',
          600: '#ee5a5a',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
