// hooks/usePawns.ts
import PawnsSDK, { ServiceState } from "@/modules/pawns";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

const API_KEY = process.env.EXPO_PUBLIC_PAWNS_API_KEY ?? "";

const SERVICE_CONFIG = {
  title: "Bandwidth Sharing Active",
  body: "You are earning rewards by sharing unused bandwidth.",
  channelName: "Bandwidth Sharing",
};

export function usePawns() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [serviceState, setServiceState] = useState<ServiceState>("IDLE");
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  // ─── Initialize SDK & load stored state ──────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "android") {
      setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    async function init() {
      try {
        // Initialize the native SDK
        await PawnsSDK.initialize(API_KEY, SERVICE_CONFIG);
        setIsInitialized(true);

        // Check existing consent
        const consent = await PawnsSDK.isConsentGiven();
        setConsentGiven(consent);

        // Check current service state
        const state = await PawnsSDK.getServiceState();
        setServiceState(state as ServiceState);
        setIsSharing(state === "CONNECTED" || state === "CONNECTING");

        // Subscribe to state changes
        unsubscribe = PawnsSDK.onStateChange((state) => {
          setServiceState(state);
          setIsSharing(state === "CONNECTED" || state === "CONNECTING");
        });
      } catch (e) {
        console.error("[Pawns] Init error:", e);
      } finally {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      unsubscribe?.();
    };
  }, []);

  // ─── Handle app going to background/foreground ───────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // App came to foreground — refresh state
        try {
          const state = await PawnsSDK.getServiceState();
          setServiceState(state as ServiceState);
          setIsSharing(state === "CONNECTED" || state === "CONNECTING");
        } catch {}
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // ─── Grant consent and optionally start sharing ───────────────────────────
  const grantConsent = useCallback(async () => {
    if (!isInitialized) return false;
    try {
      await PawnsSDK.setConsentGiven(true);
      setConsentGiven(true);
      // Auto-start sharing after consent
      await PawnsSDK.startSharing();
      return true;
    } catch (e) {
      console.error("[Pawns] grantConsent error:", e);
      return false;
    }
  }, [isInitialized]);

  // ─── Revoke consent (opt-out toggle) ─────────────────────────────────────
  const revokeConsent = useCallback(async () => {
    if (!isInitialized) return false;
    try {
      // setConsentGiven(false) also stops sharing inside the native module
      await PawnsSDK.setConsentGiven(false);
      setConsentGiven(false);
      setIsSharing(false);
      return true;
    } catch (e) {
      console.error("[Pawns] revokeConsent error:", e);
      return false;
    }
  }, [isInitialized]);

  // ─── Toggle sharing on/off (for users who already consented) ─────────────
  const toggleSharing = useCallback(
    async (enable: boolean) => {
      if (!isInitialized || !consentGiven) return false;
      try {
        if (enable) {
          await PawnsSDK.startSharing();
        } else {
          await PawnsSDK.stopSharing();
        }
        return true;
      } catch (e) {
        console.error("[Pawns] toggleSharing error:", e);
        return false;
      }
    },
    [isInitialized, consentGiven],
  );

  // ─── Request battery optimisation exemption ───────────────────────────────
  const requestBatteryExemption = useCallback(() => {
    PawnsSDK.requestBatteryOptimizationExemption();
  }, []);

  return {
    isInitialized,
    consentGiven,
    isSharing,
    serviceState,
    isLoading,
    grantConsent,
    revokeConsent,
    toggleSharing,
    requestBatteryExemption,
  };
}
