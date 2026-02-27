// app/(app)/(protected)/help.tsx
import { Card } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

type Category = {
  id: string;
  name: string;
  icon: string;
};

export default function HelpScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories: Category[] = [
    { id: "all", name: "All", icon: "📚" },
    { id: "account", name: "Account", icon: "👤" },
    { id: "wallet", name: "Wallet", icon: "💰" },
    { id: "data", name: "Data", icon: "📱" },
    { id: "airtime", name: "Airtime", icon: "📞" },
    { id: "technical", name: "Technical", icon: "🔧" },
  ];

  const faqs: FAQ[] = [
    {
      id: "1",
      category: "account",
      question: "How do I create an account?",
      answer:
        "To create an account, tap on the 'Sign Up' button on the login screen. Fill in your username, email, and password, then verify your email address through the link sent to your inbox.",
    },
    {
      id: "2",
      category: "account",
      question: "I forgot my password. What should I do?",
      answer:
        "On the login screen, tap 'Forgot Password'. Enter your registered email address, and we'll send you a password reset link. Follow the instructions in the email to set a new password.",
    },
    {
      id: "3",
      category: "wallet",
      question: "How do I fund my wallet?",
      answer:
        "You can fund your wallet by transferring money to your virtual account number displayed in the app. The funds will be credited automatically within minutes. You can also use card payments or bank transfers.",
    },
    {
      id: "4",
      category: "wallet",
      question: "What is the minimum wallet balance required?",
      answer:
        "There is no minimum balance required to maintain your wallet. However, you need sufficient balance to complete transactions. Each service has its own minimum purchase amount.",
    },
    {
      id: "5",
      category: "wallet",
      question: "How long does it take for wallet funding to reflect?",
      answer:
        "Wallet funding through virtual account transfers typically reflects within 1-5 minutes. Card payments are instant, while bank transfers may take up to 30 minutes depending on your bank.",
    },
    {
      id: "6",
      category: "data",
      question: "How do I buy data?",
      answer:
        "From the home screen, select 'Data' as the service type, enter the phone number, choose your preferred network and data plan, then tap 'Buy Data Now'. The data will be delivered instantly.",
    },
    {
      id: "7",
      category: "data",
      question: "Can I buy data for another person?",
      answer:
        "Yes! You can purchase data for any phone number. Simply enter the recipient's phone number when making the purchase. The data will be sent directly to their number.",
    },
    {
      id: "8",
      category: "data",
      question: "What happens if my data purchase fails?",
      answer:
        "If a data purchase fails, your wallet balance will be automatically refunded within 5-10 minutes. If the refund doesn't appear, please contact our support team with your transaction reference.",
    },
    {
      id: "9",
      category: "airtime",
      question: "What is the minimum airtime I can purchase?",
      answer:
        "The minimum airtime purchase amount is ₦50. There's no maximum limit, but ensure you have sufficient wallet balance to complete the transaction.",
    },
    {
      id: "10",
      category: "airtime",
      question: "Can I buy airtime for all networks?",
      answer:
        "Yes, we support all major Nigerian networks including MTN, Airtel, Glo, and 9mobile. Select your preferred network when making a purchase.",
    },
    {
      id: "11",
      category: "airtime",
      question: "How quickly is airtime delivered?",
      answer:
        "Airtime is delivered instantly to the recipient's phone number. In rare cases of network delays, it may take up to 5 minutes. If you don't receive it within 10 minutes, contact support.",
    },
    {
      id: "12",
      category: "technical",
      question: "The app is not working properly. What should I do?",
      answer:
        "Try these steps: 1) Close and restart the app, 2) Check your internet connection, 3) Update to the latest app version, 4) Clear app cache in your phone settings. If the issue persists, contact support.",
    },
    {
      id: "13",
      category: "technical",
      question: "How do I enable notifications?",
      answer:
        "Go to Settings > Preferences > Notifications and toggle it on. You may need to grant notification permissions in your phone's settings as well.",
    },
    {
      id: "14",
      category: "technical",
      question: "Is my payment information secure?",
      answer:
        "Yes, we use industry-standard encryption and security measures to protect your payment information. We never store your card details on our servers. All transactions are processed through secure, PCI-compliant payment gateways.",
    },
    {
      id: "15",
      category: "wallet",
      question: "Can I withdraw money from my wallet?",
      answer:
        "Currently, wallet funds can only be used for purchasing services within the app. We're working on adding withdrawal features in future updates.",
    },
    {
      id: "16",
      category: "account",
      question: "How do I update my profile information?",
      answer:
        "Go to Settings > Edit Profile. Here you can update your username, email, phone number, and other personal details. Some changes may require verification.",
    },
    {
      id: "17",
      category: "account",
      question: "Can I delete my account?",
      answer:
        "Yes, you can delete your account from Settings. Please note this action is permanent and cannot be undone. All your data will be permanently deleted.",
    },
    {
      id: "18",
      category: "data",
      question: "Do data plans expire?",
      answer:
        "Yes, data plans have validity periods set by the network providers. The validity is usually displayed in the plan details (e.g., '1GB - 30 Days'). Check with your network provider for specific expiration details.",
    },
  ];

  const filteredFAQs =
    selectedCategory === "all"
      ? faqs
      : faqs.filter((faq) => faq.category === selectedCategory);

  const toggleExpand = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            gap: Spacing.sm,
            marginVertical: Spacing.lg,
          }}
        >
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(category.id);
              }}
              style={{
                paddingHorizontal: Spacing.lg,
                paddingVertical: Spacing.sm,
                borderRadius: Radius.full,
                backgroundColor:
                  selectedCategory === category.id
                    ? colors.primary
                    : colors.card,
                borderWidth: 1,
                borderColor:
                  selectedCategory === category.id
                    ? colors.primary
                    : colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 16, marginRight: Spacing.xs / 2 }}>
                  {category.icon}
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    fontWeight: Typography.weights.semibold,
                    color:
                      selectedCategory === category.id
                        ? "#FFFFFF"
                        : colors.text,
                  }}
                >
                  {category.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* FAQ List */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq, index) => (
              <Pressable
                key={faq.id}
                onPress={() => toggleExpand(faq.id)}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: Radius.lg,
                  marginBottom: Spacing.md,
                  overflow: "hidden",
                  ...shadows.sm,
                }}
              >
                {/* Question */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: Spacing.lg,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: Typography.sizes.base,
                      fontWeight: Typography.weights.semibold,
                      color: colors.text,
                      marginRight: Spacing.md,
                    }}
                  >
                    {faq.question}
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      color: colors.primary,
                      transform: [
                        {
                          rotate: expandedId === faq.id ? "180deg" : "0deg",
                        },
                      ],
                    }}
                  >
                    ▼
                  </Text>
                </View>

                {/* Answer */}
                {expandedId === faq.id && (
                  <View
                    style={{
                      paddingHorizontal: Spacing.lg,
                      paddingBottom: Spacing.lg,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.base,
                        color: colors.textSecondary,
                        lineHeight: 22,
                        marginTop: Spacing.md,
                      }}
                    >
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))
          ) : (
            <Card variant="outlined" padding="lg">
              <View
                style={{ alignItems: "center", paddingVertical: Spacing.lg }}
              >
                <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>
                  🔍
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  No FAQs found in this category
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Still Need Help? */}
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl }}>
          <Card variant="elevated" padding="lg">
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 32, marginBottom: Spacing.sm }}>💬</Text>
              <Text
                style={{
                  fontSize: Typography.sizes.lg,
                  fontWeight: Typography.weights.bold,
                  color: colors.text,
                  marginBottom: Spacing.xs,
                  textAlign: "center",
                }}
              >
                Still Need Help?
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginBottom: Spacing.lg,
                }}
              >
                Can't find what you're looking for? Our support team is here to
                help!
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(app)/(protected)/contact");
                }}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: Spacing.xl,
                  paddingVertical: Spacing.md,
                  borderRadius: Radius.md,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    fontWeight: Typography.weights.semibold,
                    color: "#FFFFFF",
                  }}
                >
                  Contact Support
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>

        {/* Quick Stats */}
        <View
          style={{
            paddingHorizontal: Spacing.lg,
            marginTop: Spacing.lg,
            flexDirection: "row",
            gap: Spacing.md,
          }}
        >
          <Card variant="outlined" padding="md" style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Typography.sizes.xxl,
                fontWeight: Typography.weights.bold,
                color: colors.primary,
                marginBottom: Spacing.xs / 2,
              }}
            >
              24/7
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.textSecondary,
              }}
            >
              Support Available
            </Text>
          </Card>

          <Card variant="outlined" padding="md" style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Typography.sizes.xxl,
                fontWeight: Typography.weights.bold,
                color: colors.success,
                marginBottom: Spacing.xs / 2,
              }}
            >
              &lt;5min
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.textSecondary,
              }}
            >
              Avg. Response
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
