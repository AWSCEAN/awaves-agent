/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#e8eef4',
          100: '#d1dde9',
          200: '#a3bbd3',
          300: '#7599bd',
          400: '#5ADBFF',
          500: '#3C6997',
          600: '#094074',
          700: '#073359',
          800: '#05263f',
          900: '#021924',
        },
        sunset: {
          400: '#FFDD4A',
          500: '#FE9000',
          600: '#e58200',
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
      },
      fontFamily: {
        sans: ['IBM Plex Sans KR', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
