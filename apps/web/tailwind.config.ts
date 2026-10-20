import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
        colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        surface: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        crema: '#FDF6E4',
        azul: {
          50: '#EFF2FA',
          100: '#D8DFF3',
          200: '#B0BFE8',
          300: '#768FD6',
          400: '#3B5FC4',
          500: '#294389',
          600: '#1D3062',
          700: '#152247', // Superficie elevada (cards en Dark Mode)
          800: '#101B37', // Fondo principal Dark Mode
          900: '#090F1F', // Modales y overlays
        },
        dorado: {
          50: '#F3EDE2',
          100: '#E9DDC9',
          200: '#DAC6A4',
          300: '#C8AB79',
          500: '#B7904E', // CTA primario / acento de marca
          600: '#98773E', // Hover / pressed de CTA
          700: '#745B2F', // Texto dorado sobre fondo claro (AA)
          800: '#503E21',
        },
        neutro: {
          50: '#FBFAF9', // Fondo de cards en Light Mode
          100: '#F4F3F1',
          200: '#E9E6E2', // Bordes y separadores
          300: '#D2CEC6', // Bordes de inputs
          400: '#B0A99B', // Placeholder / disabled
          500: '#8F8470',
          600: '#645C4F', // Texto secundario
          700: '#3F3A31', // Texto secundario Dark Mode
          800: '#28251F', // Texto principal Light Mode
          900: '#171512',
        },
        exito: {
          50: '#E6F0EB',
          300: '#80B299',
          500: '#568F73', // Verde salvia (armoniza con dorado)
          700: '#39604D',
        },
        error: {
          50: '#F8DFDD',
          300: '#E99B96',
          500: '#D74C42', // No disponible
          700: '#A82D24',
        },
        warning: {
          50: '#FBEED0',
          300: '#F5D589',
          500: '#EFB839', // Ámbar funcional (diferenciado del dorado)
          700: '#D49A11',
        },
        info: {
          50: '#DDEAF8',
          300: '#96BCE9',
          500: '#4E8FDA', // Azul vivo
          700: '#286EBD',
        },
        terracota: {
          50: '#F4DED7',
          300: '#E2AD9C',
          500: '#B25134', // Destacados / Promociones
          700: '#7E3A25',
        },
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 3px rgba(0,0,0,0.02)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
