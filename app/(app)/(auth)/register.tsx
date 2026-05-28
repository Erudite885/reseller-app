// app/(app)/(auth)/register.tsx

import { Button, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
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
} from "react-native";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Update form field
  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  // Validation
  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
      confirmPassword: "",
    };

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must include uppercase, lowercase, and number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  // Register customer to current reseller
  // const registerCustomerToReseller = async (
  //   userId: string,
  //   originalEmail: string,
  //   authEmail: string,
  // ) => {
  //   try {
  //     const storeSlug = useResellerStore.getState().config.storeName;
  //     const username = formData.email.split("@")[0];

  //     const { data: reseller, error: resellerError } = await supabase
  //       .from("resellers")
  //       .select("id")
  //       .eq("store_name", storeSlug)
  //       .eq("status", "active")
  //       .single();

  //     if (resellerError || !reseller) {
  //       console.log(
  //         "[Register] No active reseller found for store:",
  //         storeSlug,
  //       );
  //       return;
  //     }

  //     const { data: existingCustomer } = await supabase
  //       .from("reseller_customers")
  //       .select("id, auth_user_id")
  //       .eq("reseller_id", reseller.id)
  //       .eq("email", formData.email)
  //       .single();

  //     if (existingCustomer) {
  //       if (!existingCustomer.auth_user_id) {
  //         await supabase
  //           .from("reseller_customers")
  //           .update({ auth_user_id: userId })
  //           .eq("id", existingCustomer.id);
  //         console.log("[Register] ✅ Customer updated with auth_user_id");
  //       } else {
  //         console.log(
  //           "[Register] Customer already registered with this reseller",
  //         );
  //       }
  //     } else {
  //       const { error: insertError } = await supabase
  //         .from("reseller_customers")
  //         .insert({
  //           reseller_id: reseller.id,
  //           email: formData.email,
  //           first_name: username,
  //           auth_user_id: userId,
  //         });

  //       if (insertError) {
  //         console.error("[Register] Failed to create customer:", insertError);
  //         return;
  //       }
  //       console.log("[Register] ✅ Customer created for reseller:", storeSlug);
  //     }

  //     // Get customer record id for wallet
  //     const { data: customer } = await supabase
  //       .from("reseller_customers")
  //       .select("id")
  //       .eq("reseller_id", reseller.id)
  //       .eq("email", formData.email)
  //       .single();

  //     if (customer) {
  //       const { data: existingWallet } = await supabase
  //         .from("reseller_customer_wallets")
  //         .select("id")
  //         .eq("reseller_id", reseller.id)
  //         .eq("customer_id", customer.id)
  //         .single();

  //       if (!existingWallet) {
  //         await supabase.from("reseller_customer_wallets").insert({
  //           reseller_id: reseller.id,
  //           customer_id: customer.id,
  //           balance: 0,
  //           total_spent: 0,
  //         });
  //         console.log("[Register] ✅ Customer wallet created");
  //       }
  //     }
  //   } catch (error) {
  //     console.error(
  //       "[Register] Error registering customer",
  //       error,
  //     );
  //   }
  // };

  const registerCustomerToReseller = async (
    userId: string,
    originalEmail: string,
    authEmail: string,
  ) => {
    try {
      const storeSlug = useResellerStore.getState().config.storeName;
      const username = originalEmail.split("@")[0];

      const { data: reseller, error: resellerError } = await supabase
        .from("resellers")
        .select("id")
        .eq("store_name", storeSlug)
        .eq("status", "active")
        .single();

      if (resellerError || !reseller) {
        console.log(
          "[Register] No active reseller found for store:",
          storeSlug,
        );
        return;
      }

      // Check if customer already exists
      const { data: existingCustomer } = await supabase
        .from("reseller_customers")
        .select("id, auth_user_id, auth_email")
        .eq("reseller_id", reseller.id)
        .eq("email", originalEmail)
        .single();

      if (existingCustomer) {
        const updates: any = {};
        if (!existingCustomer.auth_user_id) updates.auth_user_id = userId;
        if (!existingCustomer.auth_email) updates.auth_email = authEmail;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("reseller_customers")
            .update(updates)
            .eq("id", existingCustomer.id);
        }
      } else {
        // Create new customer with auth_email
        const { error: insertError } = await supabase
          .from("reseller_customers")
          .insert({
            reseller_id: reseller.id,
            email: originalEmail,
            auth_email: authEmail,
            first_name: username,
            auth_user_id: userId,
          });

        if (insertError) {
          console.error("[Register] Failed to create customer:", insertError);
          return;
        }
      }

      // Get or create wallet...
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("reseller_id", reseller.id)
        .eq("email", originalEmail)
        .single();

      if (customer) {
        const { data: existingWallet } = await supabase
          .from("reseller_customer_wallets")
          .select("id")
          .eq("reseller_id", reseller.id)
          .eq("customer_id", customer.id)
          .single();

        if (!existingWallet) {
          await supabase.from("reseller_customer_wallets").insert({
            reseller_id: reseller.id,
            customer_id: customer.id,
            balance: 0,
            total_spent: 0,
          });
        }
      }
    } catch (error) {
      console.error("[Register] Error:", error);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const [localPart, domain] = formData.email.split("@");
      const suffix = Math.floor(Math.random() * 9) + 1;
      const separator = localPart.includes("+") ? "" : "+";
      const storeSlug = useResellerStore.getState().config.storeName;
      const storeEmail = `${localPart}${separator}${storeSlug}${suffix}@${domain}`;

      const username = formData.email.split("@")[0];

      const {
        data: { session, user },
        error,
      } = await supabase.auth.signUp({
        email: storeEmail,
        password: formData.password,
        options: {
          data: {
            username: username,
            role: "customer",
            original_email: formData.email,
          },
        },
      });

      if (error) throw error;

      if (user) {
        await registerCustomerToReseller(user.id, formData.email, storeEmail);
      }

      if (session) {
        setSession(session);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(app)/(protected)");
      } else {
        Alert.alert(
          "Check Your Email",
          "A confirmation email has been sent. Please verify your email to complete registration.",
        );
        router.replace("/(app)/(auth)/login");
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Registration Error",
        error.message || "An error occurred during registration.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            padding: Spacing.xl,
            paddingTop: Platform.OS === "ios" ? 60 : 40,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
            <View
              style={{
                width: 80,
                height: 80,
                backgroundColor: colors.primary,
                borderRadius: Radius.xl,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: Spacing.md,
              }}
            >
              <Text style={{ fontSize: 40 }}>🚀</Text>
            </View>
            <Text
              style={{
                fontSize: Typography.sizes.xxxl,
                fontWeight: Typography.weights.bold,
                color: colors.text,
                marginBottom: Spacing.xs,
              }}
            >
              Create Account
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Sign up to start buying data and airtime
            </Text>
          </View>

          <View style={{ marginBottom: Spacing.lg }}>
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={formData.email}
              onChangeText={(text) => updateField("email", text.toLowerCase())}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Text>📧</Text>}
              containerStyle={{ marginBottom: Spacing.md }}
            />

            <Input
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChangeText={(text) => updateField("password", text)}
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
              helperText="Min. 8 characters with uppercase, lowercase & number"
              containerStyle={{ marginBottom: Spacing.md }}
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChangeText={(text) => updateField("confirmPassword", text)}
              error={errors.confirmPassword}
              secureTextEntry={!showConfirmPassword}
              leftIcon={<Text>🔒</Text>}
              rightIcon={
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                >
                  <Text style={{ fontSize: 20 }}>
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              }
              containerStyle={{ marginBottom: Spacing.md }}
            />

            <View
              style={{
                backgroundColor: colors.backgroundSecondary,
                padding: Spacing.md,
                borderRadius: Radius.md,
                marginBottom: Spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  lineHeight: Typography.sizes.sm * 1.5,
                }}
              >
                By creating an account, you agree to our{" "}
                <Link href="/(app)/(legal)/terms" asChild>
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: Typography.weights.semibold,
                    }}
                  >
                    Terms of Service
                  </Text>
                </Link>{" "}
                and{" "}
                <Link href="/(app)/(legal)/privacy" asChild>
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: Typography.weights.semibold,
                    }}
                  >
                    Privacy Policy
                  </Text>
                </Link>
              </Text>
            </View>
          </View>

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            size="md"
            style={{ marginBottom: Spacing.md }}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: Spacing.xl,
            }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.textSecondary,
                marginRight: Spacing.xs,
              }}
            >
              Already have an account?
            </Text>
            <Link href="/(app)/(auth)/login" asChild>
              <Pressable>
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    color: colors.primary,
                    fontWeight: Typography.weights.semibold,
                  }}
                >
                  Login
                </Text>
              </Pressable>
            </Link>
          </View>

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// // app/(app)/(auth)/register.tsx

// import { Button, Input } from "@/components/ui";
// import { Radius, Spacing, Typography } from "@/constants/Colors";
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
// } from "react-native";

// export default function RegisterScreen() {
//   const { colors } = useTheme();
//   const router = useRouter();
//   const setSession = useAuthStore((state) => state.setSession);

//   // Form state
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//     confirmPassword: "",
//   });

//   const [isLoading, setIsLoading] = useState(false);
//   const [errors, setErrors] = useState({
//     email: "",
//     password: "",
//     confirmPassword: "",
//   });
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   // Update form field
//   const updateField = (field: string, value: string) => {
//     setFormData({ ...formData, [field]: value });
//     setErrors({ ...errors, [field]: "" });
//   };

//   // Validation
//   const validateForm = () => {
//     const newErrors = {
//       email: "",
//       password: "",
//       confirmPassword: "",
//     };

//     // Email validation
//     if (!formData.email) {
//       newErrors.email = "Email is required";
//     } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
//       newErrors.email = "Enter a valid email address";
//     }

//     // Password validation
//     if (!formData.password) {
//       newErrors.password = "Password is required";
//     } else if (formData.password.length < 8) {
//       newErrors.password = "Password must be at least 8 characters";
//     } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
//       newErrors.password =
//         "Password must include uppercase, lowercase, and number";
//     }

//     // Confirm password validation
//     if (!formData.confirmPassword) {
//       newErrors.confirmPassword = "Please confirm your password";
//     } else if (formData.password !== formData.confirmPassword) {
//       newErrors.confirmPassword = "Passwords do not match";
//     }

//     setErrors(newErrors);
//     return !Object.values(newErrors).some((error) => error !== "");
//   };

//   // Register customer to current reseller
//   const registerCustomerToReseller = async (userId: string) => {
//     try {
//       const storeSlug = useResellerStore.getState().config.storeName;

//       // Find the reseller
//       const { data: reseller, error: resellerError } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("store_name", storeSlug)
//         .eq("status", "active")
//         .single();

//       if (resellerError || !reseller) {
//         console.log(
//           "[Register] No active reseller found for store:",
//           storeSlug,
//         );
//         return;
//       }

//       // Check if customer already exists for this reseller
//       const { data: existingCustomer } = await supabase
//         .from("reseller_customers")
//         .select("id, auth_user_id")
//         .eq("reseller_id", reseller.id)
//         .eq("email", formData.email)
//         .single();

//       if (existingCustomer) {
//         // Update auth_user_id if not set (user might have been added by reseller manually)
//         if (!existingCustomer.auth_user_id) {
//           const { error: updateError } = await supabase
//             .from("reseller_customers")
//             .update({ auth_user_id: userId })
//             .eq("id", existingCustomer.id);

//           if (updateError) {
//             console.error("[Register] Failed to update customer:", updateError);
//           } else {
//             console.log("[Register] ✅ Customer updated with auth_user_id");
//           }
//         } else {
//           console.log(
//             "[Register] Customer already registered with this reseller",
//           );
//         }
//       } else {
//         // Create new customer record
//         const { error: insertError } = await supabase
//           .from("reseller_customers")
//           .insert({
//             reseller_id: reseller.id,
//             email: formData.email,
//             auth_user_id: userId,
//           });

//         if (insertError) {
//           console.error("[Register] Failed to create customer:", insertError);
//         } else {
//           console.log(
//             "[Register] ✅ Customer created for reseller:",
//             storeSlug,
//           );
//         }
//       }

//       // Create wallet if doesn't exist
//       const { data: existingWallet } = await supabase
//         .from("reseller_customer_wallets")
//         .select("id")
//         .eq("reseller_id", reseller.id)
//         .eq("customer_id", userId)
//         .single();

//       if (!existingWallet) {
//         const { error: walletError } = await supabase
//           .from("reseller_customer_wallets")
//           .insert({
//             reseller_id: reseller.id,
//             customer_id: userId,
//             balance: 0,
//             total_spent: 0,
//           });

//         if (walletError) {
//           console.error("[Register] Failed to create wallet:", walletError);
//         } else {
//           console.log("[Register] ✅ Customer wallet created");
//         }
//       }
//     } catch (error) {
//       console.error(
//         "[Register] Error registering customer to reseller:",
//         error,
//       );
//     }
//   };

//  const handleRegister = async () => {
//    if (!validateForm()) {
//      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//      return;
//    }

//    setIsLoading(true);
//    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

//    try {
//      // Generate store-specific email
//      const [localPart, domain] = formData.email.split("@");
//      const suffix = Math.floor(Math.random() * 9) + 1;
//      const separator = localPart.includes("+") ? "" : "+";
//      const storeSlug = useResellerStore.getState().config.storeName;
//      const storeEmail = `${localPart}${separator}${storeSlug}${suffix}@${domain}`;

//      const username = formData.email.split("@")[0];

//      const {
//        data: { session, user },
//        error,
//      } = await supabase.auth.signUp({
//        email: storeEmail,
//        password: formData.password,
//        options: {
//          data: {
//            username: username,
//            role: "customer",
//          },
//        },
//      });

//      if (error) throw error;

//      if (user) {
//        await registerCustomerToReseller(user.id);
//      }

//      if (session) {
//        setSession(session);
//        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//        router.replace("/(app)/(protected)");
//      } else {
//        Alert.alert(
//          "Check Your Email",
//          "A confirmation email has been sent. Please verify your email to complete registration.",
//        );
//        router.replace("/(app)/(auth)/login");
//      }
//    } catch (error: any) {
//      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//      Alert.alert(
//        "Registration Error",
//        error.message || "An error occurred during registration.",
//      );
//    } finally {
//      setIsLoading(false);
//    }
//  };

//   return (
//     <>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1, backgroundColor: colors.background }}
//       >
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{
//             flexGrow: 1,
//             padding: Spacing.xl,
//             paddingTop: Platform.OS === "ios" ? 60 : 40,
//           }}
//         >
//           {/* Header */}
//           <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
//             <View
//               style={{
//                 width: 80,
//                 height: 80,
//                 backgroundColor: colors.primary,
//                 borderRadius: Radius.xl,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 marginBottom: Spacing.md,
//               }}
//             >
//               <Text style={{ fontSize: 40 }}>🚀</Text>
//             </View>
//             <Text
//               style={{
//                 fontSize: Typography.sizes.xxxl,
//                 fontWeight: Typography.weights.bold,
//                 color: colors.text,
//                 marginBottom: Spacing.xs,
//               }}
//             >
//               Create Account
//             </Text>
//             <Text
//               style={{
//                 fontSize: Typography.sizes.base,
//                 color: colors.textSecondary,
//                 textAlign: "center",
//               }}
//             >
//               Sign up to start buying data and airtime
//             </Text>
//           </View>

//           {/* Form */}
//           <View style={{ marginBottom: Spacing.lg }}>
//             {/* Email */}
//             <Input
//               label="Email Address"
//               placeholder="you@example.com"
//               value={formData.email}
//               onChangeText={(text) => updateField("email", text.toLowerCase())}
//               error={errors.email}
//               keyboardType="email-address"
//               autoCapitalize="none"
//               leftIcon={<Text>📧</Text>}
//               containerStyle={{ marginBottom: Spacing.md }}
//             />

//             {/* Password */}
//             <Input
//               label="Password"
//               placeholder="Create a strong password"
//               value={formData.password}
//               onChangeText={(text) => updateField("password", text)}
//               error={errors.password}
//               secureTextEntry={!showPassword}
//               leftIcon={<Text>🔒</Text>}
//               rightIcon={
//                 <Pressable
//                   onPress={() => {
//                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//                     setShowPassword(!showPassword);
//                   }}
//                 >
//                   <Text style={{ fontSize: 20 }}>
//                     {showPassword ? "👁️" : "👁️‍🗨️"}
//                   </Text>
//                 </Pressable>
//               }
//               helperText="Min. 8 characters with uppercase, lowercase & number"
//               containerStyle={{ marginBottom: Spacing.md }}
//             />

//             {/* Confirm Password */}
//             <Input
//               label="Confirm Password"
//               placeholder="Re-enter your password"
//               value={formData.confirmPassword}
//               onChangeText={(text) => updateField("confirmPassword", text)}
//               error={errors.confirmPassword}
//               secureTextEntry={!showConfirmPassword}
//               leftIcon={<Text>🔒</Text>}
//               rightIcon={
//                 <Pressable
//                   onPress={() => {
//                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//                     setShowConfirmPassword(!showConfirmPassword);
//                   }}
//                 >
//                   <Text style={{ fontSize: 20 }}>
//                     {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
//                   </Text>
//                 </Pressable>
//               }
//               containerStyle={{ marginBottom: Spacing.md }}
//             />

//             {/* Terms Agreement */}
//             <View
//               style={{
//                 backgroundColor: colors.backgroundSecondary,
//                 padding: Spacing.md,
//                 borderRadius: Radius.md,
//                 marginBottom: Spacing.sm,
//               }}
//             >
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.textSecondary,
//                   lineHeight: Typography.sizes.sm * 1.5,
//                 }}
//               >
//                 By creating an account, you agree to our{" "}
//                 <Link href="/(app)/(legal)/terms" asChild>
//                   <Text
//                     style={{
//                       color: colors.primary,
//                       fontWeight: Typography.weights.semibold,
//                     }}
//                   >
//                     Terms of Service
//                   </Text>
//                 </Link>{" "}
//                 and{" "}
//                 <Link href="/(app)/(legal)/privacy" asChild>
//                   <Text
//                     style={{
//                       color: colors.primary,
//                       fontWeight: Typography.weights.semibold,
//                     }}
//                   >
//                     Privacy Policy
//                   </Text>
//                 </Link>
//               </Text>
//             </View>
//           </View>

//           {/* Register Button */}
//           <Button
//             title="Create Account"
//             onPress={handleRegister}
//             loading={isLoading}
//             fullWidth
//             size="md"
//             style={{ marginBottom: Spacing.md }}
//           />

//           {/* Login Link */}
//           <View
//             style={{
//               flexDirection: "row",
//               justifyContent: "center",
//               alignItems: "center",
//               marginBottom: Spacing.xl,
//             }}
//           >
//             <Text
//               style={{
//                 fontSize: Typography.sizes.sm,
//                 color: colors.textSecondary,
//                 marginRight: Spacing.xs,
//               }}
//             >
//               Already have an account?
//             </Text>
//             <Link href="/(app)/(auth)/login" asChild>
//               <Pressable>
//                 <Text
//                   style={{
//                     fontSize: Typography.sizes.sm,
//                     color: colors.primary,
//                     fontWeight: Typography.weights.semibold,
//                   }}
//                 >
//                   Login
//                 </Text>
//               </Pressable>
//             </Link>
//           </View>

//           {/* Bottom Padding for Keyboard */}
//           <View style={{ height: Spacing.xl }} />
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </>
//   );
// }

// // // app/(app)/(auth)/register.tsx
// // import { Button, Input } from "@/components/ui";
// // import { Radius, Spacing, Typography } from "@/constants/Colors";
// // import { useTheme } from "@/hooks/useTheme";
// // import { supabase } from "@/lib/supabase";
// // import { useAuthStore } from "@/store/auth.store";
// // import * as Haptics from "expo-haptics";
// // import { Link, useRouter } from "expo-router";
// // import { useState } from "react";

// // import {
// //   Alert,
// //   KeyboardAvoidingView,
// //   Platform,
// //   Pressable,
// //   ScrollView,
// //   Text,
// //   View,
// // } from "react-native";

// // export default function RegisterScreen() {
// //   const { colors } = useTheme();
// //   const router = useRouter();
// //   const setSession = useAuthStore((state) => state.setSession);

// //   // Form state
// //   const [formData, setFormData] = useState({
// //     email: "",
// //     password: "",
// //     confirmPassword: "",
// //   });

// //   const [isLoading, setIsLoading] = useState(false);
// //   const [errors, setErrors] = useState({
// //     email: "",
// //     password: "",
// //     confirmPassword: "",
// //   });
// //   const [showPassword, setShowPassword] = useState(false);
// //   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

// //   // Update form field
// //   const updateField = (field: string, value: string) => {
// //     setFormData({ ...formData, [field]: value });
// //     // Clear error when user starts typing
// //     setErrors({ ...errors, [field]: "" });
// //   };

// //   // Validation
// //   const validateForm = () => {
// //     const newErrors = {
// //       email: "",
// //       password: "",
// //       confirmPassword: "",
// //     };

// //     // Email validation
// //     if (!formData.email) {
// //       newErrors.email = "Email is required";
// //     } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
// //       newErrors.email = "Enter a valid email address";
// //     }

// //     // Password validation
// //     if (!formData.password) {
// //       newErrors.password = "Password is required";
// //     } else if (formData.password.length < 8) {
// //       newErrors.password = "Password must be at least 8 characters";
// //     } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
// //       newErrors.password =
// //         "Password must include uppercase, lowercase, and number";
// //     }

// //     // Confirm password validation
// //     if (!formData.confirmPassword) {
// //       newErrors.confirmPassword = "Please confirm your password";
// //     } else if (formData.password !== formData.confirmPassword) {
// //       newErrors.confirmPassword = "Passwords do not match";
// //     }

// //     setErrors(newErrors);
// //     return !Object.values(newErrors).some((error) => error !== "");
// //   };

// //   const handleRegister = async () => {
// //     if (!validateForm()) {
// //       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
// //       return;
// //     }

// //     setIsLoading(true);
// //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// //     try {
// //       const {
// //         data: { session },
// //         error,
// //       } = await supabase.auth.signUp({
// //         email: formData.email,
// //         password: formData.password,
// //       });

// //       if (error) throw error;

// //       if (session) {
// //         setSession(session);
// //         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
// //       } else {
// //         // If email confirmation is enabled in Supabase
// //         Alert.alert(
// //           "Check Your Email",
// //           "A confirmation email has been sent. Please verify your email to complete registration.",
// //         );
// //         router.replace("/(app)/(auth)/login");
// //       }
// //     } catch (error: any) {
// //       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
// //       Alert.alert(
// //         "Registration Error",
// //         error.message || "An error occurred during registration.",
// //       );
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   return (
// //     <>
// //       <KeyboardAvoidingView
// //         behavior={Platform.OS === "ios" ? "padding" : "height"}
// //         style={{ flex: 1, backgroundColor: colors.background }}
// //       >
// //         <ScrollView
// //           showsVerticalScrollIndicator={false}
// //           contentContainerStyle={{
// //             flexGrow: 1,
// //             padding: Spacing.xl,
// //             paddingTop: Platform.OS === "ios" ? 60 : 40,
// //           }}
// //         >
// //           {/* Header */}
// //           <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
// //             <View
// //               style={{
// //                 width: 80,
// //                 height: 80,
// //                 backgroundColor: colors.primary,
// //                 borderRadius: Radius.xl,
// //                 alignItems: "center",
// //                 justifyContent: "center",
// //                 marginBottom: Spacing.md,
// //               }}
// //             >
// //               <Text style={{ fontSize: 40 }}>🚀</Text>
// //             </View>
// //             <Text
// //               style={{
// //                 fontSize: Typography.sizes.xxxl,
// //                 fontWeight: Typography.weights.bold,
// //                 color: colors.text,
// //                 marginBottom: Spacing.xs,
// //               }}
// //             >
// //               Create Account
// //             </Text>
// //             <Text
// //               style={{
// //                 fontSize: Typography.sizes.base,
// //                 color: colors.textSecondary,
// //                 textAlign: "center",
// //               }}
// //             >
// //               Sign up to start buying data and airtime
// //             </Text>
// //           </View>

// //           {/* Form */}
// //           <View style={{ marginBottom: Spacing.lg }}>
// //             {/* Email */}
// //             <Input
// //               label="Email Address"
// //               placeholder="you@example.com"
// //               value={formData.email}
// //               onChangeText={(text) => updateField("email", text.toLowerCase())}
// //               error={errors.email}
// //               keyboardType="email-address"
// //               autoCapitalize="none"
// //               leftIcon={<Text>📧</Text>}
// //               containerStyle={{ marginBottom: Spacing.md }}
// //             />

// //             {/* Password */}
// //             <Input
// //               label="Password"
// //               placeholder="Create a strong password"
// //               value={formData.password}
// //               onChangeText={(text) => updateField("password", text)}
// //               error={errors.password}
// //               secureTextEntry={!showPassword}
// //               leftIcon={<Text>🔒</Text>}
// //               rightIcon={
// //                 <Pressable
// //                   onPress={() => {
// //                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// //                     setShowPassword(!showPassword);
// //                   }}
// //                 >
// //                   <Text style={{ fontSize: 20 }}>
// //                     {showPassword ? "👁️" : "👁️‍🗨️"}
// //                   </Text>
// //                 </Pressable>
// //               }
// //               helperText="Min. 8 characters with uppercase, lowercase & number"
// //               containerStyle={{ marginBottom: Spacing.md }}
// //             />

// //             {/* Confirm Password */}
// //             <Input
// //               label="Confirm Password"
// //               placeholder="Re-enter your password"
// //               value={formData.confirmPassword}
// //               onChangeText={(text) => updateField("confirmPassword", text)}
// //               error={errors.confirmPassword}
// //               secureTextEntry={!showConfirmPassword}
// //               leftIcon={<Text>🔒</Text>}
// //               rightIcon={
// //                 <Pressable
// //                   onPress={() => {
// //                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
// //                     setShowConfirmPassword(!showConfirmPassword);
// //                   }}
// //                 >
// //                   <Text style={{ fontSize: 20 }}>
// //                     {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
// //                   </Text>
// //                 </Pressable>
// //               }
// //               containerStyle={{ marginBottom: Spacing.md }}
// //             />

// //             {/* Terms Agreement */}
// //             <View
// //               style={{
// //                 backgroundColor: colors.backgroundSecondary,
// //                 padding: Spacing.md,
// //                 borderRadius: Radius.md,
// //                 marginBottom: Spacing.sm,
// //               }}
// //             >
// //               <Text
// //                 style={{
// //                   fontSize: Typography.sizes.sm,
// //                   color: colors.textSecondary,
// //                   lineHeight: Typography.sizes.sm * 1.5,
// //                 }}
// //               >
// //                 By creating an account, you agree to our{" "}
// //                 <Link href="/(app)/(legal)/terms" asChild>
// //                   <Text
// //                     style={{
// //                       color: colors.primary,
// //                       fontWeight: Typography.weights.semibold,
// //                     }}
// //                   >
// //                     Terms of Service
// //                   </Text>
// //                 </Link>{" "}
// //                 and{" "}
// //                 <Link href="/(app)/(legal)/privacy" asChild>
// //                   <Text
// //                     style={{
// //                       color: colors.primary,
// //                       fontWeight: Typography.weights.semibold,
// //                     }}
// //                   >
// //                     Privacy Policy
// //                   </Text>
// //                 </Link>
// //               </Text>
// //             </View>
// //           </View>

// //           {/* Register Button */}
// //           <Button
// //             title="Create Account"
// //             onPress={handleRegister}
// //             loading={isLoading}
// //             fullWidth
// //             size="md"
// //             style={{ marginBottom: Spacing.md }}
// //           />

// //           {/* Login Link */}
// //           <View
// //             style={{
// //               flexDirection: "row",
// //               justifyContent: "center",
// //               alignItems: "center",
// //               marginBottom: Spacing.xl,
// //             }}
// //           >
// //             <Text
// //               style={{
// //                 fontSize: Typography.sizes.sm,
// //                 color: colors.textSecondary,
// //                 marginRight: Spacing.xs,
// //               }}
// //             >
// //               Already have an account?
// //             </Text>
// //             <Link href="/(app)/(auth)/login" asChild>
// //               <Pressable>
// //                 <Text
// //                   style={{
// //                     fontSize: Typography.sizes.sm,
// //                     color: colors.primary,
// //                     fontWeight: Typography.weights.semibold,
// //                   }}
// //                 >
// //                   Login
// //                 </Text>
// //               </Pressable>
// //             </Link>
// //           </View>

// //           {/* Bottom Padding for Keyboard */}
// //           <View style={{ height: Spacing.xl }} />
// //         </ScrollView>
// //       </KeyboardAvoidingView>
// //     </>
// //   );
// // }
