/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ocean Sunset Theme
        ocean: {
          50: '#e8eef4',
          100: '#d1dde9',
          200: '#a3bbd3',
          300: '#7599bd',
          400: '#5ADBFF', // Light cyan (accent)
          500: '#3C6997', // Medium blue
          600: '#094074', // Deep blue (primary)
          700: '#073359',
          800: '#05263f',
          900: '#021924',
        },
        sunset: {
          400: '#FFDD4A', // Yellow (accent)
          500: '#FE9000', // Orange (accent)
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
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
