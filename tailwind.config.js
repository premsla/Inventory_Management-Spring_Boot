import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-container-highest": "#dadde0",
        "secondary-container": "#e6ea5a",
        "inverse-surface": "#0c0f10",
        "surface": "#f5f6f8",
        "primary-container": "#c5fe3c",
        "tertiary": "#675c00",
        "error-dim": "#b92902",
        "tertiary-fixed-dim": "#eed942",
        "on-tertiary-fixed": "#4a4100",
        "on-tertiary": "#fff4ba",
        "surface-bright": "#f5f6f8",
        "tertiary-container": "#fde74f",
        "on-secondary-fixed-variant": "#5d5f00",
        "inverse-primary": "#c5fe3c",
        "surface-dim": "#d1d5d8",
        "on-surface": "#2c2f31",
        "tertiary-dim": "#5a5000",
        "secondary-fixed": "#e6ea5a",
        "outline": "#757779",
        "inverse-on-surface": "#9b9d9f",
        "surface-variant": "#dadde0",
        "on-error": "#ffefec",
        "on-primary-fixed": "#364b00",
        "primary": "#496400",
        "on-surface-variant": "#595c5e",
        "outline-variant": "#abadaf",
        "secondary-dim": "#515300",
        "on-secondary": "#f7fa68",
        "primary-fixed-dim": "#b7ef2b",
        "surface-container-low": "#eff1f3",
        "on-tertiary-fixed-variant": "#695e00",
        "on-error-container": "#520c00",
        "on-secondary-fixed": "#414200",
        "tertiary-fixed": "#fde74f",
        "primary-dim": "#405700",
        "surface-tint": "#496400",
        "on-background": "#2c2f31",
        "surface-container-high": "#e0e3e5",
        "on-primary-fixed-variant": "#4e6a00",
        "secondary": "#5d5f00",
        "surface-container": "#e6e8eb",
        "on-secondary-container": "#535500",
        "background": "#f5f6f8",
        "on-primary": "#deff95",
        "secondary-fixed-dim": "#d8db4d",
        "error-container": "#f95630",
        "surface-container-lowest": "#ffffff",
        "on-primary-container": "#455f00",
        "error": "#b02500",
        "on-tertiary-container": "#5e5400",
        "primary-fixed": "#c5fe3c"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      fontFamily: {
        headline: ["Inter"],
        body: ["Inter"],
        label: ["Inter"]
      }
    },
  },
  plugins: [
    forms,
    containerQueries,
  ],
}
