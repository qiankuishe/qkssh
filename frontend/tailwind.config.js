/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': 'var(--bg-color)',
        'bg-card': 'var(--bg-card)',
        'text-main': 'var(--text-color)',
        'text-secondary': 'var(--text-secondary)',
        'border-main': 'var(--border-color)',
        'primary': 'var(--primary-color)',
        'primary-hover': 'var(--primary-hover)',
        'hover-bg': 'var(--hover-bg)',
        'accent': 'var(--accent-color)',
      },
      boxShadow: {
        'custom': '0 2px 8px var(--shadow-color)',
        'custom-lg': '0 4px 16px var(--shadow-color)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
