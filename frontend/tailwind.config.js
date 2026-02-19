/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        'heading': ['Inter', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        alknz: {
          'deepest': '#02040A',
          'transition': '#0A0A1F',
          'cards': '#0A1628',
          'glow': '#002D72',
          'glow-light': '#0047AB',
          'borders': '#1A2744',
          'primary': '#0047AB',
          'primary-hover': '#0052CC',
          'secondary': '#00A3FF',
          'success': '#22C55E',
          'danger': '#EF4444',
          'text': '#FFFFFF',
          'muted': '#94A3B8',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0, 71, 171, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 71, 171, 0.7)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 4s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(135deg, #02040A 0%, #0A0A1F 50%, #002D72 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(10, 22, 40, 0.9) 0%, rgba(2, 4, 10, 0.9) 100%)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
