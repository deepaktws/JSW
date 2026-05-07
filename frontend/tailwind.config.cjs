/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#f8fafc',
        },
        secondary: {
          DEFAULT: '#0f172a',
          foreground: '#f8fafc',
          border: '#334155',
        },
      },
    },
  },
  plugins: [],
};
