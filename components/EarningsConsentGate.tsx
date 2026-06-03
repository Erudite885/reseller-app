// components/EarningsConsentGate.tsx

import React, { useState, useCallback, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/hooks/useTheme";
import { useResellerStore } from "@/store/resellerStore";
import { initialize, optIn, start } from "@/module/pawns";

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const CONSENT_STORAGE_KEY = "@app_pawns_consent_decision";
export const CONSENT_SUPPRESS_KEY = "@app_pawns_suppress_modal";
const CONSENT_DECISION_ACCEPTED = "accepted";

// ─── External URLs (only for third-party SDK) ─────────────────────────────────

const PAWNS_PRIVACY_URL = "https://pawns.app/privacy-policy";
const PAWNS_ACCEPTABLE_USE_URL = "https://pawns.app/acceptable-use-policy";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = ["General", "Privacy", "Data Protection", "Data Sharing"] as const;
type Tab = (typeof TABS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label: string | React.ReactNode;
  testID?: string;
  colors: any;
  isDark: boolean;
}

function Checkbox({
  checked,
  onPress,
  label,
  testID,
  colors,
  isDark,
}: CheckboxProps) {
  return (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      testID={testID}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkboxBox,
          {
            borderColor: colors.primary,
            backgroundColor: colors.card,
          },
          checked && {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          },
        ]}
      >
        {checked && (
          <Text style={[styles.checkboxTick, { color: "#FFFFFF" }]}>✓</Text>
        )}
      </View>
      {typeof label === "string" ? (
        <Text style={[styles.checkboxLabel, { color: colors.text }]}>
          {label}
        </Text>
      ) : (
        <View style={styles.checkboxLabelWrap}>{label}</View>
      )}
    </TouchableOpacity>
  );
}

// ─── LinkText for external links ─────────────────────────────────────────────────

function ExternalLinkText({
  children,
  url,
  colors,
}: {
  children: React.ReactNode;
  url: string;
  colors: any;
}) {
  return (
    <Text
      style={[styles.link, { color: colors.primary }]}
      onPress={() => openUrl(url)}
      accessibilityRole="link"
    >
      {children}
    </Text>
  );
}

// ─── Internal Link Text ─────────────────────────────────────────────────────────

function InternalLinkText({
  children,
  route,
  colors,
  router,
}: {
  children: React.ReactNode;
  route: string;
  colors: any;
  router: any;
}) {
  return (
    <Text
      style={[styles.link, { color: colors.primary }]}
      onPress={() => router.push(route)}
      accessibilityRole="link"
    >
      {children}
    </Text>
  );
}

// ─── Tab 1 — General ─────────────────────────────────────────────────────────

function GeneralTab({ colors, storeName }: { colors: any; storeName: string }) {
  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Welcome to {storeName}
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        {storeName} is your all-in-one data and utility payment destination.
        Discover, purchase, and manage data bundles and utility services — all
        in one beautifully designed app.
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        Whether you're looking for affordable data plans, airtime top-ups, or
        utility bill payments, {storeName} puts the services that matter to you
        front and centre — fast transactions, secure payments, and personalised
        recommendations that get smarter over time.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Fast & Secure Payments
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        Pay securely using PalmPay or your wallet balance. Track your spending,
        view transaction history, and manage your account all from one place.
        Your transactions are protected with industry-standard security.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Built for Everyone
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        {storeName} is designed for both individuals and businesses. Purchase
        data bundles for yourself, buy for friends and family, or manage bulk
        purchases for your organisation. Track usage, set spending limits, and
        get real-time notifications for every transaction.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Always Your Choice
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        Certain optional features within {storeName} — such as the earnings
        programme — require your explicit consent before they activate. You are
        in full control at all times. Any feature you enable can be turned off
        at any moment from{" "}
        <Text style={[styles.emphasis, { color: colors.text }]}>
          Settings → Security → Bandwidth Sharing
        </Text>
        .
      </Text>
    </ScrollView>
  );
}

// ─── Tab 2 — Privacy ─────────────────────────────────────────────────────────

function PrivacyTab({
  colors,
  router,
  storeName,
}: {
  colors: any;
  router: any;
  storeName: string;
}) {
  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {storeName} Privacy
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        {storeName} is committed to protecting your personal data. By enabling
        this feature you confirm you have read and agree to {storeName}'s legal
        documentation:
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}
        <InternalLinkText
          route="/(app)/(legal)/privacy"
          colors={colors}
          router={router}
        >
          Privacy Policy
        </InternalLinkText>
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}
        <InternalLinkText
          route="/(app)/(legal)/terms"
          colors={colors}
          router={router}
        >
          Terms & Conditions
        </InternalLinkText>
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Third-Party SDK Privacy
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        The bandwidth sharing feature uses a third-party SDK with its own
        independent privacy policies. Enabling this feature also means you agree
        to those policies. Full technical disclosures are on the{" "}
        <Text style={[styles.emphasis, { color: colors.text }]}>
          Data Sharing
        </Text>{" "}
        tab.
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}
        <ExternalLinkText url={PAWNS_PRIVACY_URL} colors={colors}>
          Pawns Privacy Policy
        </ExternalLinkText>
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}
        <ExternalLinkText url={PAWNS_ACCEPTABLE_USE_URL} colors={colors}>
          Pawns Acceptable Use Policy
        </ExternalLinkText>
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        The SDK may collect device identifiers, IP addresses, and bandwidth
        usage statistics as described in the Pawns Privacy Policy. {storeName}{" "}
        does not receive or store this data.
      </Text>
    </ScrollView>
  );
}

// ─── Tab 3 — Data Protection ─────────────────────────────────────────────────

function DataProtectionTab({
  colors,
  storeName,
}: {
  colors: any;
  storeName: string;
}) {
  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Encryption in Transit
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        All traffic passing through your device while the earnings feature is
        active is fully encrypted using industry-standard TLS protocols.{" "}
        {storeName} never has access to the contents of this traffic — and
        neither does anyone on your local network.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        On-Device Data Security
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        Your consent decision and its timestamp are stored securely on your
        device using Android's SharedPreferences and React Native's
        AsyncStorage. This data never leaves your device and is never
        transmitted to {storeName}'s servers or any third party.
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        Consent records are retained on-device for 24 months from each event
        date to support legal compliance and let you audit your consent history
        at any time from within the app.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        No Personal Data Sold
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        {storeName} does not sell, rent, or share your personal information with
        advertisers or data brokers. Your account data, transaction history, and
        device identifiers held by {storeName} are kept strictly separate from
        the bandwidth sharing feature.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Your Rights
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        Depending on your jurisdiction, you may have the right to:
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}Access the personal data {storeName} holds about you
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}Request correction of inaccurate data
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}Request erasure of your data
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}Object to or restrict processing
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}Withdraw consent at any time without penalty
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        To exercise rights regarding {storeName}'s data, see our{" "}
        <InternalLinkText
          route="/(app)/(legal)/privacy"
          colors={colors}
          router={useRouter()}
        >
          Privacy Policy
        </InternalLinkText>
        . For rights regarding Pawns data, contact Pawns via their{" "}
        <ExternalLinkText url={PAWNS_PRIVACY_URL} colors={colors}>
          Privacy Policy
        </ExternalLinkText>
        .
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Data Protection Contact
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        For any data protection enquiry relating to {storeName}, use the contact
        details in our{" "}
        <InternalLinkText
          route="/(app)/(legal)/privacy"
          colors={colors}
          router={useRouter()}
        >
          Privacy Policy
        </InternalLinkText>
        .
      </Text>
    </ScrollView>
  );
}

// ─── Tab 4 — Data Sharing ────────────────────────────────────────────────────

function DataSharingTab({
  colors,
  storeName,
}: {
  colors: any;
  storeName: string;
}) {
  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Powered by Pawns
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        {storeName}'s bandwidth sharing feature is powered entirely by the Pawns
        SDK. Pawns connects devices sharing idle bandwidth with businesses that
        need distributed network infrastructure. The disclosures below are
        required by Pawns SDK Terms §3.6.5.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Required Disclosures (Pawns SDK §3.6.5)
      </Text>

      <Text style={[styles.disclosureLabel, { color: colors.primary }]}>
        a) Internet Traffic Routing
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        When enabled, your device acts as a network node in the Pawns network.
        Internet traffic from Pawns' third-party customers is routed through
        your device and your internet connection. This routing is how rewards
        are generated.
      </Text>

      <Text style={[styles.disclosureLabel, { color: colors.primary }]}>
        b) Resource Consumption
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        The Pawns service consumes device resources including internet
        bandwidth, battery, and processing capacity. It operates at low priority
        to minimise impact, but some resource usage will occur while active.
      </Text>

      <Text style={[styles.disclosureLabel, { color: colors.primary }]}>
        c) IP Address Visibility
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        Your device's IP address will be visible to the Pawns network during
        sharing sessions. This is an inherent property of acting as a network
        node. See the{" "}
        <ExternalLinkText url={PAWNS_PRIVACY_URL} colors={colors}>
          Pawns Privacy Policy
        </ExternalLinkText>{" "}
        for details on how this is handled.
      </Text>

      <Text style={[styles.disclosureLabel, { color: colors.primary }]}>
        d) Eligibility Requirements
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        You must be the primary user of this device and the primary account
        holder of the internet connection used. You must be at least 18 years of
        age. Review your internet service provider's terms to confirm
        participation is permitted under your plan.
      </Text>

      <Text style={[styles.disclosureLabel, { color: colors.primary }]}>
        e) How to Disable
      </Text>
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
        Stop sharing at any time via{" "}
        <Text style={[styles.emphasis, { color: colors.text }]}>
          Settings → Security → Bandwidth Sharing
        </Text>
        . The Pawns background service stops immediately and consent is revoked.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Pawns Policies
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}
        <ExternalLinkText url={PAWNS_PRIVACY_URL} colors={colors}>
          Pawns Privacy Policy
        </ExternalLinkText>
      </Text>
      <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
        {"•  "}
        <ExternalLinkText url={PAWNS_ACCEPTABLE_USE_URL} colors={colors}>
          Pawns Acceptable Use Policy
        </ExternalLinkText>
      </Text>
    </ScrollView>
  );
}

// ─── Check helpers ────────────────────────────────────────────────────────────

export async function checkAndShowConsent(): Promise<boolean> {
  try {
    const suppressed = await AsyncStorage.getItem(CONSENT_SUPPRESS_KEY);
    if (suppressed === "true") return false;
    const decision = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    return decision === null;
  } catch {
    return false;
  }
}

export async function clearConsentDecision(): Promise<void> {
  await AsyncStorage.multiRemove([CONSENT_STORAGE_KEY, CONSENT_SUPPRESS_KEY]);
}

export async function revokeConsent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CONSENT_STORAGE_KEY);
    console.log("[EarningsConsentGate] Consent revoked");
  } catch (err) {
    console.error("[EarningsConsentGate] Failed to revoke consent:", err);
  }
}

export async function isConsentAccepted(): Promise<boolean> {
  try {
    const decision = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    return decision === CONSENT_DECISION_ACCEPTED;
  } catch {
    return false;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface EarningsConsentGateProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenSettings: () => void;
}

export function EarningsConsentGate({
  visible,
  onDismiss,
  onOpenSettings,
}: EarningsConsentGateProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const rawStoreName =
    useResellerStore.getState().config.storeName || "the App";
  const storeName = capitalizeStoreName(rawStoreName); // ← Capitalize here

  const [activeTab, setActiveTab] = useState<Tab>("General");
  const [consentGiven, setConsentGiven] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab("General");
      setConsentGiven(false);
      setIsLoading(false);
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (!isLoading) onDismiss();
  }, [isLoading, onDismiss]);

  const handleAccept = useCallback(async () => {
    if (!consentGiven || isLoading) return;
    setIsLoading(true);
    try {
      await initialize();
      await optIn();
      await start();
      await AsyncStorage.setItem(
        CONSENT_STORAGE_KEY,
        CONSENT_DECISION_ACCEPTED,
      );
      onDismiss();
    } catch (err) {
      console.error("[EarningsConsentGate] Accept failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [consentGiven, isLoading, onDismiss]);

  const handleOpenSettings = useCallback(() => {
    if (isLoading) return;
    onDismiss();
    onOpenSettings();
  }, [isLoading, onDismiss, onOpenSettings]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return <GeneralTab colors={colors} storeName={storeName} />;
      case "Privacy":
        return (
          <PrivacyTab colors={colors} router={router} storeName={storeName} />
        );
      case "Data Protection":
        return <DataProtectionTab colors={colors} storeName={storeName} />;
      case "Data Sharing":
        return <DataSharingTab colors={colors} storeName={storeName} />;
    }
  };

  const consentLabel = (
    <Text style={[styles.checkboxLabelText, { color: colors.text }]}>
      By checking this box you confirm you have read and agree to {storeName}'s{" "}
      <InternalLinkText
        route="/(app)/(legal)/privacy"
        colors={colors}
        router={router}
      >
        Privacy Policy
      </InternalLinkText>{" "}
      and{" "}
      <InternalLinkText
        route="/(app)/(legal)/terms"
        colors={colors}
        router={router}
      >
        Terms of Service
      </InternalLinkText>
      , the{" "}
      <ExternalLinkText url={PAWNS_PRIVACY_URL} colors={colors}>
        Pawns Privacy Policy
      </ExternalLinkText>{" "}
      and{" "}
      <ExternalLinkText url={PAWNS_ACCEPTABLE_USE_URL} colors={colors}>
        Acceptable Use Policy
      </ExternalLinkText>
      , and that you are at least 18 years of age and the primary account holder
      on the internet connection used by this device.
    </Text>
  );

  const dimmedPrimary = isDark ? `${colors.primary}4D` : `${colors.primary}5A`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        >
          {/* ── Gold top hairline ─────────────────────────────────────── */}
          <View
            style={[styles.topHairline, { backgroundColor: colors.primary }]}
          />

          {/* ── Header ───────────────────────────────────────────────── */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.backgroundSecondary,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <View
                style={[styles.accentBar, { backgroundColor: colors.primary }]}
              />
              <View style={styles.headerTextBlock}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {storeName}
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Review all tabs before enabling this feature
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
                },
              ]}
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={isLoading}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.closeBtnText, { color: colors.textSecondary }]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Tab bar ──────────────────────────────────────────────── */}
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: colors.backgroundSecondary,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  activeTab === tab && { borderBottomColor: colors.primary },
                ]}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab }}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: colors.textTertiary },
                    activeTab === tab && {
                      color: colors.primary,
                      fontWeight: "700",
                    },
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Tab content — flex:1 takes all available space ───────── */}
          <View style={styles.contentArea}>{renderTabContent()}</View>

          {/* ── Divider before footer ────────────────────────────── */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── Footer — single checkbox only ────────────────────────── */}
          <View
            style={[
              styles.footer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Checkbox
              checked={consentGiven}
              onPress={() => setConsentGiven((v) => !v)}
              label={consentLabel}
              testID="consent-checkbox"
              colors={colors}
              isDark={isDark}
            />
          </View>

          {/* ── Divider before action bar ───────────────────────── */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── Action bar — horizontal buttons ───────────────────────────── */}
          <View
            style={[
              styles.actionBar,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <TouchableOpacity
              style={[styles.settingsButton, { borderColor: colors.primary }]}
              onPress={handleOpenSettings}
              accessibilityRole="button"
              accessibilityLabel="Go to Settings"
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.settingsText, { color: colors.textSecondary }]}
              >
                ⚙ Settings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                {
                  backgroundColor:
                    consentGiven && !isLoading ? colors.primary : dimmedPrimary,
                },
              ]}
              onPress={handleAccept}
              accessibilityRole="button"
              accessibilityLabel="Accept"
              accessibilityState={{ disabled: !consentGiven || isLoading }}
              disabled={!consentGiven || isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text
                  style={[
                    styles.acceptText,
                    { color: consentGiven ? "#FFFFFF" : colors.textTertiary },
                  ]}
                >
                  Accept
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Bottom hairline ──────────────────────────────────── */}
          <View
            style={[styles.bottomHairline, { backgroundColor: colors.primary }]}
          />
        </View>
      </View>
    </Modal>
  );
}

// Add a helper function to capitalize store name
function capitalizeStoreName(name: string): string {
  if (!name) return "the App";
  // Capitalize first letter of each word
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}


export default EarningsConsentGate;

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 480);
const CARD_HEIGHT = SCREEN_HEIGHT * 0.94;

const styles = StyleSheet.create({
  // ── Full-screen overlay
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 28 : 16,
  },

  // ── Card — fixed tall height, column layout
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    flexDirection: "column",
  },

  // ── Decorative hairlines
  topHairline: {
    height: 2,
    width: "100%",
    opacity: 0.8,
    flexShrink: 0,
  },
  bottomHairline: {
    height: 1,
    width: "100%",
    opacity: 0.5,
    flexShrink: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    opacity: 0.6,
    flexShrink: 0,
  },

  // ── Header — fixed height, never shrinks
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accentBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  headerTextBlock: { flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 17,
  },

  // ── Tab bar — fixed height, never shrinks
  tabBar: {
    flexDirection: "row",
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Tab content area — flex:1 expands to fill ALL remaining vertical space
  contentArea: {
    flex: 1,
    overflow: "hidden",
  },
  tabContent: {
    flex: 1,
  },
  tabContentContainer: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // ── Typography
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 12,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 12.5,
    lineHeight: 20,
    marginBottom: 8,
  },
  disclosureLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
  },
  bulletItem: {
    fontSize: 12.5,
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 4,
  },
  emphasis: { fontWeight: "600" },
  link: { textDecorationLine: "underline" },

  // ── Footer — main consent checkbox
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    flexShrink: 0,
  },
  checkboxLabelText: {
    fontSize: 12.5,
    lineHeight: 19,
  },

  // ── Action bar — horizontal buttons
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexShrink: 0,
    gap: 12,
  },

  acceptButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  settingsButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  settingsText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxTick: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  checkboxLabelWrap: { flex: 1 },
});