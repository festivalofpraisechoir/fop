module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        canvas: '#F3F4F6',
        panel: '#FFFFFF',
        slateSoft: '#F8FAFC',
        border: '#E5E7EB',
        textMuted: '#4B5563',
        accent: '#334155',
        accentSoft: '#E2E8F0',
        success: '#166534',
        warning: '#B45309',
        danger: '#991B1B',
      },
      boxShadow: {
        soft: '0 6px 18px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: {
        xl: '20px',
      },
    },
  },
  plugins: [],
};
