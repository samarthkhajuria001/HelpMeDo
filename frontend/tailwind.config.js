/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Background
        'bg-primary': '#FAFAF9',
        'bg-secondary': '#F5F5F4',
        'bg-tertiary': '#EDEDED',
        'bg-surface': '#FFFFFF',
        // Text
        'text-primary': '#1C1917',
        'text-secondary': '#57534E',
        'text-tertiary': '#A8A29E',
        'text-disabled': '#D6D3D1',
        // Border
        'border-default': '#E7E5E4',
        'border-light': '#F5F5F4',
        // Accent
        'accent-primary': '#2563EB',
        'accent-hover': '#1D4ED8',
        // Semantic
        'success': '#16A34A',
        'warning': '#D97706',
        'danger': '#DC2626',
        // Priority
        'priority-high': '#B91C1C',
        'priority-medium': '#1C1917',
        'priority-low': '#A8A29E',
        // Goal colors
        'goal-blue': '#3B82F6',
        'goal-green': '#22C55E',
        'goal-amber': '#F59E0B',
        'goal-rose': '#F43F5E',
        'goal-violet': '#8B5CF6',
        'goal-cyan': '#06B6D4',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.07)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 40px rgba(0, 0, 0, 0.15)',
        'focus': '0 0 0 3px rgba(37, 99, 235, 0.2)',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
}
