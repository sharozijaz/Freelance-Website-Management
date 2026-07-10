export type ThemeMode = "light" | "dark";

export interface TenantTheme {
  mode?: ThemeMode;
  primaryColor?: string;
  secondaryColor?: string;
  fontSans?: string;
  fontSerif?: string;
  fontMono?: string;
  fontDisplay?: string;
  radius?: string;
  containerWidth?: string;
}

export const defaultTheme: Required<TenantTheme> = {
  mode: "light",
  primaryColor: "oklch(0.48 0.18 255)",
  secondaryColor: "oklch(0.56 0.12 180)",
  fontSans: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSerif: "Georgia, Cambria, serif",
  fontMono: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace",
  fontDisplay: "Inter, ui-sans-serif, system-ui, sans-serif",
  radius: "0.5rem",
  containerWidth: "80rem",
};

export function createThemeVariables(theme: TenantTheme = {}) {
  const resolved = { ...defaultTheme, ...theme };

  return {
    "--font-sans": resolved.fontSans,
    "--font-serif": resolved.fontSerif,
    "--font-mono": resolved.fontMono,
    "--font-display": resolved.fontDisplay,
    "--brand-primary": resolved.primaryColor,
    "--brand-secondary": resolved.secondaryColor,
    "--radius": resolved.radius,
    "--container-default": resolved.containerWidth,
  } as const;
}
