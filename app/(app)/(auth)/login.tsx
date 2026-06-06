// app/(app)/(auth)/login.tsx

import { Button, Input } from "@/components/ui";
import { Spacing, Typography } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  Image,
  ActivityIndicator,
} from "react-native";

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

// /**
//  * Resolves the logo source dynamically based on the reseller's config.
//  *
//  * Priority:
//  * 1. Reseller's configured logo path (from reseller-config.json)
//  * 2. Default logo (assets/images/logo2.png)
//  */
// // function getLogoSource() {
// //   try {
// //     const configLogoPath = useResellerStore.getState().config.assets?.logo;

// //     if (configLogoPath && ASSET_MAP[configLogoPath]) {
// //       return ASSET_MAP[configLogoPath];
// //     }
// //   } catch {
// //     // Store not initialized yet, use fallback
// //   }

// //   return require("@/assets/images/logo2.png");
// // }

// /**
//  * Resolves the logo source dynamically based on the reseller's config.
//  *
//  * Priority:
//  * 1. Custom reseller icon (assets/custom/icon.png) — from build
//  * 2. Reseller's configured logo path (from reseller-config.json)
//  * 3. Default logo (assets/images/logo2.png)
//  */
// function getLogoSource() {
//   try {
//     // Priority 1: Custom reseller icon from build
//     if (ASSET_MAP["./assets/custom/icon.png"]) {
//       return ASSET_MAP["./assets/custom/icon.png"];
//     }

//     // Priority 2: Configured logo path
//     const configLogoPath = useResellerStore.getState().config.assets?.logo;
//     if (configLogoPath && ASSET_MAP[configLogoPath]) {
//       return ASSET_MAP[configLogoPath];
//     }
//   } catch {
//     // Store not initialized yet, use fallback
//   }

//   // Priority 3: Default
//   return require("@/assets/images/logo2.png");
// }

// /**
//  * Resolves any asset path to its required source.
//  * Can be reused by other screens (splash, etc.)
//  */
// export function getAssetSource(assetPath: string | undefined): any {
//   if (!assetPath) return null;

//   if (ASSET_MAP[assetPath]) {
//     return ASSET_MAP[assetPath];
//   }

//   // Fallback to icon
//   return require("@/assets/images/icon.png");
// }
// ============================================
// Helper function to call the edge function
// ============================================
async function getCustomerAuthEmail(
  originalEmail: string,
  storeName: string,
): Promise<string | null> {
  try {
    // Get the Supabase URL from your environment
    const supabaseUrl = process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error("[Edge Function] SUPABASE_URL not configured");
      return null;
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/get-customer-auth-email`;

    console.log("[Edge Function] Calling:", edgeFunctionUrl);

    const supabaseAnonKey = process.env.EXPO_PUBLIC_BIMBO_SUPABASE_ANON_KEY;
    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Required: Supabase edge functions reject requests without a valid anon key
        ...(supabaseAnonKey && { Authorization: `Bearer ${supabaseAnonKey}` }),
      },
      body: JSON.stringify({
        originalEmail: originalEmail.trim().toLowerCase(),
        storeName: storeName.trim().toLowerCase(),
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("[Edge Function] Error:", data.error);
      return null;
    }

    console.log(
      "[Edge Function] Response:",
      data.success ? "Found" : "Not found",
    );
    return data.authEmail || null;
  } catch (error) {
    console.error("[Edge Function] Network error:", error);
    return null;
  }
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  // Get the themed logo source
  // const logoSrc = getLogoSource();

  const handleLogin = async () => {
    // Validation
    const newErrors = { email: "", password: "" };
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const storeSlug = useResellerStore.getState().config.storeName;
      let loginEmail = email.trim().toLowerCase();
      let loginMethod = "direct";

      // STEP 1: Try to get auth_email from edge function
      const authEmail = await getCustomerAuthEmail(email, storeSlug);

      if (authEmail) {
        // Customer found - use their stored auth email for login
        loginEmail = authEmail;
        loginMethod = "edge_function";
        console.log("[Login] Using auth_email from edge function:", loginEmail);
      } else {
        // STEP 2: Fallback - try to find by auth_email directly in Supabase
        console.log(
          "[Login] No auth_email from edge function, trying fallback",
        );

        const { data: reseller, error: resellerError } = await supabase
          .from("resellers")
          .select("id")
          .eq("store_name", storeSlug)
          .eq("status", "active")
          .maybeSingle();

        if (!resellerError && reseller) {
          // Query by the `email` column (original email), then read back auth_email.
          // The auth_email column holds the store-suffixed Supabase Auth address —
          // querying by auth_email == originalEmail would never match anything.
          const { data: customerRecord } = await supabase
            .from("reseller_customers")
            .select("auth_email")
            .eq("email", email.trim().toLowerCase())
            .eq("reseller_id", reseller.id)
            .maybeSingle();

          if (customerRecord?.auth_email) {
            loginEmail = customerRecord.auth_email;
            loginMethod = "direct_supabase";
            console.log(
              "[Login] Fallback found auth_email in Supabase:",
              loginEmail,
            );
          } else {
            // Last resort: reconstruct storeEmail deterministically (same logic as register.tsx).
            // Handles edge cases where auth_email was never written to the DB.
            const [rawLocal, domain] = email.trim().toLowerCase().split("@");
            const baseLocal = rawLocal.split("+")[0];
            const input = `${email.trim().toLowerCase()}:${storeSlug}`;
            let hash = 0;
            for (let i = 0; i < input.length; i++) {
              hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
            }
            const suffix = (Math.abs(hash) % 9) + 1;
            const separator = rawLocal.includes("+") ? "" : "+";
            loginEmail = `${rawLocal}${separator}${storeSlug}${suffix}@${domain}`;
            loginMethod = "reconstructed";
            console.log("[Login] Reconstructed storeEmail:", loginEmail);
          }
        }
      }

      // STEP 3: Attempt login with the determined email
      console.log(
        "[Login] Attempting login with:",
        loginEmail,
        "Method:",
        loginMethod,
      );

      const {
        data: { session },
        error,
      } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password.trim(),
      });

      if (error) throw error;

      // Success! Save session and redirect
      setSession(session);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(app)/(protected)");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Provide user-friendly error messages
      let errorMessage = "Invalid email or password. Please try again.";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage =
          "Please verify your email address before logging in. Check your inbox for a confirmation link.";
      } else if (error.message?.includes("rate limit")) {
        errorMessage =
          "Too many login attempts. Please wait a few minutes and try again.";
      }

      Alert.alert("Login Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: Spacing.xl,
        }}
      >
        {/* Logo Section */}
        <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
          {/* <View
            style={{
              width: 100,
              height: 100,
              backgroundColor: colors.primary,
              borderRadius: 50,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Spacing.md,
            }}
          >
            <Text style={{ fontSize: 48 }}>📱</Text>
          </View> */}
          {/* <Image
            source={logoSrc}
            style={{
              width: 150,
              height: 150,
              borderRadius: 70,
              marginBottom: 10,
            }}
          /> */}
          <Text
            style={{
              fontSize: Typography.sizes.xxxl,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              marginBottom: Spacing.xs,
            }}
          >
            Welcome Back
          </Text>
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.textSecondary,
            }}
          >
            Login to continue
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: "" });
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Text>📧</Text>}
            containerStyle={{ marginBottom: Spacing.lg }}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: "" });
            }}
            error={errors.password}
            secureTextEntry={!showPassword}
            leftIcon={<Text>🔒</Text>}
            rightIcon={
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPassword(!showPassword);
                }}
              >
                <Text style={{ fontSize: 20 }}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </Text>
              </Pressable>
            }
            containerStyle={{ marginBottom: Spacing.md }}
          />

          <Link href="/(app)/(auth)/forgot-password" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.primary,
                  fontWeight: Typography.weights.semibold,
                  textAlign: "right",
                }}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* Login Button */}
        <Button
          title={isLoading ? "Logging in..." : "Login"}
          onPress={handleLogin}
          disabled={isLoading}
          loading={isLoading}
          fullWidth
          size="md"
          style={{ marginBottom: Spacing.md }}
        />

        {/* Register Link */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.sm,
              color: colors.textSecondary,
              marginRight: Spacing.xs,
            }}
          >
            Don't have an account?
          </Text>
          <Link href="/(app)/(auth)/register" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  color: colors.primary,
                  fontWeight: Typography.weights.semibold,
                }}
              >
                Sign Up
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* Legal Links */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: Spacing.xl,
            gap: Spacing.md,
          }}
        >
          <Link href="/(app)/(legal)/privacy" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textTertiary,
                }}
              >
                Privacy
              </Text>
            </Pressable>
          </Link>
          <Text style={{ color: colors.textTertiary }}>•</Text>
          <Link href="/(app)/(legal)/terms" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textTertiary,
                }}
              >
                Terms
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// // app/(app)/(auth)/login.tsx

// import { Button, Input } from "@/components/ui";
// import { Spacing, Typography } from "@/constants/Colors";
// import { useTheme } from "@/hooks/useTheme";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";
// import * as Haptics from "expo-haptics";
// import { Link, useRouter } from "expo-router";
// import { useState } from "react";
// import {
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   Pressable,
//   ScrollView,
//   Text,
//   View,
//   Image,
//   ActivityIndicator,
// } from "react-native";

// const ASSET_MAP: Record<string, any> = {
//   "./assets/images/icon.png": require("@/assets/images/icon.png"),
//   "./assets/images/splash.png": require("@/assets/images/splash.png"),
//   "./assets/images/logo2.png": require("@/assets/images/logo2.png"),
//   "./assets/images/adaptive-icon.png": require("@/assets/images/adaptive-icon.png"),
//   "./assets/images/notification-icon.png": require("@/assets/images/icon.png"),
//   // "./assets/custom/icon.png": require("@/assets/custom/icon.png"),
//   // "./assets/custom/splash.png": require("@/assets/custom/splash.png"),
//   // "./assets/custom/adaptive-icon.png": require("@/assets/custom/adaptive-icon.png"),
// };

// // /**
// //  * Resolves the logo source dynamically based on the reseller's config.
// //  *
// //  * Priority:
// //  * 1. Reseller's configured logo path (from reseller-config.json)
// //  * 2. Default logo (assets/images/logo2.png)
// //  */
// // // function getLogoSource() {
// // //   try {
// // //     const configLogoPath = useResellerStore.getState().config.assets?.logo;

// // //     if (configLogoPath && ASSET_MAP[configLogoPath]) {
// // //       return ASSET_MAP[configLogoPath];
// // //     }
// // //   } catch {
// // //     // Store not initialized yet, use fallback
// // //   }

// // //   return require("@/assets/images/logo2.png");
// // // }

// // /**
// //  * Resolves the logo source dynamically based on the reseller's config.
// //  *
// //  * Priority:
// //  * 1. Custom reseller icon (assets/custom/icon.png) — from build
// //  * 2. Reseller's configured logo path (from reseller-config.json)
// //  * 3. Default logo (assets/images/logo2.png)
// //  */
// // function getLogoSource() {
// //   try {
// //     // Priority 1: Custom reseller icon from build
// //     if (ASSET_MAP["./assets/custom/icon.png"]) {
// //       return ASSET_MAP["./assets/custom/icon.png"];
// //     }

// //     // Priority 2: Configured logo path
// //     const configLogoPath = useResellerStore.getState().config.assets?.logo;
// //     if (configLogoPath && ASSET_MAP[configLogoPath]) {
// //       return ASSET_MAP[configLogoPath];
// //     }
// //   } catch {
// //     // Store not initialized yet, use fallback
// //   }

// //   // Priority 3: Default
// //   return require("@/assets/images/logo2.png");
// // }

// // /**
// //  * Resolves any asset path to its required source.
// //  * Can be reused by other screens (splash, etc.)
// //  */
// // export function getAssetSource(assetPath: string | undefined): any {
// //   if (!assetPath) return null;

// //   if (ASSET_MAP[assetPath]) {
// //     return ASSET_MAP[assetPath];
// //   }

// //   // Fallback to icon
// //   return require("@/assets/images/icon.png");
// // }
// // ============================================
// // Helper function to call the edge function
// // ============================================
// async function getCustomerAuthEmail(
//   originalEmail: string,
//   storeName: string,
// ): Promise<string | null> {
//   try {
//     // Get the Supabase URL from your environment
//     const supabaseUrl = process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL;

//     if (!supabaseUrl) {
//       console.error("[Edge Function] SUPABASE_URL not configured");
//       return null;
//     }

//     const edgeFunctionUrl = `${supabaseUrl}/functions/v1/get-customer-auth-email`;

//     console.log("[Edge Function] Calling:", edgeFunctionUrl);

//     const response = await fetch(edgeFunctionUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         originalEmail: originalEmail.trim().toLowerCase(),
//         storeName: storeName.trim().toLowerCase(),
//       }),
//     });

//     const data = await response.json();

//     if (data.error) {
//       console.error("[Edge Function] Error:", data.error);
//       return null;
//     }

//     console.log(
//       "[Edge Function] Response:",
//       data.success ? "Found" : "Not found",
//     );
//     return data.authEmail || null;
//   } catch (error) {
//     console.error("[Edge Function] Network error:", error);
//     return null;
//   }
// }

// export default function LoginScreen() {
//   const { colors } = useTheme();
//   const router = useRouter();
//   const setSession = useAuthStore((state) => state.setSession);
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [errors, setErrors] = useState({ email: "", password: "" });

//   // Get the themed logo source
//   // const logoSrc = getLogoSource();

//   const handleLogin = async () => {
//     // Validation
//     const newErrors = { email: "", password: "" };
//     if (!email) newErrors.email = "Email is required";
//     if (!password) newErrors.password = "Password is required";

//     if (newErrors.email || newErrors.password) {
//       setErrors(newErrors);
//       return;
//     }

//     setIsLoading(true);

//     try {
//       const storeSlug = useResellerStore.getState().config.storeName;
//       let loginEmail = email.trim().toLowerCase();
//       let loginMethod = "direct";

//       // STEP 1: Try to get auth_email from edge function
//       const authEmail = await getCustomerAuthEmail(email, storeSlug);

//       if (authEmail) {
//         // Customer found - use their stored auth email for login
//         loginEmail = authEmail;
//         loginMethod = "edge_function";
//         console.log("[Login] Using auth_email from edge function:", loginEmail);
//       } else {
//         // STEP 2: Fallback - try to find by auth_email directly in Supabase
//         console.log(
//           "[Login] No auth_email from edge function, trying fallback",
//         );

//         const { data: reseller, error: resellerError } = await supabase
//           .from("resellers")
//           .select("id")
//           .eq("store_name", storeSlug)
//           .eq("status", "active")
//           .maybeSingle();

//         if (!resellerError && reseller) {
//           const { data: customerByAuthEmail } = await supabase
//             .from("reseller_customers")
//             .select("auth_email")
//             .eq("auth_email", email.trim().toLowerCase())
//             .eq("reseller_id", reseller.id)
//             .maybeSingle();

//           if (customerByAuthEmail?.auth_email) {
//             loginEmail = customerByAuthEmail.auth_email;
//             loginMethod = "direct_supabase";
//             console.log("[Login] Found by auth_email in Supabase:", loginEmail);
//           }
//         }
//       }

//       // STEP 3: Attempt login with the determined email
//       console.log(
//         "[Login] Attempting login with:",
//         loginEmail,
//         "Method:",
//         loginMethod,
//       );

//       const {
//         data: { session },
//         error,
//       } = await supabase.auth.signInWithPassword({
//         email: loginEmail,
//         password: password.trim(),
//       });

//       if (error) throw error;

//       // Success! Save session and redirect
//       setSession(session);
//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//       router.replace("/(app)/(protected)");
//     } catch (error: any) {
//       console.error("[Login] Error:", error);
//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

//       // Provide user-friendly error messages
//       let errorMessage = "Invalid email or password. Please try again.";

//       if (error.message?.includes("Invalid login credentials")) {
//         errorMessage = "Invalid email or password. Please try again.";
//       } else if (error.message?.includes("Email not confirmed")) {
//         errorMessage =
//           "Please verify your email address before logging in. Check your inbox for a confirmation link.";
//       } else if (error.message?.includes("rate limit")) {
//         errorMessage =
//           "Too many login attempts. Please wait a few minutes and try again.";
//       }

//       Alert.alert("Login Error", errorMessage);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <KeyboardAvoidingView
//       behavior={Platform.OS === "ios" ? "padding" : "height"}
//       style={{ flex: 1, backgroundColor: colors.background }}
//     >
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{
//           flexGrow: 1,
//           justifyContent: "center",
//           padding: Spacing.xl,
//         }}
//       >
//         {/* Logo Section */}
//         <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
//           {/* <View
//             style={{
//               width: 100,
//               height: 100,
//               backgroundColor: colors.primary,
//               borderRadius: 50,
//               alignItems: "center",
//               justifyContent: "center",
//               marginBottom: Spacing.md,
//             }}
//           >
//             <Text style={{ fontSize: 48 }}>📱</Text>
//           </View> */}
//           {/* <Image
//             source={logoSrc}
//             style={{
//               width: 150,
//               height: 150,
//               borderRadius: 70,
//               marginBottom: 10,
//             }}
//           /> */}
//           <Text
//             style={{
//               fontSize: Typography.sizes.xxxl,
//               fontWeight: Typography.weights.bold,
//               color: colors.text,
//               marginBottom: Spacing.xs,
//             }}
//           >
//             Welcome Back
//           </Text>
//           <Text
//             style={{
//               fontSize: Typography.sizes.base,
//               color: colors.textSecondary,
//             }}
//           >
//             Login to continue
//           </Text>
//         </View>

//         {/* Form */}
//         <View style={{ marginBottom: Spacing.xl }}>
//           <Input
//             label="Email Address"
//             placeholder="you@example.com"
//             value={email}
//             onChangeText={(text) => {
//               setEmail(text);
//               setErrors({ ...errors, email: "" });
//             }}
//             error={errors.email}
//             keyboardType="email-address"
//             autoCapitalize="none"
//             autoCorrect={false}
//             leftIcon={<Text>📧</Text>}
//             containerStyle={{ marginBottom: Spacing.lg }}
//           />

//           <Input
//             label="Password"
//             placeholder="••••••••"
//             value={password}
//             onChangeText={(text) => {
//               setPassword(text);
//               setErrors({ ...errors, password: "" });
//             }}
//             error={errors.password}
//             secureTextEntry={!showPassword}
//             leftIcon={<Text>🔒</Text>}
//             rightIcon={
//               <Pressable
//                 onPress={() => {
//                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//                   setShowPassword(!showPassword);
//                 }}
//               >
//                 <Text style={{ fontSize: 20 }}>
//                   {showPassword ? "👁️" : "👁️‍🗨️"}
//                 </Text>
//               </Pressable>
//             }
//             containerStyle={{ marginBottom: Spacing.md }}
//           />

//           <Link href="/(app)/(auth)/forgot-password" asChild>
//             <Pressable>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.primary,
//                   fontWeight: Typography.weights.semibold,
//                   textAlign: "right",
//                 }}
//               >
//                 Forgot Password?
//               </Text>
//             </Pressable>
//           </Link>
//         </View>

//         {/* Login Button */}
//         <Button
//           title={isLoading ? "Logging in..." : "Login"}
//           onPress={handleLogin}
//           disabled={isLoading}
//           loading={isLoading}
//           fullWidth
//           size="md"
//           style={{ marginBottom: Spacing.md }}
//         />

//         {/* Register Link */}
//         <View
//           style={{
//             flexDirection: "row",
//             justifyContent: "center",
//             alignItems: "center",
//           }}
//         >
//           <Text
//             style={{
//               fontSize: Typography.sizes.sm,
//               color: colors.textSecondary,
//               marginRight: Spacing.xs,
//             }}
//           >
//             Don't have an account?
//           </Text>
//           <Link href="/(app)/(auth)/register" asChild>
//             <Pressable>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.base,
//                   color: colors.primary,
//                   fontWeight: Typography.weights.semibold,
//                 }}
//               >
//                 Sign Up
//               </Text>
//             </Pressable>
//           </Link>
//         </View>

//         {/* Legal Links */}
//         <View
//           style={{
//             flexDirection: "row",
//             justifyContent: "center",
//             marginTop: Spacing.xl,
//             gap: Spacing.md,
//           }}
//         >
//           <Link href="/(app)/(legal)/privacy" asChild>
//             <Pressable>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.textTertiary,
//                 }}
//               >
//                 Privacy
//               </Text>
//             </Pressable>
//           </Link>
//           <Text style={{ color: colors.textTertiary }}>•</Text>
//           <Link href="/(app)/(legal)/terms" asChild>
//             <Pressable>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.textTertiary,
//                 }}
//               >
//                 Terms
//               </Text>
//             </Pressable>
//           </Link>
//         </View>
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }
