/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./secteurs/*.html",
    "./blog/*.html",
    "./*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary:        '#F59E0B',
        'primary-dark': '#D97706',
        'primary-light':'#FCD34D',
        foreground:     '#0A0A0F',
        accent:         '#3B82F6',
        'accent-light': '#93C5FD',
        cream:  '#F0EBE0',
        sand:   '#C4BAA6',
        stone:  '#8A8070',
        clay:   '#625A52',
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'sans-serif'],
        sans:    ['Mulish', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
