// app/(app)/(legal)/privacy.tsx

import React from "react";
import {
  View,
  ScrollView,
  Text,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useResellerLegal } from "@/hooks/useResellerLegal";
import { Typography } from "@/constants/Colors";

export default function Privacy() {
  const { colors } = useTheme();
  const { data, isLoading } = useResellerLegal();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 8,
      color: colors.text,
    },
    paragraph: {
      fontSize: 12,
      lineHeight: 20,
      textAlign: "justify" as const,
      marginBottom: 4,
      color: colors.textSecondary,
    },
    emailLink: {
      textDecorationLine: "underline" as const,
      color: "#1E90FF",
    },
  });

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const renderFormattedText = (text: string): (React.ReactNode | string)[] => {
    const lines = text.trim().split("\n");

    return lines.map((line: string, index: number) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) return null;

      if (/^\d+\.\s/.test(trimmedLine) || index === 0) {
        return (
          <Text key={index} style={styles.sectionTitle}>
            {trimmedLine}
          </Text>
        );
      }

      // Make emails clickable
      if (trimmedLine.includes("@")) {
        const emailMatch = trimmedLine.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
        if (emailMatch) {
          const parts = trimmedLine.split(emailMatch[0]);
          return (
            <Text key={index} style={styles.paragraph}>
              {parts[0]}
              <Text
                style={styles.emailLink}
                onPress={() => Linking.openURL(`mailto:${emailMatch[0]}`)}
              >
                {emailMatch[0]}
              </Text>
              {parts[1]}
            </Text>
          );
        }
      }

      return (
        <Text key={index} style={styles.paragraph}>
          {trimmedLine}
        </Text>
      );
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {data?.privacyPolicy && renderFormattedText(data.privacyPolicy)}
      </ScrollView>
    </View>
  );
}

// import React from "react";
// import { View, ScrollView, Text, Linking, StyleSheet } from "react-native";
// import { privacyPolicy } from "@/constants/helpers";
// import { useTheme } from "@/hooks/useTheme";

// export default function Privacy() {
//   const { colors } = useTheme();

//   const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       paddingHorizontal: 16,
//       // paddingVertical: 24,
//       backgroundColor: colors.background,
//     },
//     sectionTitle: {
//       fontSize: 16,
//       fontWeight: "bold",
//       // marginTop: 12,
//       marginBottom: 8,
//       color: colors.text,
//     },
//     paragraph: {
//       fontSize: 12,
//       lineHeight: 20,
//       textAlign: "justify" as const,
//       marginBottom: 4,
//       color: colors.textSecondary,
//     },
//     emailLink: {
//       textDecorationLine: "underline" as const,
//       color: "#1E90FF",
//     },
//     phoneLink: {
//       textDecorationLine: "underline" as const,
//       color: colors.primary,
//     },
//   });

//   const renderFormattedText = (text: string): (React.ReactNode | string)[] => {
//     const lines = text.trim().split("\n");

//     return lines.map((line: string, index: number) => {
//       const trimmedLine = line.trim();

//       // Skip empty lines
//       if (!trimmedLine) {
//         return null;
//       }

//       // Render section titles (like "1. Consent")
//       if (/^\d+\.\s/.test(trimmedLine) || index === 0) {
//         return (
//           <Text key={index} style={styles.sectionTitle}>
//             {trimmedLine}
//           </Text>
//         );
//       }

//       // Render email as a clickable link
//       if (trimmedLine.includes("alheridata@gmail.com")) {
//         const parts = trimmedLine.split("alheridata@gmail.com");
//         return (
//           <Text key={index} style={styles.paragraph}>
//             {parts[0]}
//             <Text
//               style={styles.emailLink}
//               onPress={() =>
//                 Linking.openURL("mailto:alheridata@gmail.com")
//               }
//             >
//               alheridata@gmail.com
//             </Text>
//             {parts[1]}
//           </Text>
//         );
//       }

//       // Render phone numbers as WhatsApp links
//       const phoneRegex = /\+234\d{10}/g;
//       const matches = [...trimmedLine.matchAll(phoneRegex)];

//       if (matches.length > 0) {
//         const segments: (string | React.ReactElement)[] = [];
//         let lastIndex = 0;

//         matches.forEach((match, i) => {
//           const start = match.index || 0;
//           const end = start + match[0].length;

//           // Add text before the match
//           if (start > lastIndex) {
//             segments.push(trimmedLine.slice(lastIndex, start));
//           }

//           // Add clickable phone
//           segments.push(
//             <Text
//               key={`phone-${index}-${i}`}
//               style={styles.phoneLink}
//               onPress={() =>
//                 Linking.openURL(`https://wa.me/${match[0].replace("+", "")}`)
//               }
//             >
//               {match[0]}
//             </Text>,
//           );

//           lastIndex = end;
//         });

//         // Add any trailing text after last match
//         if (lastIndex < trimmedLine.length) {
//           segments.push(trimmedLine.slice(lastIndex));
//         }

//         return (
//           <Text key={index} style={styles.paragraph}>
//             {segments}
//           </Text>
//         );
//       }

//       // Default paragraph
//       return (
//         <Text key={index} style={styles.paragraph}>
//           {trimmedLine}
//         </Text>
//       );
//     });
//   };

//   return (
//     <View style={styles.container}>
//       <ScrollView showsVerticalScrollIndicator={false}>
//         {renderFormattedText(privacyPolicy)}
//       </ScrollView>
//     </View>
//   );
// }
