import { ExpoConfig, ConfigContext } from "@expo/config";

let RESELLER_CONFIG: any = {};

try {
  RESELLER_CONFIG = require("./reseller-config.json");
} catch {
  RESELLER_CONFIG = {
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
    },
  };
}

// Dynamic URLs built from store name
const storeSlug = RESELLER_CONFIG.storeName || "reseller-data";
const baseUrl =
  process.env.EXPO_PUBLIC_BASE_URL || "https://edges-landing-page.vercel.app";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: RESELLER_CONFIG.appName,
  slug: RESELLER_CONFIG.slug,
  version: RESELLER_CONFIG.config?.version || "1.0.0",
  orientation: "portrait",
  icon: RESELLER_CONFIG.assets?.icon || "./assets/images/icon.png",
  scheme: "reseller-data",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,

  android: {
    adaptiveIcon: {
      foregroundImage:
        RESELLER_CONFIG.assets?.adaptiveIcon ||
        "./assets/images/adaptive-icon.png",
      backgroundColor: RESELLER_CONFIG.theme?.background || "#ffffff",
    },
    splash: {
      image: RESELLER_CONFIG.assets?.splash || "./assets/images/splash.png",
      resizeMode: "cover",
      backgroundColor: RESELLER_CONFIG.theme?.primary || "#379114",
    },
    jsEngine: "hermes",
    package: RESELLER_CONFIG.config?.androidPackageName,
    edgeToEdgeEnabled: true,
  },

  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon:
          RESELLER_CONFIG.assets?.icon ||
          "./assets/images/notification-icon.png",
        color: RESELLER_CONFIG.theme?.primary || "#379114",
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  runtimeVersion: {
    policy: "appVersion",
  },

  extra: {
    resellerConfig: {
      ...RESELLER_CONFIG,
      config: {
        ...RESELLER_CONFIG.config,
        apiBaseUrl: baseUrl,
        storeUrl: `${baseUrl}/${storeSlug}`,
      },
    },
    router: {},
    eas: {
      projectId: "bde21e0b-dd38-48b3-a695-ec1b381c3890",
    },
  },
});
