// constants/Colors.ts

import { useResellerStore } from "@/store/resellerStore";

// ─── Color Utilities ─────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const num = parseInt(hex.replace("#", ""), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  return `#${((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, "0")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const red = r / 255, green = g / 255, blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case red:   h = ((green - blue) / d + (green < blue ? 6 : 0)) / 6; break;
      case green: h = ((blue - red) / d + 2) / 6; break;
      case blue:  h = ((red - green) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function getPrimary(): string {
  try {
    return useResellerStore.getState().config.theme.primary;
  } catch {
    return "#379114";
  }
}

// Derive a color from primary: keep hue, adjust saturation & lightness
function deriveFromPrimary(saturationFactor: number, lightness: number): string {
  const [r, g, b] = hexToRgb(getPrimary());
  const [h, s] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb(h, s * saturationFactor, lightness);
  return rgbToHex(nr, ng, nb);
}

// ─── Exports ────────────────────────────────────────

export const Colors = {
  light: {
    // Dynamic — derived from reseller's primary
    get primary() { return getPrimary(); },
    get primaryDark() { return deriveFromPrimary(1, 0.25); },      // Darker version
    get primaryLight() { return deriveFromPrimary(0.8, 0.85); },   // Lighter version
    get secondary() { return deriveFromPrimary(0.9, 0.45); },
    get accent() { return getPrimary(); },
    get tabBarActive() { return getPrimary(); },
    get borderFocus() { return deriveFromPrimary(0.3, 0.9); },

    // Static neutrals
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
    placeholder: "#9CA3AF",
    disabled: "#D1D5DB",
    tabBarInactive: "#9CA3AF",
    tabBarBackground: "#FFFFFF",
    inputBackground: "#F9FAFB",
    inputBorder: "#E5E7EB",
    inputText: "rgb(11, 20, 3)",
    shadow: "rgba(0, 0, 0, 0.1)",
  },

  dark: {
    // Same dynamic accents as light mode
    get primary() { return getPrimary(); },
    get primaryDark() { return deriveFromPrimary(1, 0.25); },
    get primaryLight() { return deriveFromPrimary(0.8, 0.85); },
    get secondary() { return deriveFromPrimary(0.9, 0.45); },
    get accent() { return getPrimary(); },
    get tabBarActive() { return getPrimary(); },
    get borderFocus() { return deriveFromPrimary(0.3, 0.9); },

    // Dark backgrounds — derived from reseller's hue, barely saturated
    get background() { return deriveFromPrimary(0.1, 0.06); },        // Near black, subtle brand tint
    get backgroundSecondary() { return deriveFromPrimary(0.08, 0.10); },
    get backgroundTertiary() { return deriveFromPrimary(0.06, 0.14); },
    get card() { return deriveFromPrimary(0.08, 0.10); },
    get cardBorder() { return deriveFromPrimary(0.05, 0.16); },

    // Text — light neutrals
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
    get border() { return deriveFromPrimary(0.05, 0.18); },
    get placeholder() { return deriveFromPrimary(0.1, 0.35); },
    get disabled() { return deriveFromPrimary(0.08, 0.25); },
    get tabBarInactive() { return deriveFromPrimary(0.1, 0.35); },
    get tabBarBackground() { return deriveFromPrimary(0.08, 0.10); },
    get inputBackground() { return deriveFromPrimary(0.05, 0.12); },
    get inputBorder() { return deriveFromPrimary(0.05, 0.18); },
    inputText: "rgb(244, 249, 241)",
    shadow: "rgba(0, 0, 0, 0.4)",
  },
};

// Keep the rest unchanged
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

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

// // constants/Colors.ts

// import { useResellerStore } from "@/store/resellerStore";

// // ─── Color Utilities ─────────────────────────────────
// function hexToRgb(hex: string): [number, number, number] {
//   const num = parseInt(hex.replace("#", ""), 16);
//   return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
// }

// function rgbToHex(r: number, g: number, b: number): string {
//   const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
//   return `#${((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, "0")}`;
// }

// function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
//   const red = r / 255, green = g / 255, blue = b / 255;
//   const max = Math.max(red, green, blue);
//   const min = Math.min(red, green, blue);
//   let h = 0, s = 0;
//   const l = (max + min) / 2;

//   if (max !== min) {
//     const d = max - min;
//     s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
//     switch (max) {
//       case red:   h = ((green - blue) / d + (green < blue ? 6 : 0)) / 6; break;
//       case green: h = ((blue - red) / d + 2) / 6; break;
//       case blue:  h = ((red - green) / d + 4) / 6; break;
//     }
//   }
//   return [h, s, l];
// }

// function hslToRgb(h: number, s: number, l: number): [number, number, number] {
//   let r: number, g: number, b: number;

//   if (s === 0) {
//     r = g = b = l;
//   } else {
//     const hue2rgb = (p: number, q: number, t: number): number => {
//       if (t < 0) t += 1;
//       if (t > 1) t -= 1;
//       if (t < 1/6) return p + (q - p) * 6 * t;
//       if (t < 1/2) return q;
//       if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
//       return p;
//     };
//     const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
//     const p = 2 * l - q;
//     r = hue2rgb(p, q, h + 1/3);
//     g = hue2rgb(p, q, h);
//     b = hue2rgb(p, q, h - 1/3);
//   }
//   return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
// }

// /**
//  * Adjust the lightness of a hex color in HSL space.
//  * factor < 1 = darker, factor > 1 = lighter
//  */
// function adjustLightness(hex: string, factor: number): string {
//   const [r, g, b] = hexToRgb(hex);
//   const [h, s, l] = rgbToHsl(r, g, b);
//   const newL = Math.max(0, Math.min(1, l * factor));
//   const [nr, ng, nb] = hslToRgb(h, s, newL);
//   return rgbToHex(nr, ng, nb);
// }

// /** Perceived brightness for status bar decision */
// function getBrightness(hex: string): number {
//   const [r, g, b] = hexToRgb(hex);
//   return (r * 299 + g * 587 + b * 114) / 1000;
// }

// // ─── Theme Getters ──────────────────────────────────
// function getPrimary(): string {
//   try {
//     return useResellerStore.getState().config.theme.primary;
//   } catch {
//     return "#379114";
//   }
// }

// function getPrimaryDark(): string {
//   return adjustLightness(getPrimary(), 0.55);
// }

// function getPrimaryLight(): string {
//   return adjustLightness(getPrimary(), 1.35);
// }

// // ─── Colors Export ──────────────────────────────────
// export const Colors = {
//   light: {
//     get primary() { return getPrimary(); },
//     get primaryDark() { return getPrimaryDark(); },
//     get primaryLight() { return getPrimaryLight(); },
//     // Dynamic secondary/accent derived from primary
//     get secondary() { return adjustLightness(getPrimary(), 0.85); },
//     get accent() { return getPrimary(); },
//     get tabBarActive() { return getPrimary(); },
//     get borderFocus() { return getPrimaryLight(); },

//     // Rest stays static (neutral tones)
//     background: "#ffffffff",
//     backgroundSecondary: "rgb(250, 251, 249)",
//     backgroundTertiary: "rgb(244, 246, 243)",
//     card: "#ffffffff",
//     cardBorder: "rgb(231, 235, 229)",
//     text: "rgb(11, 26, 3)",
//     textSecondary: "rgb(112, 141, 100)",
//     textTertiary: "rgb(166, 175, 160)",
//     success: "#10B981",
//     successLight: "#D1FAE5",
//     error: "#EF4444",
//     errorLight: "#FEE2E2",
//     warning: "#F59E0B",
//     warningLight: "#FEF3C7",
//     info: "#3B82F6",
//     infoLight: "#DBEAFE",
//     border: "#E5E7EB",
//     placeholder: "#9CA3AF",
//     disabled: "#D1D5DB",
//     tabBarInactive: "#9CA3AF",
//     tabBarBackground: "#FFFFFF",
//     inputBackground: "#F9FAFB",
//     inputBorder: "#E5E7EB",
//     inputText: "rgb(11, 20, 3)",
//     shadow: "rgba(0, 0, 0, 0.1)",
//   },

//   dark: {
//     get primary() { return getPrimary(); },
//     get primaryDark() { return getPrimaryDark(); },
//     get primaryLight() { return getPrimaryLight(); },
//     get secondary() { return adjustLightness(getPrimary(), 0.85); },
//     get accent() { return getPrimary(); },
//     get tabBarActive() { return getPrimary(); },
//     get borderFocus() { return getPrimaryLight(); },

//     background: "rgb(27, 42, 15)",
//     backgroundSecondary: "rgb(45, 59, 30)",
//     backgroundTertiary: "rgb(63, 85, 51)",
//     card: "rgb(41, 59, 30)",
//     cardBorder: "rgb(62, 85, 51)",
//     text: "rgb(243, 249, 241)",
//     textSecondary: "rgb(211, 225, 203)",
//     textTertiary: "rgb(164, 184, 148)",
//     success: "#34D399",
//     successLight: "#064E3B",
//     error: "#F87171",
//     errorLight: "#7F1D1D",
//     warning: "#FBBF24",
//     warningLight: "#78350F",
//     info: "#60A5FA",
//     infoLight: "#1E3A8A",
//     border: "rgb(62, 85, 51)",
//     placeholder: "rgb(112, 139, 100)",
//     disabled: "rgb(87, 105, 71)",
//     tabBarInactive: "rgb(117, 139, 100)",
//     tabBarBackground: "rgb(43, 59, 30)",
//     inputBackground: "rgb(41, 59, 30)",
//     inputBorder: "rgb(66, 85, 51)",
//     inputText: "rgb(244, 249, 241)",
//     shadow: "rgba(0, 0, 0, 0.4)",
//   },
// };

// // Spacing Scale
// export const Spacing = {
//   xs: 4,
//   sm: 8,
//   md: 16,
//   lg: 24,
//   xl: 32,
//   xxl: 48,
// };

// // Border Radius Scale
// export const Radius = {
//   xs: 4,
//   sm: 8,
//   md: 12,
//   lg: 16,
//   xl: 24,
//   full: 9999,
// };

// // Typography Scale
// export const Typography = {
//   sizes: {
//     xs: 12,
//     sm: 14,
//     base: 16,
//     lg: 18,
//     xl: 20,
//     xxl: 24,
//     xxxl: 32,
//   },
//   weights: {
//     regular: '400' as const,
//     medium: '500' as const,
//     semibold: '600' as const,
//     bold: '700' as const,
//   },
//   lineHeights: {
//     tight: 1.2,
//     normal: 1.5,
//     relaxed: 1.75,
//   },
// };

// // Shadow Presets
// export const Shadows = {
//   sm: {
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 1,
//   },
//   md: {
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   lg: {
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 8,
//     elevation: 5,
//   },
// };

// // // Keep Spacing, Radius, Typography, Shadows unchanged...
// // export const Spacing = { /* ... same as before ... */ };
// // export const Radius = { /* ... same as before ... */ };
// // export const Typography = { /* ... same as before ... */ };
// // export const Shadows = { /* ... same as before ... */ };

// // import { useResellerStore } from "@/store/resellerStore";

// // function getPrimary(): string {
// //   try {
// //     return useResellerStore.getState().config.theme.primary;
// //   } catch {
// //     return "#379114";
// //   }
// // }

// // function getPrimaryDark(): string {
// //   const primary = getPrimary();
// //   // Darken the primary color by ~30%
// //   return adjustColor(primary, -30);
// // }

// // function getPrimaryLight(): string {
// //   const primary = getPrimary();
// //   // Lighten by ~60%
// //   return adjustColor(primary, 60);
// // }

// // // Simple color adjuster
// // function adjustColor(hex: string, amount: number): string {
// //   const num = parseInt(hex.replace("#", ""), 16);
// //   const r = Math.min(255, Math.max(0, (num >> 16) + amount));
// //   const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
// //   const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
// //   return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
// // }

// // export const Colors = {
// //   light: {
// //     // Primary Brand Colors — DYNAMIC
// //     get primary() {
// //       return getPrimary();
// //     },
// //     get primaryDark() {
// //       return getPrimaryDark();
// //     },
// //     get primaryLight() {
// //       return getPrimaryLight();
// //     },

// //     // Rest stays the same...
// //     background: "#ffffffff",
// //     backgroundSecondary: "rgb(250, 251, 249)",
// //     backgroundTertiary: "rgb(244, 246, 243)",
// //     card: "#ffffffff",
// //     cardBorder: "rgb(231, 235, 229)",
// //     text: "rgb(11, 26, 3)",
// //     textSecondary: "rgb(112, 141, 100)",
// //     textTertiary: "rgb(166, 175, 160)",
// //     success: "#10B981",
// //     successLight: "#D1FAE5",
// //     error: "#EF4444",
// //     errorLight: "#FEE2E2",
// //     warning: "#F59E0B",
// //     warningLight: "#FEF3C7",
// //     info: "#3B82F6",
// //     infoLight: "#DBEAFE",
// //     border: "#E5E7EB",
// //     get borderFocus() {
// //       return getPrimaryLight();
// //     },
// //     placeholder: "#9CA3AF",
// //     disabled: "#D1D5DB",
// //     get tabBarActive() {
// //       return getPrimary();
// //     },
// //     tabBarInactive: "#9CA3AF",
// //     tabBarBackground: "#FFFFFF",
// //     inputBackground: "#F9FAFB",
// //     inputBorder: "#E5E7EB",
// //     inputText: "rgb(11, 20, 3)",
// //     shadow: "rgba(0, 0, 0, 0.1)",
// //   },

// //   dark: {
// //     get primary() {
// //       return getPrimary();
// //     },
// //     get primaryDark() {
// //       return getPrimaryDark();
// //     },
// //     get primaryLight() {
// //       return getPrimaryLight();
// //     },

// //     background: "rgb(27, 42, 15)",
// //     backgroundSecondary: "rgb(45, 59, 30)",
// //     backgroundTertiary: "rgb(63, 85, 51)",
// //     card: "rgb(41, 59, 30)",
// //     cardBorder: "rgb(62, 85, 51)",
// //     text: "rgb(243, 249, 241)",
// //     textSecondary: "rgb(211, 225, 203)",
// //     textTertiary: "rgb(164, 184, 148)",
// //     success: "#34D399",
// //     successLight: "#064E3B",
// //     error: "#F87171",
// //     errorLight: "#7F1D1D",
// //     warning: "#FBBF24",
// //     warningLight: "#78350F",
// //     info: "#60A5FA",
// //     infoLight: "#1E3A8A",
// //     border: "rgb(62, 85, 51)",
// //     get borderFocus() {
// //       return getPrimaryLight();
// //     },
// //     placeholder: "rgb(112, 139, 100)",
// //     disabled: "rgb(87, 105, 71)",
// //     get tabBarActive() {
// //       return getPrimary();
// //     },
// //     tabBarInactive: "rgb(117, 139, 100)",
// //     tabBarBackground: "rgb(43, 59, 30)",
// //     inputBackground: "rgb(41, 59, 30)",
// //     inputBorder: "rgb(66, 85, 51)",
// //     inputText: "rgb(244, 249, 241)",
// //     shadow: "rgba(0, 0, 0, 0.4)",
// //   },
// // };

// // Keep the rest of the file unchanged:
// // Spacing, Radius, Typography, Shadows, ColorScheme, ThemeColors



// // export type ColorScheme = 'light' | 'dark';
// // export type ThemeColors = typeof Colors.light;

