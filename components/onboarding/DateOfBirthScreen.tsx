import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { CalendarDays } from "lucide-react-native";

interface DateOfBirthScreenProps {
  onContinue: (dobIso: string) => void;
}

const MIN_AGE = 13;

function formatDobInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [] as string[];

  if (digits.length >= 2) {
    parts.push(digits.slice(0, 2));
  } else if (digits.length > 0) {
    parts.push(digits);
  }

  if (digits.length >= 4) {
    parts.push(digits.slice(2, 4));
  } else if (digits.length > 2) {
    parts.push(digits.slice(2));
  }

  if (digits.length > 4) {
    parts.push(digits.slice(4));
  }

  return parts.join("/");
}

function calculateAge(dobIso?: string | null): number | null {
  if (!dobIso) return null;
  const dobDate = new Date(dobIso);
  if (Number.isNaN(dobDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const monthDiff = today.getMonth() - dobDate.getMonth();
  const dayDiff = today.getDate() - dobDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function parseDob(value: string): { iso: string; age: number } | null {
  if (value.length !== 10) return null; // Expect MM/DD/YYYY

  const [monthStr, dayStr, yearStr] = value.split("/");
  const month = Number(monthStr);
  const day = Number(dayStr);
  const year = Number(yearStr);

  if (
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 1900
  ) {
    return null;
  }

  const dob = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dob.getTime()) || dob.getUTCDate() !== day) return null;

  const iso = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  const age = calculateAge(iso);

  return { iso, age };
}

export function DateOfBirthScreen({ onContinue }: DateOfBirthScreenProps) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseDob(input), [input]);

  const handleChange = (text: string) => {
    setError(null);
    setInput(formatDobInput(text));
  };

  const handleContinue = () => {
    if (input.length === 10) {
      const result = parseDob(input);
      if (result) {
        onContinue(result.iso);
      } else {
        setError("Enter a valid date in MM/DD/YYYY format.");
      }
    } else {
      setError("Enter a valid date in MM/DD/YYYY format.");
    }
  };

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
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <CalendarDays size={24} color="#f59e0b" strokeWidth={2} />
              <Text style={[styles.headerTitle, { marginLeft: 8 }]}>
                When's your birthday?
              </Text>
            </View>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.label}>Date of birth</Text>
            <TextInput
              value={input}
              onChangeText={handleChange}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
              returnKeyType="done"
            />

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <TouchableOpacity
            onPress={handleContinue}
            disabled={!input || input.length !== 10 || !parsed}
            activeOpacity={0.1}
            style={[
              styles.continueButton,
              input.length === 10 && parsed
                ? styles.continueButtonEnabled
                : styles.continueButtonDisabled,
            ]}
          >
            <Text style={styles.continueButtonText}>
              {input.length === 10 && parsed
                ? "Continue"
                : "Enter your birthday"}
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
    paddingHorizontal: 12,
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
    fontSize: 14,
  },
  inputCard: {
    backgroundColor: "rgba(23, 23, 23, 0.6)",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  label: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#404040",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: "#f9fafb",
    fontSize: 18,
    backgroundColor: "rgba(38, 38, 38, 0.6)",
    letterSpacing: 0.6,
  },
  helperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  helperDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: "#f59e0b",
  },
  helperText: {
    color: "#9ca3af",
    fontSize: 13,
    flex: 1,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewLabel: {
    color: "#d1d5db",
    fontWeight: "600",
  },
  ageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: "rgba(107, 114, 128, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.4)",
  },
  ageBadgeText: {
    color: "#d1d5db",
    fontWeight: "700",
    fontSize: 18,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    marginTop: 4,
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
