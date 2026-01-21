import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Sparkles } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

interface InterestSelectionScreenProps {
  onContinue: (interests: string[]) => void;
}

const interests = [
  "Music",
  "Art",
  "Food",
  "Coffee",
  "Sports",
  "Fitness",
  "Technology",
  "Gaming",
  "Photography",
  "Travel",
  "Fashion",
  "Nightlife",
  "Books",
  "Movies",
  "Concerts",
  "Outdoor",
  "Wellness",
  "Networking",
  "Business",
  "Crypto",
];

export function InterestSelectionScreen({
  onContinue,
}: InterestSelectionScreenProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const isValid = selectedInterests.length >= 3;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <LinearGradient
        colors={["#000000", "#1a1a1a", "#0f0f0f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Animated.View
          entering={FadeInDown.duration(600)}
          style={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Sparkles size={24} color="#f59e0b" strokeWidth={2} />
              <Text style={[styles.headerTitle, { marginLeft: 8 }]}>
                Your Interests
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Select at least 3 interests to personalize your experience
            </Text>
            <Text style={styles.selectedCount}>
              {selectedInterests.length} selected
            </Text>
          </View>

          {/* Interest Pills */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.pillsContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {interests.map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <TouchableOpacity
                  key={interest}
                  onPress={() => toggleInterest(interest)}
                  activeOpacity={0.7}
                  style={[
                    styles.pill,
                    isSelected ? styles.pillSelected : styles.pillUnselected,
                    { marginRight: 12, marginBottom: 12 },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      isSelected
                        ? styles.pillTextSelected
                        : styles.pillTextUnselected,
                    ]}
                  >
                    {interest}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={() => onContinue(selectedInterests)}
            disabled={!isValid}
            activeOpacity={0.1}
            style={[
              styles.continueButton,
              isValid
                ? styles.continueButtonEnabled
                : styles.continueButtonDisabled,
            ]}
          >
            <Text style={styles.continueButtonText}>
              {isValid
                ? "Continue"
                : `Select ${3 - selectedInterests.length} more`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    flex: 1,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#f5f5f0",
  },
  headerSubtitle: {
    color: "#a0a0a0",
  },
  selectedCount: {
    color: "#f59e0b",
    fontSize: 14,
    marginTop: 8,
  },
  scrollView: {
    flexGrow: 0,
    maxHeight: 400,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  pillSelected: {
    backgroundColor: "#f59e0b",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  pillUnselected: {
    backgroundColor: "rgba(23, 23, 23, 0.5)",
    borderWidth: 1,
    borderColor: "#262626",
  },
  pillText: {
    fontWeight: "500",
  },
  pillTextSelected: {
    color: "#000000",
  },
  pillTextUnselected: {
    color: "#d4d4d4",
  },
  continueButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 9999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 32,
  },
  continueButtonEnabled: {
    backgroundColor: "#f59e0b",
    shadowColor: "#f59e0b",
    elevation: 8,
    opacity: 1,
  },
  continueButtonDisabled: {
    backgroundColor: "#666666",
    shadowColor: "transparent",
    elevation: 0,
    opacity: 0.5,
  },
  continueButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 18,
  },
});
