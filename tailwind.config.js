
module.exports = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          50:  "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
        },
        blue: {
          100: "#dbeafe",
          900: "#1e3a8a",
        },
        orange: {
          100: "#ffedd5",
          500: "#f97316",
        },
        green: { 600: "#16a34a" },
        red:   { 600: "#dc2626" },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        '9px':  '9px',
        '10px': '10px',
        '11px': '11px',
        '12px': '12px',
      },
      borderRadius: {
        4: '4px',
        5: '5px',
        6: '6px',
      },
      zIndex: {
        nav: 50,
        drawer: 40,
        modal: 60,
      },
      transitionDuration: {
        fast: '150ms',
      },
      keyframes: {
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        spin: 'spin 1s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwind-scrollbar')({ nocompatible: true }),
    require('@tailwindcss/line-clamp'),
  ],
};
