/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        // Product scale (16px root): meta → UI → body → titles
        xs: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],      // 12px meta/badges
        sm: ['0.875rem', { lineHeight: '1.375rem' }],                             // 14px UI / nav
        base: ['0.9375rem', { lineHeight: '1.5rem' }],                            // 15px body
        lg: ['1.0625rem', { lineHeight: '1.625rem' }],                            // 17px
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.02em' }],  // 24px page
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },
      letterSpacing: {
        display: 'var(--tracking-display)',
        heading: 'var(--tracking-heading)',
        body: 'var(--tracking-body)',
        label: 'var(--tracking-label)',
        caps: 'var(--tracking-caps)',
      },
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        lvx: {
          navy: '#0a1628',
          'navy-light': '#122240',
          'navy-card': '#152a4a',
          blue: '#1d4ed8',
          'blue-hover': '#1e3a8a',
          charcoal: '#1a2b3c',
          label: '#8e8ebf',
          orange: '#f5a623',
          peach: '#fff5eb',
          tile: '#0f2d37',
          surface: '#f8fafc',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'premium-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'premium-md': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'premium-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.03), 0 4px 6px -2px rgba(0, 0, 0, 0.01)',
      },
    },
  },
  plugins: [],
}
