/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "col-todo": "#f8fafc",
        "col-inprogress": "#eff6ff",
        "col-done": "#f0fdf4",
        "badge-todo-bg": "#f1f5f9",
        "badge-todo-text": "#475569",
        "badge-wip-bg": "#dbeafe",
        "badge-wip-text": "#1e40af",
        "badge-done-bg": "#dcfce7",
        "badge-done-text": "#166534",
        progress: "#3b82f6",
        "progress-track": "#e2e8f0",
      },
    },
  },
  plugins: [],
};
