export const fontFamilies = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
  display: "var(--font-display)",
} as const;

export const fontSizes = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
  "6xl": "3.75rem",
  "7xl": "4.5rem",
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

export const lineHeights = {
  none: "1",
  tight: "1.15",
  snug: "1.3",
  normal: "1.5",
  relaxed: "1.65",
  loose: "1.8",
} as const;

export const letterSpacing = {
  tighter: "-0.04em",
  tight: "-0.02em",
  normal: "0",
  wide: "0.02em",
  wider: "0.04em",
} as const;

export const neutral = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#e5e5e5",
  300: "#d4d4d4",
  400: "#a3a3a3",
  500: "#737373",
  600: "#525252",
  700: "#404040",
  800: "#262626",
  900: "#171717",
  950: "#0a0a0a",
} as const;

export const semanticColors = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  info: "var(--color-info)",
} as const;

export const spacing = {
  0: "0",
  px: "1px",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
  40: "10rem",
  48: "12rem",
  56: "14rem",
  64: "16rem",
} as const;

export const radii = {
  none: "0",
  xs: "0.125rem",
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  full: "9999px",
} as const;

export const shadows = {
  none: "none",
  xs: "0 1px 2px rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

export const opacity = {
  disabled: "0.5",
  muted: "0.68",
  overlay: "0.8",
  visible: "1",
} as const;

export const zIndex = {
  base: "0",
  raised: "10",
  dropdown: "100",
  sticky: "200",
  overlay: "300",
  modal: "400",
  popover: "500",
  toast: "600",
  tooltip: "700",
} as const;

export const breakpoints = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "96rem",
} as const;

export const containerWidths = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
  xl: "80rem",
  "2xl": "90rem",
  full: "100%",
} as const;

export const durations = {
  instant: "0ms",
  fast: "150ms",
  normal: "220ms",
  slow: "320ms",
  slower: "500ms",
} as const;

export const easings = {
  linear: "linear",
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  entrance: "cubic-bezier(0, 0, 0.2, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export const designTokens = {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  neutral,
  semanticColors,
  spacing,
  radii,
  shadows,
  opacity,
  zIndex,
  breakpoints,
  containerWidths,
  durations,
  easings,
} as const;
