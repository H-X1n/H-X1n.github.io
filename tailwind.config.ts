import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}', './content/**/*.{md,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#17141f',
        paper: '#f2fbff',
        cloud: '#fbfdff',
        coral: '#38bdf8',
        teal: '#0ea5e9',
        moss: '#bae6fd',
        violet: '#2563eb',
        line: '#d9edf8',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'Arial', 'sans-serif'],
        serif: ['var(--font-display)', 'Inter', 'Arial', 'sans-serif'],
        mono: ['var(--font-code)', 'JetBrains Mono', 'monospace'],
        accent: ['var(--font-accent)', 'Sriracha', 'cursive'],
      },
      boxShadow: {
        soft: '0 22px 70px rgba(14, 116, 144, 0.13)',
      },
    },
  },
  plugins: [],
};

export default config;
