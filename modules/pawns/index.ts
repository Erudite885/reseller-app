// modules/pawns/index.ts
import { NativeEventEmitter, NativeModules, Platform } from "react-native";

const { PawnsModule } = NativeModules;

// Only create emitter on Android where the module exists
const pawnsEmitter =
  Platform.OS === "android" && PawnsModule
    ? new NativeEventEmitter(PawnsModule)
    : null;

export type ServiceState =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTING"
  | "ERROR";

export interface PawnsServiceConfig {
  title: string;
  body: string;
  channelName?: string;
}

const PawnsSDK = {
  /**
   * Initialize the Pawns SDK. Call this once when the user is logged in.
   * Must be called before startSharing().
   */
  initialize: async (
    apiKey: string,
    serviceConfig: PawnsServiceConfig,
  ): Promise<boolean> => {
    if (Platform.OS !== "android" || !PawnsModule) return false;
    return PawnsModule.initialize(apiKey, serviceConfig);
  },

  /**
   * Start bandwidth sharing (foreground service).
   * Only works if consent has been given.
   */
  startSharing: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !PawnsModule) return false;
    return PawnsModule.startSharing();
  },

  /**
   * Stop bandwidth sharing.
   */
  stopSharing: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !PawnsModule) return false;
    return PawnsModule.stopSharing();
  },

  /**
   * Check if the user has already given consent.
   */
  isConsentGiven: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !PawnsModule) return false;
    return PawnsModule.isConsentGiven();
  },

  /**
   * Record user's consent decision.
   * Passing false will also stop sharing immediately.
   */
  setConsentGiven: async (given: boolean): Promise<boolean> => {
    if (Platform.OS !== "android" || !PawnsModule) return false;
    return PawnsModule.setConsentGiven(given);
  },

  /**
   * Get the current service state snapshot.
   */
  getServiceState: async (): Promise<ServiceState> => {
    if (Platform.OS !== "android" || !PawnsModule) return "IDLE";
    return PawnsModule.getServiceState();
  },

  /**
   * Request battery optimisation exemption (opens Android system settings).
   * Recommended for manufacturers like Xiaomi, Honor, etc.
   */
  requestBatteryOptimizationExemption: () => {
    if (Platform.OS !== "android" || !PawnsModule) return;
    PawnsModule.requestBatteryOptimizationExemption();
  },

  /**
   * Listen for service state changes.
   * Returns an unsubscribe function — call it on component unmount.
   */
  onStateChange: (callback: (state: ServiceState) => void): (() => void) => {
    if (!pawnsEmitter) return () => {};
    const subscription = pawnsEmitter.addListener("PawnsStateChange", callback);
    return () => subscription.remove();
  },
};

export default PawnsSDK;
