// components/PlanCarousel.tsx

import React, { useState, useRef } from "react";
import { View, Text, Pressable, FlatList, Dimensions } from "react-native";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import * as Haptics from "expo-haptics";

const PLANS_PER_PAGE = 15;

interface Plan {
  plan_id: number;
  plan_name: string;
  price: number;
  validity: string;
}

interface PlanCarouselProps {
  plans: Plan[];
  selectedPlanId: number | null;
  onSelectPlan: (planId: number) => void;
  colors: any;
  shadows: any;
}

export function PlanCarousel({
  plans,
  selectedPlanId,
  onSelectPlan,
  colors,
  shadows,
}: PlanCarouselProps) {
  const totalPages = Math.ceil(plans.length / PLANS_PER_PAGE);
  const [page, setPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const pages = Array.from({ length: totalPages }, (_, i) =>
    plans.slice(i * PLANS_PER_PAGE, (i + 1) * PLANS_PER_PAGE),
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setPage(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  if (plans.length === 0) return null;

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyExtractor={(_, index) => `page-${index}`}
        renderItem={({ item: pagePlans }) => (
          <View
            style={{ width: Dimensions.get("window").width - Spacing.sm * 2 }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: Spacing.sm,
                paddingHorizontal: Spacing.xs,
              }}
            >
              {pagePlans.map((plan: Plan) => {
                const isSelected: boolean = selectedPlanId === plan.plan_id;
                return (
                  <Pressable
                    key={`${plan.plan_id}-${plan.price}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onSelectPlan(plan.plan_id);
                    }}
                    style={{
                      width: "30%",
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.card,
                      borderRadius: Radius.md,
                      padding: Spacing.md,
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: colors.border,
                      ...shadows.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: Radius.full,
                        borderWidth: 2,
                        borderColor: isSelected ? "#FFFFFF" : colors.border,
                        backgroundColor: isSelected ? "#FFFFFF" : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: Spacing.sm,
                      }}
                    >
                      {isSelected && (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: Radius.full,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>

                    <Text
                      style={{
                        fontSize: Typography.sizes.xs * 1.33,
                        fontWeight: Typography.weights.bold,
                        color: isSelected ? "#FFFFFF" : colors.text,
                        marginBottom: Spacing.xs / 2,
                      }}
                      numberOfLines={1}
                    >
                      {plan.plan_name}
                    </Text>

                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        fontWeight: Typography.weights.semibold,
                        color: isSelected ? "#FFFFFF" : colors.primary,
                        marginBottom: Spacing.xs / 2,
                      }}
                    >
                      ₦{plan.price.toLocaleString()}
                    </Text>

                    <Text
                      style={{
                        fontSize: Typography.sizes.xs,
                        color: isSelected
                          ? "rgba(255, 255, 255, 0.8)"
                          : colors.textSecondary,
                      }}
                    >
                      {plan.validity}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      {totalPages > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: Spacing.sm,
            marginTop: Spacing.md,
          }}
        >
          {Array.from({ length: totalPages }).map((_, i) => (
            <Pressable
              key={i}
              onPress={() =>
                flatListRef.current?.scrollToIndex({ index: i, animated: true })
              }
            >
              <View
                style={{
                  width: i === page ? 24 : 8,
                  height: 8,
                  borderRadius: Radius.full,
                  backgroundColor: i === page ? colors.primary : colors.border,
                }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
