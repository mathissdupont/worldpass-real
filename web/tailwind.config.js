/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // İstersen token isimleri: 'ink', 'card' vs. ama şart değil.
      }
    }
  },
  plugins: [],
}
