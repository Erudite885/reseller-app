import { create } from "zustand";
import Constants from "expo-constants";

export interface ResellerTheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  statusBar: "light" | "dark";
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
