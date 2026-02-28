// app/(app)/(auth)/forgot-password.tsx
import { Button, Card, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = () => {
    if (!email) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSendResetLink = async () => {
    if (!validateEmail()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // ✅ Clean URL — no query params. Supabase appends #access_token=...&refresh_token=...&type=recovery to this URL
        redirectTo: "https://alheri-data.vercel.app/redirect/reset-password",
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEmailSent(true);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Failed to send reset link. Please try again.");
      console.error("Reset password error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    setEmail("");
    setError("");
  };

  if (emailSent) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          padding: Spacing.xl,
        }}
      >
        {/* Success Icon */}
        <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
          <View
            style={{
              width: 100,
              height: 100,
              backgroundColor: colors.successLight,
              borderRadius: Radius.full,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Spacing.lg,
            }}
          >
            <Text style={{ fontSize: 50 }}>✉️</Text>
          </View>
          <Text
            style={{
              fontSize: Typography.sizes.xxxl,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              marginBottom: Spacing.sm,
              textAlign: "center",
            }}
          >
            Check Your Email
          </Text>
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: Typography.sizes.base * 1.5,
            }}
          >
            We've sent a password reset link to
          </Text>
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.primary,
              fontWeight: Typography.weights.semibold,
              marginTop: Spacing.xs,
              textAlign: "center",
            }}
          >
            {email}
          </Text>
        </View>

        {/* Instructions Card */}
        <Card
          variant="outlined"
          padding="lg"
          style={{ marginBottom: Spacing.xl }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.text,
              fontWeight: Typography.weights.semibold,
              marginBottom: Spacing.md,
            }}
          >
            What's next?
          </Text>
          <View style={{ gap: Spacing.md }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ color: colors.primary, marginRight: Spacing.sm }}>
                1.
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  flex: 1,
                  lineHeight: Typography.sizes.sm * 1.5,
                }}
              >
                Check your email inbox (and spam folder)
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ color: colors.primary, marginRight: Spacing.sm }}>
                2.
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  flex: 1,
                  lineHeight: Typography.sizes.sm * 1.5,
                }}
              >
                Click the reset link in the email
              </Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ color: colors.primary, marginRight: Spacing.sm }}>
                3.
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  flex: 1,
                  lineHeight: Typography.sizes.sm * 1.5,
                }}
              >
                Create a new password
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <Button
          title="Back to Login"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          variant="primary"
          fullWidth
          size="lg"
          style={{ marginBottom: Spacing.md }}
        />

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleResendEmail();
          }}
          style={{ alignItems: "center", paddingVertical: Spacing.md }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.textSecondary,
            }}
          >
            Didn't receive the email?{" "}
            <Text
              style={{
                color: colors.primary,
                fontWeight: Typography.weights.semibold,
              }}
            >
              Resend
            </Text>
          </Text>
        </Pressable>
      </View>
    );
  }

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
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
          <View
            style={{
              width: 80,
              height: 80,
              backgroundColor: colors.warning + "30",
              borderRadius: Radius.xl,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Spacing.lg,
            }}
          >
            <Text style={{ fontSize: 40 }}>🔑</Text>
          </View>
          <Text
            style={{
              fontSize: Typography.sizes.xxxl,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              marginBottom: Spacing.xs,
            }}
          >
            Forgot Password?
          </Text>
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: Typography.sizes.base * 1.5,
            }}
          >
            No worries! Enter your email and we'll send you a reset link
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text.toLowerCase());
              setError("");
            }}
            error={error}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
            leftIcon={<Text>📧</Text>}
          />
        </View>

        {/* Send Reset Link Button */}
        <Button
          title="Send Reset Link"
          onPress={handleSendResetLink}
          loading={isLoading}
          fullWidth
          size="md"
          style={{ marginBottom: Spacing.lg }}
        />

        {/* Back to Login */}
        <Link href="/(app)/(auth)/login" asChild>
          <Pressable>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Remember your password?{" "}
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: Typography.weights.semibold,
                }}
              >
                Back to Login
              </Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


// // app/(app)/(auth)/forgot-password.tsx
// import { Button, Card, Input } from "@/components/ui";
// import { Radius, Spacing, Typography } from "@/constants/Colors";
// import { useTheme } from "@/hooks/useTheme";
// import { supabase } from "@/lib/supabase";
// import * as Haptics from "expo-haptics";
// import { Link, useRouter } from "expo-router";
// import { useState } from "react";
// import {
//   KeyboardAvoidingView,
//   Platform,
//   Pressable,
//   ScrollView,
//   Text,
//   View,
// } from "react-native";

// export default function ForgotPasswordScreen() {
//   const { colors } = useTheme();
//   const router = useRouter();

//   const [email, setEmail] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [emailSent, setEmailSent] = useState(false);
//   const [error, setError] = useState("");

//   const validateEmail = () => {
//     if (!email) {
//       setError("Email is required");
//       return false;
//     }
//     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       setError("Enter a valid email address");
//       return false;
//     }
//     return true;
//   };

//   const handleSendResetLink = async () => {
//     if (!validateEmail()) {
//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       return;
//     }

//     setIsLoading(true);
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

//     try {
//       // TODO: Supabase password reset
//       const { error } = await supabase.auth.resetPasswordForEmail(email, {
//         // redirectTo: "bimbo-data://reset-password",
//         redirectTo: `https://symmetrical-parakeet-bimbo.vercel.app/redirect/reset-password?email=${encodeURIComponent(email)}`,
//       });

//       // await new Promise((resolve) => setTimeout(resolve, 2000));
//       if (error) throw error;

//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//       setEmailSent(true);
//     } catch (error) {
//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       setError("Failed to send reset link. Please try again.");
//       console.error("Reset password error:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleResendEmail = () => {
//     setEmailSent(false);
//     setEmail("");
//     setError("");
//   };

//   if (emailSent) {
//     return (
//       <View
//         style={{
//           flex: 1,
//           backgroundColor: colors.background,
//           justifyContent: "center",
//           padding: Spacing.xl,
//         }}
//       >
//         {/* Success Icon */}
//         <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
//           <View
//             style={{
//               width: 100,
//               height: 100,
//               backgroundColor: colors.successLight,
//               borderRadius: Radius.full,
//               alignItems: "center",
//               justifyContent: "center",
//               marginBottom: Spacing.lg,
//             }}
//           >
//             <Text style={{ fontSize: 50 }}>✉️</Text>
//           </View>
//           <Text
//             style={{
//               fontSize: Typography.sizes.xxxl,
//               fontWeight: Typography.weights.bold,
//               color: colors.text,
//               marginBottom: Spacing.sm,
//               textAlign: "center",
//             }}
//           >
//             Check Your Email
//           </Text>
//           <Text
//             style={{
//               fontSize: Typography.sizes.base,
//               color: colors.textSecondary,
//               textAlign: "center",
//               lineHeight: Typography.sizes.base * 1.5,
//             }}
//           >
//             We've sent a password reset link to
//           </Text>
//           <Text
//             style={{
//               fontSize: Typography.sizes.base,
//               color: colors.primary,
//               fontWeight: Typography.weights.semibold,
//               marginTop: Spacing.xs,
//               textAlign: "center",
//             }}
//           >
//             {email}
//           </Text>
//         </View>

//         {/* Instructions Card */}
//         <Card
//           variant="outlined"
//           padding="lg"
//           style={{ marginBottom: Spacing.xl }}
//         >
//           <Text
//             style={{
//               fontSize: Typography.sizes.base,
//               color: colors.text,
//               fontWeight: Typography.weights.semibold,
//               marginBottom: Spacing.md,
//             }}
//           >
//             What's next?
//           </Text>
//           <View style={{ gap: Spacing.md }}>
//             <View style={{ flexDirection: "row" }}>
//               <Text style={{ color: colors.primary, marginRight: Spacing.sm }}>
//                 1.
//               </Text>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.textSecondary,
//                   flex: 1,
//                   lineHeight: Typography.sizes.sm * 1.5,
//                 }}
//               >
//                 Check your email inbox (and spam folder)
//               </Text>
//             </View>
//             <View style={{ flexDirection: "row" }}>
//               <Text style={{ color: colors.primary, marginRight: Spacing.sm }}>
//                 2.
//               </Text>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.textSecondary,
//                   flex: 1,
//                   lineHeight: Typography.sizes.sm * 1.5,
//                 }}
//               >
//                 Click the reset link in the email
//               </Text>
//             </View>
//             <View style={{ flexDirection: "row" }}>
//               <Text style={{ color: colors.primary, marginRight: Spacing.sm }}>
//                 3.
//               </Text>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.textSecondary,
//                   flex: 1,
//                   lineHeight: Typography.sizes.sm * 1.5,
//                 }}
//               >
//                 Create a new password
//               </Text>
//             </View>
//           </View>
//         </Card>

//         {/* Actions */}
//         <Button
//           title="Back to Login"
//           onPress={() => {
//             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//             router.back();
//           }}
//           variant="primary"
//           fullWidth
//           size="lg"
//           style={{ marginBottom: Spacing.md }}
//         />

//         <Pressable
//           onPress={() => {
//             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//             handleResendEmail();
//           }}
//           style={{ alignItems: "center", paddingVertical: Spacing.md }}
//         >
//           <Text
//             style={{
//               fontSize: Typography.sizes.base,
//               color: colors.textSecondary,
//             }}
//           >
//             Didn't receive the email?{" "}
//             <Text
//               style={{
//                 color: colors.primary,
//                 fontWeight: Typography.weights.semibold,
//               }}
//             >
//               Resend
//             </Text>
//           </Text>
//         </Pressable>
//       </View>
//     );
//   }

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
//         {/* Header */}
//         <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
//           <View
//             style={{
//               width: 80,
//               height: 80,
//               backgroundColor: colors.warning + "30",
//               borderRadius: Radius.xl,
//               alignItems: "center",
//               justifyContent: "center",
//               marginBottom: Spacing.lg,
//             }}
//           >
//             <Text style={{ fontSize: 40 }}>🔑</Text>
//           </View>
//           <Text
//             style={{
//               fontSize: Typography.sizes.xxxl,
//               fontWeight: Typography.weights.bold,
//               color: colors.text,
//               marginBottom: Spacing.xs,
//             }}
//           >
//             Forgot Password?
//           </Text>
//           <Text
//             style={{
//               fontSize: Typography.sizes.base,
//               color: colors.textSecondary,
//               textAlign: "center",
//               lineHeight: Typography.sizes.base * 1.5,
//             }}
//           >
//             No worries! Enter your email and we'll send you a reset link
//           </Text>
//         </View>

//         {/* Form */}
//         <View style={{ marginBottom: Spacing.xl }}>
//           <Input
//             label="Email Address"
//             placeholder="you@example.com"
//             value={email}
//             onChangeText={(text) => {
//               setEmail(text.toLowerCase());
//               setError("");
//             }}
//             error={error}
//             keyboardType="email-address"
//             autoCapitalize="none"
//             autoFocus
//             leftIcon={<Text>📧</Text>}
//           />
//         </View>

//         {/* Send Reset Link Button */}
//         <Button
//           title="Send Reset Link"
//           onPress={handleSendResetLink}
//           loading={isLoading}
//           fullWidth
//           size="md"
//           style={{ marginBottom: Spacing.lg }}
//         />

//         {/* Back to Login */}
//         <Link href="/(app)/(auth)/login" asChild>
//           <Pressable>
//             <Text
//               style={{
//                 fontSize: Typography.sizes.sm,
//                 color: colors.textSecondary,
//                 textAlign: "center",
//               }}
//             >
//               Remember your password?{" "}
//               <Text
//                 style={{
//                   color: colors.primary,
//                   fontWeight: Typography.weights.semibold,
//                 }}
//               >
//                 Back to Login
//               </Text>
//             </Text>
//           </Pressable>
//         </Link>
//       </ScrollView>
//     </KeyboardAvoidingView>
//   );
// }
