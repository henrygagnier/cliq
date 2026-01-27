import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ChevronRight } from "lucide-react-native";

interface DateOfBirthScreenProps {
  onContinue: (dateOfBirth: Date) => void;
}

export function DateOfBirthScreen({ onContinue }: DateOfBirthScreenProps) {
  const [date, setDate] = useState(new Date(2000, 0, 1));
  const [show, setShow] = useState(Platform.OS === "ios");

  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShow(Platform.OS === "ios");
    setDate(currentDate);
  };

  const handleContinue = () => {
    onContinue(date);
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const age = calculateAge(date);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>When's your birthday?</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>
            Your age will be visible on your card. You must be 13 or older to
            use Cliq.
          </Text>
        </View>

        {/* Date Picker */}
        <View style={styles.pickerContainer}>
          {Platform.OS === "ios" ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              onChange={onChange}
              textColor="#FFFFFF"
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              style={styles.picker}
            />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setShow(true)}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>
                  {date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </TouchableOpacity>
              {show && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="calendar"
                  onChange={onChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              )}
            </>
          )}

          {/* Age Display */}
          <View style={styles.ageDisplay}>
            <Text style={styles.ageLabel}>Your age:</Text>
            <Text style={styles.ageValue}>{age} years old</Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          style={styles.continueButton}
          activeOpacity={0.8}
          disabled={age < 13}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <ChevronRight width={20} height={20} color="#000000" />
        </TouchableOpacity>

        {age < 13 && (
          <Text style={styles.errorText}>
            You must be at least 13 years old to continue
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 48,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  divider: {
    width: 48,
    height: 4,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 16,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
  },
  pickerContainer: {
    alignItems: "center",
  },
  picker: {
    width: "100%",
    height: 200,
  },
  dateButton: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  dateButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  ageDisplay: {
    marginTop: 32,
    alignItems: "center",
  },
  ageLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 4,
  },
  ageValue: {
    color: "#D4AF37",
    fontSize: 24,
    fontWeight: "700",
  },
  spacer: {
    flex: 1,
  },
  continueButton: {
    backgroundColor: "#D4AF37",
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
  },
});
