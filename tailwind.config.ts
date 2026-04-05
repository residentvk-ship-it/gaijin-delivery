// Конфигурация Tailwind CSS: светлая тема в стиле Gaijin — белый фон, тёмный текст, красный акцент.

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Светлая тема по умолчанию
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E8192C', // Красный — основной акцент как у Gaijin
          light:   '#FF2D42',
          dark:    '#C4001F',
        },
        surface: {
          DEFAULT: '#FFFFFF', // Белый фон
          card:    '#FFFFFF', // Карточки белые
          modal:   '#FFFFFF', // Модалки белые
          input:   '#F5F5F5', // Поля ввода светло-серые
          border:  '#E8E8E8', // Границы светло-серые
          section: '#F8F8F8', // Фон секций
        },
        text: {
          primary:   '#1A1A1A', // Основной текст тёмный
          secondary: '#666666', // Вторичный текст серый
          muted:     '#AAAAAA', // Неактивный текст
        },
        status: {
          new:        '#3B82F6',
          accepted:   '#8B5CF6',
          cooking:    '#F59E0B',
          delivering: '#10B981',
          completed:  '#22C55E',
          cancelled:  '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        btn:  '8px',
      },
      boxShadow: {
        card:  '0 2px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.12)',
        modal: '0 8px 40px rgba(0,0,0,0.15)',
      },
      animation: {
        'slide-up':  'slideUp 0.25s ease-out',
        'fade-in':   'fadeIn 0.15s ease-out',
        'cart-bump': 'cartBump 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        cartBump: {
          '0%,100%': { transform: 'scale(1)' },
          '50%':     { transform: 'scale(1.25)' },
        },
      },
    },
  },
  plugins: [],
}

export default config