// app/(app)/(protected)/contact.tsx
import { Button, Card } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type ContactMethod = {
  id: string;
  icon: string;
  label: string;
  value: string;
  description: string;
  action: () => void;
};

export default function ContactScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const contactMethods: ContactMethod[] = [
    // {
    //   id: "email",
    //   icon: "📧",
    //   label: "Email",
    //   value: "bimbodata@gmail.com",
    //   description: "We typically respond within 24 hours",
    //   action: () => {
    //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    //     Linking.openURL("mailto:bimbodata@gmail.com");
    //   },
    // },
    // {
    //   id: "phone",
    //   icon: "📞",
    //   label: "Phone",
    //   value: "+234 705 751 7841",
    //   description: "Mon - Fri, 9AM - 6PM WAT",
    //   action: () => {
    //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    //     Linking.openURL("tel:+2347057517841");
    //   },
    // },
    {
      id: "whatsapp",
      icon: "💬",
      label: "WhatsApp",
      value: "+234 705 751 7841",
      description: "Chat with us anytime",
      action: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL("https://wa.me/2347057517841");
      },
    },
  ];

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Required Fields", "Please fill in both subject and message");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);

    try {
      // Simulate API call - replace with actual implementation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Message Sent!",
        "Thank you for contacting us. We'll get back to you soon.",
        [
          {
            text: "OK",
            onPress: () => {
              setSubject("");
              setMessage("");
              router.back();
            },
          },
        ],
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
          }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.textSecondary,
            }}
          >
            We're here to help! Reach out through any of these channels
          </Text>
        </View>

        {/* Contact Methods */}
        <View
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.lg,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              marginBottom: Spacing.md,
            }}
          >
            Get in Touch
          </Text>

          {contactMethods.map((method) => (
            <Pressable
              key={method.id}
              onPress={method.action}
              style={({ pressed }) => ({
                backgroundColor: colors.card,
                borderRadius: Radius.lg,
                padding: Spacing.lg,
                marginBottom: Spacing.md,
                opacity: pressed ? 0.8 : 1,
                ...shadows.sm,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: colors.primary + "20",
                    borderRadius: Radius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: Spacing.md,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{method.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: Typography.sizes.lg,
                      fontWeight: Typography.weights.semibold,
                      color: colors.text,
                      marginBottom: Spacing.xs / 2,
                    }}
                  >
                    {method.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.sizes.base,
                      color: colors.primary,
                      marginBottom: Spacing.xs / 2,
                    }}
                  >
                    {method.value}
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.sizes.sm,
                      color: colors.textSecondary,
                    }}
                  >
                    {method.description}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                  →
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Contact Form */}
        <View
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.lg,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              marginBottom: Spacing.md,
            }}
          >
            Send Us a Message
          </Text>

          <Card variant="elevated" padding="md">
            <View style={{ marginBottom: Spacing.md }}>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semibold,
                  color: colors.text,
                  marginBottom: Spacing.xs,
                }}
              >
                Subject
              </Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your inquiry"
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  fontSize: Typography.sizes.base,
                  color: colors.text,
                }}
              />
            </View>

            <View style={{ marginBottom: Spacing.lg }}>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semibold,
                  color: colors.text,
                  marginBottom: Spacing.xs,
                }}
              >
                Message
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us how we can help you..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  fontSize: Typography.sizes.base,
                  color: colors.text,
                  minHeight: 120,
                }}
              />
            </View>

            <Button
              title={isSending ? "Sending..." : "Send Message"}
              onPress={handleSendMessage}
              loading={isSending}
              disabled={isSending || !subject.trim() || !message.trim()}
              fullWidth
              size="md"
            />
          </Card>
        </View>

        {/* Office Hours */}
        <View
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}
        >
          <Card variant="outlined" padding="md">
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: Spacing.sm,
              }}
            >
              <Text style={{ fontSize: 24, marginRight: Spacing.sm }}>🕒</Text>
              <Text
                style={{
                  fontSize: Typography.sizes.lg,
                  fontWeight: Typography.weights.bold,
                  color: colors.text,
                }}
              >
                Office Hours
              </Text>
            </View>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                lineHeight: 22,
              }}
            >
              Monday - Friday: 9:00 AM - 6:00 PM WAT{"\n"}
              Saturday: 10:00 AM - 4:00 PM WAT{"\n"}
              Sunday: Closed
            </Text>
          </Card>
        </View>

        {/* Address */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <Card variant="outlined" padding="md">
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: Spacing.sm,
              }}
            >
              <Text style={{ fontSize: 24, marginRight: Spacing.sm }}>📍</Text>
              <Text
                style={{
                  fontSize: Typography.sizes.lg,
                  fontWeight: Typography.weights.bold,
                  color: colors.text,
                }}
              >
                Our Location
              </Text>
            </View>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                lineHeight: 22,
              }}
            >
              123 VTU Services Plaza{"\n"}
              Victoria Island, Lagos{"\n"}
              Nigeria
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
