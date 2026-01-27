import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Check, Plus } from "lucide-react-native";

interface PersonalizeCardScreenProps {
  onContinue: (data: { bio?: string; interests?: string[] }) => void;
}

const INTERESTS = [
  "Sports",
  "Music",
  "Tech",
  "Business",
  "Travel",
  "Food",
  "Art",
  "Fitness",
  "Gaming",
  "Fashion",
  "Photography",
  "Movies",
];

export function PersonalizeCardScreen({
  onContinue,
}: PersonalizeCardScreenProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [bio, setBio] = useState("");

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length < 3) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const addCustomInterest = () => {
    const trimmed = customInput.trim();
    if (
      trimmed &&
      !customInterests.includes(trimmed) &&
      !INTERESTS.includes(trimmed)
    ) {
      setCustomInterests([...customInterests, trimmed]);
      setCustomInput("");
      // Auto-select if less than 3 selected
      if (selectedInterests.length < 3) {
        setSelectedInterests([...selectedInterests, trimmed]);
      }
    }
  };

  const isSelected = (interest: string) => selectedInterests.includes(interest);

  const allInterests = [...INTERESTS, ...customInterests];

  const handleContinue = () => {
    onContinue({ bio, interests: selectedInterests });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Personalize your card</Text>
          <Text style={styles.subtitle}>
            Add interests and a bio (select 3)
          </Text>
          <View style={styles.divider} />
        </View>

        {/* Interests Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <Text style={styles.selectedCount}>
              {selectedInterests.length}/3 selected
            </Text>
          </View>

          <View style={styles.interestsGrid}>
            {allInterests.map((interest) => (
              <TouchableOpacity
                key={interest}
                onPress={() => toggleInterest(interest)}
                disabled={
                  !isSelected(interest) && selectedInterests.length >= 3
                }
                style={[
                  styles.interestChip,
                  isSelected(interest) && styles.interestChipSelected,
                  !isSelected(interest) &&
                    selectedInterests.length >= 3 &&
                    styles.interestChipDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.interestText,
                    isSelected(interest) && styles.interestTextSelected,
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Custom Interest */}
          <View style={styles.customInputContainer}>
            <TextInput
              value={customInput}
              onChangeText={setCustomInput}
              onSubmitEditing={addCustomInterest}
              placeholder="Add a custom interest..."
              placeholderTextColor="#6B7280"
              style={styles.customInput}
            />
            <TouchableOpacity
              onPress={addCustomInterest}
              style={styles.addButton}
              activeOpacity={0.8}
            >
              <Plus width={20} height={20} color="#000000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create bio (optional)</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself..."
            placeholderTextColor="#6B7280"
            style={styles.bioInput}
            multiline
            numberOfLines={5}
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        {/* Finish Button */}
        <TouchableOpacity
          onPress={handleContinue}
          style={styles.finishButton}
          activeOpacity={0.8}
        >
          <Check width={20} height={20} color="#000000" />
          <Text style={styles.finishButtonText}>Finish Cliqcard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "400",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  divider: {
    width: 48,
    height: 4,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#D1D5DB",
    fontWeight: "400",
  },
  selectedCount: {
    fontSize: 14,
    color: "#D4AF37",
    fontWeight: "500",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  interestChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
  },
  interestChipSelected: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
    shadowColor: "#FBBF24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  interestChipDisabled: {
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    opacity: 0.5,
  },
  interestText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "400",
  },
  interestTextSelected: {
    color: "#000000",
    fontWeight: "500",
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#D4AF37",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bioInput: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: "#FFFFFF",
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 8,
  },
  finishButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  finishButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
});
