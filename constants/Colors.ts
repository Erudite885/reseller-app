import { useResellerStore } from "@/store/resellerStore";

function getPrimary(): string {
  try {
    return useResellerStore.getState().config.theme.primary;
  } catch {
    return "#379114";
  }
}

function getPrimaryDark(): string {
  const primary = getPrimary();
  // Darken the primary color by ~30%
  return adjustColor(primary, -30);
}

function getPrimaryLight(): string {
  const primary = getPrimary();
  // Lighten by ~60%
  return adjustColor(primary, 60);
}

// Simple color adjuster
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const Colors = {
  light: {
    // Primary Brand Colors — DYNAMIC
    get primary() {
      return getPrimary();
    },
    get primaryDark() {
      return getPrimaryDark();
    },
    get primaryLight() {
      return getPrimaryLight();
    },

    // Rest stays the same...
    background: "#ffffffff",
    backgroundSecondary: "rgb(250, 251, 249)",
    backgroundTertiary: "rgb(244, 246, 243)",
    card: "#ffffffff",
    cardBorder: "rgb(231, 235, 229)",
    text: "rgb(11, 26, 3)",
    textSecondary: "rgb(112, 141, 100)",
    textTertiary: "rgb(166, 175, 160)",
    success: "#10B981",
    successLight: "#D1FAE5",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    info: "#3B82F6",
    infoLight: "#DBEAFE",
    border: "#E5E7EB",
    get borderFocus() {
      return getPrimaryLight();
    },
    placeholder: "#9CA3AF",
    disabled: "#D1D5DB",
    get tabBarActive() {
      return getPrimary();
    },
    tabBarInactive: "#9CA3AF",
    tabBarBackground: "#FFFFFF",
    inputBackground: "#F9FAFB",
    inputBorder: "#E5E7EB",
    inputText: "rgb(11, 20, 3)",
    shadow: "rgba(0, 0, 0, 0.1)",
  },

  dark: {
    get primary() {
      return getPrimary();
    },
    get primaryDark() {
      return getPrimaryDark();
    },
    get primaryLight() {
      return getPrimaryLight();
    },

    background: "rgb(27, 42, 15)",
    backgroundSecondary: "rgb(45, 59, 30)",
    backgroundTertiary: "rgb(63, 85, 51)",
    card: "rgb(41, 59, 30)",
    cardBorder: "rgb(62, 85, 51)",
    text: "rgb(243, 249, 241)",
    textSecondary: "rgb(211, 225, 203)",
    textTertiary: "rgb(164, 184, 148)",
    success: "#34D399",
    successLight: "#064E3B",
    error: "#F87171",
    errorLight: "#7F1D1D",
    warning: "#FBBF24",
    warningLight: "#78350F",
    info: "#60A5FA",
    infoLight: "#1E3A8A",
    border: "rgb(62, 85, 51)",
    get borderFocus() {
      return getPrimaryLight();
    },
    placeholder: "rgb(112, 139, 100)",
    disabled: "rgb(87, 105, 71)",
    get tabBarActive() {
      return getPrimary();
    },
    tabBarInactive: "rgb(117, 139, 100)",
    tabBarBackground: "rgb(43, 59, 30)",
    inputBackground: "rgb(41, 59, 30)",
    inputBorder: "rgb(66, 85, 51)",
    inputText: "rgb(244, 249, 241)",
    shadow: "rgba(0, 0, 0, 0.4)",
  },
};

// Keep the rest of the file unchanged:
// Spacing, Radius, Typography, Shadows, ColorScheme, ThemeColors

// Spacing Scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius Scale
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Typography Scale
export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Shadow Presets
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

// export type ColorScheme = 'light' | 'dark';
// export type ThemeColors = typeof Colors.light;

