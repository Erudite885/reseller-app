// app/(app)/(protected)/transaction-history.tsx
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useTransactions } from "@/hooks/useTransactions";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type FilterType = "all" | "data" | "airtime" | "wallet";

export default function TransactionHistoryScreen() {
  const { colors, shadows } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Fetch transactions from hook
  const {
    data: transactions = [],
    isLoading,
    refetch,
  } = useTransactions(50, 0);

  // Filter transactions based on type and search query
  const filteredTransactions = transactions.filter((txn) => {
    const matchesFilter = filter === "all" || txn.type === filter;
    const matchesSearch =
      searchQuery === "" ||
      txn.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.phone_number?.includes(searchQuery) ||
      txn.network.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.success;
      case "pending":
        return colors.warning;
      case "failed":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.successLight;
      case "pending":
        return colors.warningLight;
      case "failed":
        return colors.errorLight;
      default:
        return colors.backgroundSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "data":
        return "📱";
      case "airtime":
        return "📞";
      case "wallet":
        return "💰";
      default:
        return "📄";
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search Bar */}
      <View
        style={{ paddingHorizontal: Spacing.lg, marginVertical: Spacing.md }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 20, marginRight: Spacing.sm }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by phone or network"
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              paddingVertical: Spacing.md,
              fontSize: Typography.sizes.base,
              color: colors.text,
            }}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchQuery("");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                ✕
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm }}
        >
          {(["all", "data", "airtime", "wallet"] as FilterType[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f);
              }}
              style={{
                paddingHorizontal: Spacing.lg,
                paddingVertical: Spacing.sm,
                borderRadius: Radius.full,
                backgroundColor: filter === f ? colors.primary : colors.card,
                borderWidth: 1,
                borderColor: filter === f ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semibold,
                  color: filter === f ? "#FFFFFF" : colors.text,
                  textTransform: "capitalize",
                }}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Transaction List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
      >
        {isLoading ? (
          // Loading State
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: Spacing.xxl * 2,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                marginTop: Spacing.md,
              }}
            >
              Loading transactions...
            </Text>
          </View>
        ) : filteredTransactions.length === 0 ? (
          // Empty State
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: Spacing.xxl * 2,
            }}
          >
            <Text style={{ fontSize: 64, marginBottom: Spacing.lg }}>📭</Text>
            <Text
              style={{
                fontSize: Typography.sizes.lg,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
                marginBottom: Spacing.sm,
              }}
            >
              No Transactions Found
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              {searchQuery
                ? "Try adjusting your search"
                : "Your transactions will appear here"}
            </Text>
          </View>
        ) : (
          // Transaction Cards
          filteredTransactions.map((transaction) => (
            <Pressable
              key={transaction.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedTransaction(transaction);
              }}
              style={{
                backgroundColor: colors.card,
                borderRadius: Radius.md,
                padding: Spacing.md,
                marginBottom: Spacing.md,
                ...shadows.sm,
                // borderWidth: 1,
                // borderColor: colors.border,
                // overflow: "hidden",
              }}
            >
              {/* Top Section - Main Info */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: Spacing.md,
                  // alignItems: "center",
                  // paddingHorizontal: Spacing.lg,
                  // paddingTop: Spacing.lg,
                  // paddingBottom: Spacing.md,
                }}
              >
                {/* Left - Icon and Details */}
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    // gap: Spacing.md
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: Radius.md,
                      backgroundColor:
                        transaction.amount > 0
                          ? colors.backgroundSecondary + "20"
                          : colors.background + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: Spacing.md,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>
                      {getTransactionIcon(transaction.type)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      // justifyContent: "center"
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.base,
                        fontWeight: Typography.weights.semibold,
                        color: colors.text,
                        marginBottom: Spacing.xs / 2,
                        textTransform: "capitalize",
                      }}
                    >
                      {transaction.service}
                    </Text>
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                        // marginTop: 2,
                      }}
                    >
                      {transaction.network}
                      {transaction.phone_number &&
                        ` • ${transaction.phone_number}`}
                    </Text>
                  </View>
                </View>

                {/* Right - Amount */}
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: Typography.sizes.lg,
                      fontWeight: Typography.weights.bold,
                      color:
                        transaction.type === "airtime" ||
                        transaction.type === "data"
                          ? colors.error
                          : colors.success,
                      marginBottom: Spacing.xs,
                    }}
                  >
                    {transaction.type === "airtime" ||
                    transaction.type === "data"
                      ? "-"
                      : "+"}
                    ₦{formatCurrency(transaction.amount)}
                  </Text>
                  <View
                    style={{
                      backgroundColor: getStatusBgColor(transaction.status),
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 2,
                      borderRadius: Radius.full,
                      // marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.xs,
                        color: getStatusColor(transaction.status),
                        fontWeight: Typography.weights.medium,
                        textTransform: "capitalize",
                      }}
                    >
                      {transaction.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom Section - Date and Navigation */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  // paddingHorizontal: Spacing.lg,
                  // paddingVertical: Spacing.md,
                  marginTop: Spacing.xs,
                  paddingTop: Spacing.xs,
                  backgroundColor: colors.backgroundSecondary,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.xs,
                    color: colors.textSecondary,
                  }}
                >
                  {formatDate(transaction.created_at)} •{" "}
                  {formatTime(transaction.created_at)}
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.xs,
                    color: colors.primary,
                    fontWeight: Typography.weights.medium,
                  }}
                >
                  Details →
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: Spacing.md,
          }}
          onPress={() => {
            setSelectedTransaction(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              backgroundColor: colors.card,
              borderRadius: Radius.lg,
              padding: Spacing.lg,
              ...shadows.lg,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: Spacing.md,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.xl,
                  fontWeight: Typography.weights.bold,
                  color: colors.text,
                }}
              >
                Transaction Details
              </Text>
              <Pressable onPress={() => setSelectedTransaction(null)}>
                <Text style={{ fontSize: 24, color: colors.textSecondary }}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <View>
              {/* Amount */}
              <View
                style={{ alignItems: "center", paddingVertical: Spacing.xs }}
              >
                <Text
                  style={{
                    fontSize: 48,
                    fontWeight: Typography.weights.bold,
                    color:
                      selectedTransaction.type === "airtime" ||
                      selectedTransaction.type === "data"
                        ? colors.error
                        : colors.success,
                  }}
                >
                  {selectedTransaction.type === "airtime" ||
                  selectedTransaction.type === "data"
                    ? "-"
                    : "+"}
                  ₦{formatCurrency(selectedTransaction.amount)}
                </Text>
                <View
                  style={{
                    backgroundColor: getStatusBgColor(
                      selectedTransaction.status,
                    ),
                    paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.xs,
                    borderRadius: Radius.full,
                    marginTop: Spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      fontSize: Typography.sizes.sm,
                      color: getStatusColor(selectedTransaction.status),
                      fontWeight: Typography.weights.semibold,
                      textTransform: "capitalize",
                    }}
                  >
                    {selectedTransaction.status}
                  </Text>
                </View>
              </View>

              {/* Details */}
              <DetailRow label="Service" value={selectedTransaction.service} />
              <DetailRow label="Network" value={selectedTransaction.network} />
              {selectedTransaction.phone_number && (
                <DetailRow
                  label="Phone Number"
                  value={selectedTransaction.phone_number}
                />
              )}
              {selectedTransaction.data_plan && (
                <DetailRow
                  label="Data Plan"
                  value={selectedTransaction.data_plan}
                />
              )}
              {selectedTransaction.previous_balance && (
                <DetailRow
                  label="Previous Balance"
                  value={`₦${formatCurrency(selectedTransaction.previous_balance)}`}
                />
              )}
              {selectedTransaction.new_balance && (
                <DetailRow
                  label="New Balance"
                  value={`₦${formatCurrency(selectedTransaction.new_balance)}`}
                />
              )}
              <DetailRow
                label="Reference"
                value={selectedTransaction.reference}
              />
              {/* {selectedTransaction.provider_reference && (
                <DetailRow
                  label="Provider Reference"
                  value={selectedTransaction.provider_reference}
                />
              )} */}
              <DetailRow
                label="Date & Time"
                value={`${formatDate(selectedTransaction.created_at)}, ${formatTime(
                  selectedTransaction.created_at,
                )}`}
              />
              {selectedTransaction.error_message && (
                <DetailRow
                  label="Error Message"
                  value={selectedTransaction.error_message}
                />
              )}
            </View>

            {/* Action Buttons */}
            <View
              style={{
                flexDirection: "row",
                gap: Spacing.md,
                marginTop: Spacing.lg,
              }}
            >
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // TODO: Share receipt
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.backgroundSecondary,
                  paddingVertical: Spacing.md,
                  borderRadius: Radius.md,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    fontWeight: Typography.weights.semibold,
                    color: colors.text,
                  }}
                >
                  📤 Share
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // TODO: Download receipt
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  paddingVertical: Spacing.md,
                  borderRadius: Radius.md,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    fontWeight: Typography.weights.semibold,
                    color: "#FFFFFF",
                  }}
                >
                  💾 Receipt
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

// Helper component for detail rows
function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          fontSize: Typography.sizes.sm,
          color: colors.textSecondary,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: Typography.sizes.sm,
          color: colors.text,
          fontWeight: Typography.weights.medium,
          flex: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}