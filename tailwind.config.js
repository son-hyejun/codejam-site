/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,md,mdx}', // Docusaurus 소스 경로
    './docs/**/*.{md,mdx}', // 문서 경로
  ],
  darkMode: ['class', '[data-theme="dark"]'], // Docusaurus 다크모드 연동
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        brand: {
          blue: '#2f81f7',
          green: '#33bd7f',
          purple: '#8b5cf6',
          orange: '#f97316',
          red: '#ef4444',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // Pretendard 폰트 설정
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')], // 애니메이션 플러그인 추가
  corePlugins: {
    preflight: false, // Docusaurus 기본 스타일과 충돌 방지
  },
};
