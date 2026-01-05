/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'electric-cyan': '#00FFFF',
        'bright-yellow': '#FFFF00',
        'neon-pink': '#FF00FF',
      },
    },
  },
  plugins: [],
}
