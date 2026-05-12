import { create } from "zustand";
import Constants from "expo-constants";

export interface ResellerTheme {
  primary: string;
  secondary?: string;
  background?: string;
  text?: string;
  accent?: string;
  statusBar?: "light" | "dark";
}

export interface ResellerAssets {
  icon: string;
  splash: string;
  logo: string;
  adaptiveIcon: string;
}

export interface ResellerAppConfig {
  androidPackageName: string;
  version: string;
  buildNumber: number;
  apiBaseUrl: string;
  storeUrl: string;
}

export interface ResellerConfig {
  appName: string;
  slug: string;
  storeName: string;
  theme: ResellerTheme;
  assets: ResellerAssets;
  config: ResellerAppConfig;
}

interface ResellerState {
  config: ResellerConfig;
  apiBaseUrl: string;
  storeUrl: string;
}

// Default fallback for local development
const defaultConfig: ResellerConfig = {
  appName: "Reseller Data",
  slug: "reseller-data",
  storeName: "reseller-data",
  theme: {
    primary: "#379114",
    secondary: "#234D0B",
    background: "#FFFFFF",
    text: "#0B1A03",
    accent: "#379114",
    statusBar: "dark",
  },
  assets: {
    icon: "./assets/images/icon.png",
    splash: "./assets/images/splash.png",
    logo: "./assets/images/logo2.png",
    adaptiveIcon: "./assets/images/adaptive-icon.png",
  },
  config: {
    androidPackageName: "com.resellerdata.app",
    version: "1.0.0",
    buildNumber: 1,
    apiBaseUrl: "http://localhost:3000",
    storeUrl: "http://localhost:3000/reseller-data",
  },
};

// Read from Expo constants (set at build time by app.config.ts)
const extraConfig = (Constants.expoConfig?.extra as any)?.resellerConfig;

export const useResellerStore = create<ResellerState>(() => ({
  config: extraConfig || defaultConfig,
  apiBaseUrl:
    extraConfig?.config?.apiBaseUrl || defaultConfig.config.apiBaseUrl,
  storeUrl: extraConfig?.config?.storeUrl || defaultConfig.config.storeUrl,
}));

// Add at the bottom of store/resellerStore.ts

/**
 * Get asset source for a given asset type.
 * Handles the static require() limitation of React Native.
 */
const ASSET_MAP: Record<string, any> = {
  "./assets/images/icon.png": require("@/assets/images/icon.png"),
  "./assets/images/splash.png": require("@/assets/images/splash.png"),
  "./assets/images/logo2.png": require("@/assets/images/logo2.png"),
  "./assets/images/adaptive-icon.png": require("@/assets/images/adaptive-icon.png"),
  "./assets/images/notification-icon.png": require("@/assets/images/icon.png"),
  // "./assets/custom/icon.png": require("@/assets/custom/icon.png"),
  // "./assets/custom/splash.png": require("@/assets/custom/splash.png"),
  // "./assets/custom/adaptive-icon.png": require("@/assets/custom/adaptive-icon.png"),
};

// Custom reseller assets - only available in APK builds, not OTA
try { ASSET_MAP["./assets/custom/icon.png"] = require("@/assets/custom/icon.png"); } catch {}
try { ASSET_MAP["./assets/custom/splash.png"] = require("@/assets/custom/splash.png"); } catch {}
try { ASSET_MAP["./assets/custom/adaptive-icon.png"] = require("@/assets/custom/adaptive-icon.png"); } catch {}

export function getResellerAsset(
  assetType: "icon" | "splash" | "logo" | "adaptiveIcon",
): any {
  try {
    const config = useResellerStore.getState().config;
    const assetPath = config.assets?.[assetType];

    if (assetPath && ASSET_MAP[assetPath]) {
      return ASSET_MAP[assetPath];
    }
  } catch {
    // Fall through to defaults
  }

  // Fallback defaults
  const defaults: Record<string, any> = {
    icon: require("@/assets/images/icon.png"),
    splash: require("@/assets/images/splash.png"),
    logo: require("@/assets/images/logo2.png"),
    adaptiveIcon: require("@/assets/images/adaptive-icon.png"),
  };

  return defaults[assetType];
}