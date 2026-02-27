// ============================================
// hooks/useTheme.ts
// ============================================

import { useColorScheme } from "react-native";
import {
  Colors,
  Shadows,
  type ThemeColors,
  type ColorScheme,
} from "@/constants/Colors";

export const useTheme = () => {
  const systemColorScheme = useColorScheme() as ColorScheme;
  const colorScheme = systemColorScheme ?? "light";

  const colors: ThemeColors = Colors[colorScheme];
  const isDark = colorScheme === "dark";

  return {
    colors,
    isDark,
    colorScheme,
    shadows: Shadows,
  };
};
