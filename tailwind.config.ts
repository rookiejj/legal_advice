import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
        serif: ['Noto Serif KR', 'serif'],
      },
      colors: {
        sidebar: '#0F1117',
        accent:  '#2563EB',
        paper:   '#F8F6F1',
        ink:     '#1C1C1E',
        muted:   '#6B7280',
        border:  '#E5E3DC',
      },
    },
  },
  plugins: [],
}

export default config
