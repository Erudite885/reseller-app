// components/PaymentWebView.tsx
//
// Task 8, pointer 8.k.i. In-app checkout for mobile-money funding.
//
// The fund-wallet function returns a Korapay/Flutterwave checkout URL. That
// URL used to be handed to the OS (WebBrowser.openBrowserAsync), which opened
// a Chrome Custom Tab / Safari sheet — the payer visibly left the app, and on
// some devices landed in the full browser with the app's session lost. This
// sheet keeps the payer inside the app instead: the checkout renders in a
// WebView, and the app watches for the gateway's redirect back to
// /api/payment/callback (constants/paymentReturn.ts) to know the payer is
// done.
//
// The balance is still credited by the gateway's webhook, not here — so
// "returned" means "stop showing checkout", and the caller refreshes the
// wallet afterwards.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { isPaymentReturnUrl, paymentReturnStatus } from "@/constants/paymentReturn";

/** What the gateway sent the payer back with. */
export interface PaymentReturn {
  url: string;
  status: string | null;
}

interface PaymentWebViewProps {
  visible: boolean;
  /** Checkout URL to render. Null while the initiation is still in flight. */
  url: string | null;
  title?: string;
  /**
   * Called once with the return payload when the gateway hands the payer back,
   * or with null when the payer closed the sheet first (the webhook may still
   * complete the deposit).
   */
  onClose: (result: PaymentReturn | null) => void;
}

export function PaymentWebView({
  visible,
  url,
  title = "Complete payment",
  onClose,
}: PaymentWebViewProps) {
  const { colors } = useTheme();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guards against finishing twice: the callback can be seen by both the
  // should-start hook and the navigation-state listener.
  const finishedRef = useRef(false);

  // A fresh checkout (or a fresh open of the sheet) must be able to finish.
  useEffect(() => {
    if (visible) {
      finishedRef.current = false;
      setError(null);
      setLoading(true);
    }
  }, [visible, url]);

  const finish = useCallback(
    (returnUrl: string) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose({ url: returnUrl, status: paymentReturnStatus(returnUrl) });
    },
    [onClose],
  );

  const handleClose = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onClose(null);
  }, [onClose]);

  /**
   * The gateway navigates through hosts it controls (and sometimes the
   * payer's bank), so everything http(s) is allowed; the app's own callback is
   * the one URL we stop on. Any other scheme is handed to the OS so `tel:` /
   * USSD links still work, without the checkout leaving the app.
   */
  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      const target = request.url;
      if (!target) return false;

      if (isPaymentReturnUrl(target)) {
        finish(target);
        return false;
      }

      if (/^https?:/i.test(target) || target === "about:blank") return true;

      Linking.openURL(target).catch(() => {
        // Nothing can handle it; keep the checkout open rather than blanking.
      });
      return false;
    },
    [finish],
  );

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  const openExternally = useCallback(() => {
    if (url) Linking.openURL(url).catch(() => {});
  }, [url]);

  // Android back closes the sheet rather than the app (onRequestClose below);
  // this keeps the header's own X consistent with it.
  const handleRequestClose = useCallback(() => {
    handleClose();
  }, [handleClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleRequestClose}
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                fontWeight: Typography.weights.bold,
                color: colors.text,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.xs,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              Secure checkout
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close checkout"
            hitSlop={12}
            style={{
              width: 36,
              height: 36,
              borderRadius: Radius.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.backgroundSecondary,
            }}
          >
            <Text style={{ fontSize: 18, color: colors.text }}>✕</Text>
          </Pressable>
        </View>

        {error ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: Spacing.xl,
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: Spacing.md }}>⚠️</Text>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
                textAlign: "center",
                marginBottom: Spacing.xs,
              }}
            >
              Checkout could not load
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 20,
                marginBottom: Spacing.lg,
              }}
            >
              {error}
            </Text>
            <Pressable
              onPress={retry}
              style={{
                backgroundColor: colors.primary,
                borderRadius: Radius.md,
                paddingHorizontal: Spacing.lg,
                paddingVertical: Spacing.md,
                marginBottom: Spacing.sm,
              }}
            >
              <Text
                style={{
                  color: colors.background,
                  fontWeight: Typography.weights.semibold,
                }}
              >
                Try again
              </Text>
            </Pressable>
            <Pressable onPress={openExternally} hitSlop={8}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: Typography.sizes.sm,
                }}
              >
                Open in browser instead
              </Text>
            </Pressable>
          </View>
        ) : url ? (
          <>
            <WebView
              ref={webRef}
              // Remount per checkout so a second funding starts fresh instead
              // of resuming the previous gateway session.
              key={url}
              source={{ uri: url }}
              originWhitelist={["http://*", "https://*"]}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onNavigationStateChange={(nav) => {
                // Secondary net: some gateways redirect in a way the
                // should-start hook does not see.
                if (nav.url && isPaymentReturnUrl(nav.url)) finish(nav.url);
              }}
              onLoadStart={() => {
                setLoading(true);
                setError(null);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={(event) => {
                setLoading(false);
                setError(
                  event.nativeEvent?.description ||
                    "The payment page could not be reached. Check your connection and try again.",
                );
              }}
              onHttpError={(event) => {
                const code = event.nativeEvent?.statusCode;
                // A gateway may still recover from a transient 5xx; only treat
                // a failed top-level load as fatal.
                if (code && code >= 500) {
                  setLoading(false);
                  setError(`The payment page returned an error (${code}).`);
                }
              }}
              // Gateways that use window.open would otherwise hand the payer to
              // a new browser window; keep those navigations in this WebView.
              setSupportMultipleWindows={false}
              // Gateways set their own session cookies during the redirects.
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
              style={{ flex: 1, backgroundColor: colors.background }}
            />
            {loading && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.background,
                }}
                pointerEvents="none"
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{
                    marginTop: Spacing.md,
                    color: colors.textSecondary,
                    fontSize: Typography.sizes.sm,
                  }}
                >
                  Loading secure checkout…
                </Text>
              </View>
            )}
          </>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
