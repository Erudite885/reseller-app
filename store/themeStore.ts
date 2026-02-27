// ============================================
// stores/themeStore.ts
// ============================================

import { create } from "zustand";
import { ColorScheme } from "@/constants/Colors";

interface ThemeStore {
  theme: ColorScheme | "system";
  setTheme: (theme: ColorScheme | "system") => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
}));
