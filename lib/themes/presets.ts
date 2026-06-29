export type ThemePreset = "cbse_saffron" | "navy_blue" | "emerald_green" | "crimson_maroon" | "modern_teal" | "custom";

export interface ThemeColors {
  primary: string;
  primary_hover: string;
  background: string;
  foreground: string;
  sidebar_bg: string;
  border_color: string;
  card_bg: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  muted_text: string;
  section_alt: string;
}

export interface ThemeConfig {
  preset: ThemePreset;
  colors: ThemeColors;
}

export const THEME_PRESETS: Record<Exclude<ThemePreset, "custom">, ThemeConfig> = {
  cbse_saffron: {
    preset: "cbse_saffron",
    colors: {
      primary: "#F59E0B",
      primary_hover: "#D97706",
      background: "#F8FAFC",
      foreground: "#0F172A",
      sidebar_bg: "#0F172A",
      border_color: "#E2E8F0",
      card_bg: "#FFFFFF",
      success: "#10B981",
      danger: "#EF4444",
      warning: "#F59E0B",
      info: "#3B82F6",
      muted_text: "#68718a",
      section_alt: "#FFF7E6",
    },
  },
  navy_blue: {
    preset: "navy_blue",
    colors: {
      primary: "#1E3A5F",
      primary_hover: "#162C47",
      background: "#FFFFFF",
      foreground: "#231F20",
      sidebar_bg: "#0F2336",
      border_color: "#E0E0E0",
      card_bg: "#F5F5F5",
      success: "#1FC16B",
      danger: "#DC3545",
      warning: "#FFD700",
      info: "#0088CC",
      muted_text: "#5C5D5D",
      section_alt: "#F0F4F9",
    },
  },
  emerald_green: {
    preset: "emerald_green",
    colors: {
      primary: "#059669",
      primary_hover: "#047857",
      background: "#F8FAFC",
      foreground: "#0F172A",
      sidebar_bg: "#064E3B",
      border_color: "#E2E8F0",
      card_bg: "#FFFFFF",
      success: "#10B981",
      danger: "#EF4444",
      warning: "#F59E0B",
      info: "#3B82F6",
      muted_text: "#64748B",
      section_alt: "#ECFDF5",
    },
  },
  crimson_maroon: {
    preset: "crimson_maroon",
    colors: {
      primary: "#9F1239",
      primary_hover: "#881337",
      background: "#FFFFFF",
      foreground: "#1E293B",
      sidebar_bg: "#4C0519",
      border_color: "#E2E8F0",
      card_bg: "#FFFFFF",
      success: "#10B981",
      danger: "#E11D48",
      warning: "#F59E0B",
      info: "#2563EB",
      muted_text: "#64748B",
      section_alt: "#FFF1F2",
    },
  },
  modern_teal: {
    preset: "modern_teal",
    colors: {
      primary: "#0D9488",
      primary_hover: "#0F766E",
      background: "#F8FAFC",
      foreground: "#0F172A",
      sidebar_bg: "#134E4A",
      border_color: "#E2E8F0",
      card_bg: "#FFFFFF",
      success: "#10B981",
      danger: "#EF4444",
      warning: "#F59E0B",
      info: "#0284C7",
      muted_text: "#64748B",
      section_alt: "#F0FDFA",
    },
  },
};

export const PRESET_LABELS: Record<Exclude<ThemePreset, "custom">, string> = {
  cbse_saffron: "CBSE Saffron Gold",
  navy_blue: "Navy Blue",
  emerald_green: "Emerald Forest Green",
  crimson_maroon: "Royal Crimson Maroon",
  modern_teal: "Modern Tech Teal",
};

export function getPresetTheme(preset: ThemePreset): ThemeConfig {
  if (preset === "custom") {
    return { ...THEME_PRESETS.navy_blue, preset: "custom" };
  }
  return THEME_PRESETS[preset];
}

export function resolveThemeConfig(
  themeConfig?: Partial<ThemeConfig> | null
): ThemeConfig {
  const preset = themeConfig?.preset ?? "navy_blue";
  const base = getPresetTheme(preset);
  if (!themeConfig?.colors) return base;

  return {
    preset,
    colors: { ...base.colors, ...themeConfig.colors },
  };
}

export function themeColorsToCssVars(colors: ThemeColors): Record<string, string> {
  return {
    "--primary": colors.primary,
    "--primary-hover": colors.primary_hover,
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--sidebar-bg": colors.sidebar_bg,
    "--border-color": colors.border_color,
    "--card-bg": colors.card_bg,
    "--success": colors.success,
    "--danger": colors.danger,
    "--warning": colors.warning,
    "--info": colors.info,
    "--muted-text": colors.muted_text,
    "--section-alt": colors.section_alt,
  };
}
