
// constants/Colors.ts

export const Colors = {
  light: {
    // Primary Brand Colors
    primary: "#379114", // Green - main brand
    primaryDark: "rgb(35, 77, 11)",
    primaryLight: "rgb(160, 240, 94)",

    // Background Colors
    background: "#ffffffff",
    backgroundSecondary: "rgb(250, 251, 249)",
    backgroundTertiary: "rgb(244, 246, 243)",

    // Card & Surface
    card: "#ffffffff",
    cardBorder: "rgb(231, 235, 229)",

    // Text Colors
    text: "rgb(11, 26, 3)",
    textSecondary: "rgb(112, 141, 100)",
    textTertiary: "rgb(166, 175, 160)",

    // Status Colors
    success: "#10B981",
    successLight: "#D1FAE5",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    info: "#3B82F6",
    infoLight: "#DBEAFE",

    // Interactive Elements
    border: "#E5E7EB",
    borderFocus: "rgb(164, 236, 96)",
    placeholder: "#9CA3AF",
    disabled: "#D1D5DB",

    // Bottom Tab Bar
    tabBarActive: "rgb(152, 236, 96)",
    tabBarInactive: "#9CA3AF",
    tabBarBackground: "#FFFFFF",

    // Input Fields
    inputBackground: "#F9FAFB",
    inputBorder: "#E5E7EB",
    inputText: "rgb(11, 20, 3)",

    // Shadows
    shadow: "rgba(0, 0, 0, 0.1)",
  },

  dark: {
    // Primary Brand Colors
    primary: "rgb(177, 248, 129)", // Lighter indigo for dark mode
    primaryDark: "rgb(168, 241, 99)",
    primaryLight: "rgb(211, 252, 165)",

    // Background Colors
    background: "rgb(27, 42, 15)",
    backgroundSecondary: "rgb(45, 59, 30)",
    backgroundTertiary: "rgb(63, 85, 51)",

    // Card & Surface
    card: "rgb(41, 59, 30)",
    cardBorder: "rgb(62, 85, 51)",

    // Text Colors
    text: "rgb(243, 249, 241)",
    textSecondary: "rgb(211, 225, 203)",
    textTertiary: "rgb(164, 184, 148)",

    // Status Colors
    success: "#34D399",
    successLight: "#064E3B",
    error: "#F87171",
    errorLight: "#7F1D1D",
    warning: "#FBBF24",
    warningLight: "#78350F",
    info: "#60A5FA",
    infoLight: "#1E3A8A",

    // Interactive Elements
    border: "rgb(62, 85, 51)",
    borderFocus: "rgb(187, 248, 129)",
    placeholder: "rgb(112, 139, 100)",
    disabled: "rgb(87, 105, 71)",

    // Bottom Tab Bar
    tabBarActive: "rgb(177, 248, 129)",
    tabBarInactive: "rgb(117, 139, 100)",
    tabBarBackground: "rgb(43, 59, 30)",

    // Input Fields
    inputBackground: "rgb(41, 59, 30)",
    inputBorder: "rgb(66, 85, 51)",
    inputText: "rgb(244, 249, 241)",

    // Shadows
    shadow: "rgba(0, 0, 0, 0.4)",
  },
};

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

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;

