import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { Ionicons, Feather } from "@expo/vector-icons";

interface CreateOfferModalProps {
  visible: boolean;
  onClose: () => void;
  businessId: string;
  hotspotId?: string | null;
  onOfferCreated: () => void;
}

export default function CreateOfferModal({
  visible,
  onClose,
  businessId,
  hotspotId,
  onOfferCreated,
}: CreateOfferModalProps) {
  const [offerCategory, setOfferCategory] = useState<
    "custom" | "loyalty" | "ai"
  >("custom");
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerType, setOfferType] = useState("percentage");
  const [offerValue, setOfferValue] = useState("");
  const [offerDuration, setOfferDuration] = useState("7");
  const [durationUnit, setDurationUnit] = useState<"hours" | "days">("days");
  const [redemptionLimit, setRedemptionLimit] = useState("unlimited");
  const [customRedemptionLimit, setCustomRedemptionLimit] = useState("");
  const [loyaltyCheckIns, setLoyaltyCheckIns] = useState("5");
  const [loyaltyReward, setLoyaltyReward] = useState("");
  const [loyaltyMode, setLoyaltyMode] = useState<"checkins" | "purchases">(
    "checkins",
  );
  const [loyaltyProduct, setLoyaltyProduct] = useState("");
  const [selectedAIOption, setSelectedAIOption] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const aiOfferSuggestions = [
    {
      id: 1,
      title: "First-Time Visitor",
      description: "15% off your first visit",
      type: "percentage",
      value: "15",
      duration: "30",
      category: "New Customer",
    },
    {
      id: 2,
      title: "Student Discount",
      description: "10% off with valid student ID",
      type: "percentage",
      value: "10",
      duration: "90",
      category: "Demographic",
    },
    {
      id: 3,
      title: "Weekend Special",
      description: "20% off all weekend long",
      type: "percentage",
      value: "20",
      duration: "7",
      category: "Time-Based",
    },
    {
      id: 4,
      title: "Early Bird Deal",
      description: "$5 off purchases before noon",
      type: "fixed",
      value: "5",
      duration: "14",
      category: "Time-Based",
    },
    {
      id: 5,
      title: "Bundle & Save",
      description: "Buy 2, get 25% off",
      type: "percentage",
      value: "25",
      duration: "30",
      category: "Volume Deal",
    },
    {
      id: 6,
      title: "Flash Sale",
      description: "30% off - Limited time only!",
      type: "percentage",
      value: "30",
      duration: "3",
      category: "Limited Offer",
    },
  ];

  const handleCreateOffer = async () => {
    if (!offerTitle.trim()) {
      Alert.alert("Error", "Please enter an offer title");
      return;
    }

    if (offerCategory === "custom" && !offerValue.trim()) {
      Alert.alert("Error", "Please enter an offer value");
      return;
    }

    try {
      setCreating(true);

      let finalTitle = offerTitle;
      let finalDescription = offerDescription;
      let finalValue = offerValue;
      let finalType = offerType;
      let finalDuration = offerDuration;
      let finalRedemptionLimit =
        redemptionLimit === "unlimited" ? "unlimited" : customRedemptionLimit;

      // If using AI suggestion
      if (offerCategory === "ai" && selectedAIOption !== null) {
        const selectedOffer = aiOfferSuggestions.find(
          (o) => o.id === selectedAIOption,
        );
        if (selectedOffer) {
          finalTitle = selectedOffer.title;
          finalDescription = selectedOffer.description;
          finalValue = selectedOffer.value;
          finalType = selectedOffer.type;
          finalDuration = selectedOffer.duration;
        }
      }

      // Calculate expiry date
      const expiresAt = new Date();
      if (durationUnit === "hours") {
        expiresAt.setHours(expiresAt.getHours() + parseInt(finalDuration));
      } else {
        expiresAt.setDate(expiresAt.getDate() + parseInt(finalDuration));
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const offerData = {
        business_id: businessId,
        hotspot_id: hotspotId || null,
        title: finalTitle,
        description: finalDescription,
        offer_type: finalType,
        offer_value: finalValue,
        expires_at: expiresAt.toISOString(),
        redemption_limit: finalRedemptionLimit,
        is_active: true,
        offer_category: offerCategory,
        created_by: user?.id || null,
      };

      const { error } = await supabase
        .from("business_offers")
        .insert([offerData]);

      if (error) throw error;

      Alert.alert("Success", "Offer created successfully!");
      onOfferCreated();
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error creating offer:", error);
      Alert.alert("Error", "Failed to create offer. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setOfferTitle("");
    setOfferDescription("");
    setOfferValue("");
    setOfferDuration("7");
    setDurationUnit("days");
    setRedemptionLimit("unlimited");
    setCustomRedemptionLimit("");
    setLoyaltyCheckIns("5");
    setLoyaltyReward("");
    setLoyaltyProduct("");
    setSelectedAIOption(null);
    setOfferCategory("custom");
  };

  const selectAIOffer = (offerId: number) => {
    const offer = aiOfferSuggestions.find((o) => o.id === offerId);
    if (offer) {
      setSelectedAIOption(offerId);
      setOfferTitle(offer.title);
      setOfferDescription(offer.description);
      setOfferType(offer.type);
      setOfferValue(offer.value);
      setOfferDuration(offer.duration);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Create Offer</Text>
              <Text style={styles.headerSubtitle}>
                Set up a new promotion for your business
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#a3a3a3" />
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryTabsContainer}>
            {[
              { id: "custom", label: "Custom", icon: "create-outline" },
              { id: "loyalty", label: "Loyalty", icon: "heart-outline" },
              { id: "ai", label: "AI Suggestions", icon: "sparkles-outline" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setOfferCategory(tab.id as any)}
                style={[
                  styles.categoryTab,
                  offerCategory === tab.id
                    ? styles.categoryTabActive
                    : styles.categoryTabInactive,
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={offerCategory === tab.id ? "white" : "#a3a3a3"}
                />
                <Text
                  style={[
                    styles.categoryTabText,
                    offerCategory === tab.id
                      ? styles.categoryTabTextActive
                      : styles.categoryTabTextInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scrollable Content */}
          <ScrollView style={styles.scrollContent}>
            {/* Custom Offer Form */}
            {offerCategory === "custom" && (
              <View style={styles.formSection}>
                <View>
                  <Text style={styles.inputLabel}>Offer Title</Text>
                  <TextInput
                    value={offerTitle}
                    onChangeText={setOfferTitle}
                    style={styles.textInput}
                    placeholder="e.g., 2-for-1 Happy Hour"
                    placeholderTextColor="#737373"
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    value={offerDescription}
                    onChangeText={setOfferDescription}
                    style={[styles.textInput, styles.textInputMultiline]}
                    placeholder="Describe your offer..."
                    placeholderTextColor="#737373"
                    multiline
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Offer Type</Text>
                  <View style={styles.optionRow}>
                    {[
                      { id: "percentage", label: "% Off" },
                      { id: "fixed", label: "$ Off" },
                      { id: "bogo", label: "BOGO" },
                      { id: "free_item", label: "Free Item" },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        onPress={() => setOfferType(type.id)}
                        style={[
                          styles.optionButton,
                          offerType === type.id
                            ? styles.optionButtonActive
                            : styles.optionButtonInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            offerType === type.id
                              ? styles.optionButtonTextActive
                              : styles.optionButtonTextInactive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {offerType !== "bogo" && offerType !== "free_item" && (
                  <View>
                    <Text style={styles.inputLabel}>
                      {offerType === "percentage"
                        ? "Discount Percentage"
                        : "Discount Amount"}
                    </Text>
                    <TextInput
                      value={offerValue}
                      onChangeText={setOfferValue}
                      style={styles.textInput}
                      placeholder={
                        offerType === "percentage" ? "e.g., 20" : "e.g., 5"
                      }
                      placeholderTextColor="#737373"
                      keyboardType="numeric"
                    />
                  </View>
                )}

                <View>
                  <Text style={styles.inputLabel}>Duration</Text>
                  <View style={styles.optionRow}>
                    <TextInput
                      value={offerDuration}
                      onChangeText={setOfferDuration}
                      style={[styles.textInput, styles.flexOne]}
                      placeholder="7"
                      placeholderTextColor="#737373"
                      keyboardType="numeric"
                    />
                    <View style={styles.optionRow}>
                      <TouchableOpacity
                        onPress={() => setDurationUnit("hours")}
                        style={[
                          styles.durationButton,
                          durationUnit === "hours"
                            ? styles.optionButtonActive
                            : styles.optionButtonInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            durationUnit === "hours"
                              ? styles.optionButtonTextActive
                              : styles.optionButtonTextInactive,
                          ]}
                        >
                          Hours
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setDurationUnit("days")}
                        style={[
                          styles.durationButton,
                          durationUnit === "days"
                            ? styles.optionButtonActive
                            : styles.optionButtonInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            durationUnit === "days"
                              ? styles.optionButtonTextActive
                              : styles.optionButtonTextInactive,
                          ]}
                        >
                          Days
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Redemption Limit</Text>
                  <View style={[styles.optionRow, styles.marginBottom8]}>
                    {["unlimited", "50", "100", "custom"].map((limit) => (
                      <TouchableOpacity
                        key={limit}
                        onPress={() => setRedemptionLimit(limit)}
                        style={[
                          styles.optionButton,
                          redemptionLimit === limit
                            ? styles.optionButtonActive
                            : styles.optionButtonInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionButtonText,
                            redemptionLimit === limit
                              ? styles.optionButtonTextActive
                              : styles.optionButtonTextInactive,
                          ]}
                        >
                          {limit === "unlimited" ? "Unlimited" : limit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {redemptionLimit === "custom" && (
                    <TextInput
                      value={customRedemptionLimit}
                      onChangeText={setCustomRedemptionLimit}
                      style={styles.textInput}
                      placeholder="Enter custom limit"
                      placeholderTextColor="#737373"
                      keyboardType="numeric"
                    />
                  )}
                </View>
              </View>
            )}

            {/* Loyalty Offer Form */}
            {offerCategory === "loyalty" && (
              <View style={styles.formSection}>
                <View>
                  <Text style={styles.inputLabel}>Loyalty Mode</Text>
                  <View style={styles.optionRow}>
                    <TouchableOpacity
                      onPress={() => setLoyaltyMode("checkins")}
                      style={[
                        styles.optionButton,
                        loyaltyMode === "checkins"
                          ? styles.optionButtonActive
                          : styles.optionButtonInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          loyaltyMode === "checkins"
                            ? styles.optionButtonTextActive
                            : styles.optionButtonTextInactive,
                        ]}
                      >
                        Check-ins
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setLoyaltyMode("purchases")}
                      style={[
                        styles.optionButton,
                        loyaltyMode === "purchases"
                          ? styles.optionButtonActive
                          : styles.optionButtonInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          loyaltyMode === "purchases"
                            ? styles.optionButtonTextActive
                            : styles.optionButtonTextInactive,
                        ]}
                      >
                        Purchases
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {loyaltyMode === "checkins" && (
                  <View>
                    <Text style={styles.inputLabel}>
                      Number of Check-ins Required
                    </Text>
                    <TextInput
                      value={loyaltyCheckIns}
                      onChangeText={setLoyaltyCheckIns}
                      style={styles.textInput}
                      placeholder="e.g., 5"
                      placeholderTextColor="#737373"
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {loyaltyMode === "purchases" && (
                  <View>
                    <Text style={styles.inputLabel}>Product/Item Name</Text>
                    <TextInput
                      value={loyaltyProduct}
                      onChangeText={setLoyaltyProduct}
                      style={styles.textInput}
                      placeholder="e.g., Coffee"
                      placeholderTextColor="#737373"
                    />
                  </View>
                )}

                <View>
                  <Text style={styles.inputLabel}>Reward</Text>
                  <TextInput
                    value={loyaltyReward}
                    onChangeText={setLoyaltyReward}
                    style={styles.textInput}
                    placeholder="e.g., Free item or 50% off"
                    placeholderTextColor="#737373"
                  />
                </View>
              </View>
            )}

            {/* AI Suggestions */}
            {offerCategory === "ai" && (
              <View style={styles.aiSuggestionsContainer}>
                <Text style={styles.aiSuggestionsText}>
                  Select a pre-made offer or customize it:
                </Text>
                {aiOfferSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    onPress={() => selectAIOffer(suggestion.id)}
                    style={[
                      styles.suggestionCard,
                      selectedAIOption === suggestion.id
                        ? styles.suggestionCardSelected
                        : styles.suggestionCardUnselected,
                    ]}
                  >
                    <View style={styles.suggestionHeader}>
                      <Text style={styles.suggestionTitle}>
                        {suggestion.title}
                      </Text>
                      <View style={styles.suggestionBadge}>
                        <Text style={styles.suggestionBadgeText}>
                          {suggestion.category}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.suggestionDescription}>
                      {suggestion.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleCreateOffer}
              disabled={creating}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#06b6d4", "#3b82f6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButton}
              >
                {creating ? (
                  <Text style={styles.createButtonText}>Creating...</Text>
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.createButtonText}>Create Offer</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContainer: {
    flex: 1,
    marginTop: 80,
    backgroundColor: "#171717",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(38,38,38,0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(38,38,38,0.5)",
  },
  headerTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#a3a3a3",
    marginTop: 6,
    fontWeight: "500",
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(38,38,38,0.5)",
  },
  categoryTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTabActive: {
    backgroundColor: "#06b6d4",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.3,
    elevation: 4,
  },
  categoryTabInactive: {
    backgroundColor: "rgba(38,38,38,0.5)",
    borderWidth: 1,
    borderColor: "rgba(64,64,64,0.3)",
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },
  categoryTabTextInactive: {
    color: "#a3a3a3",
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  formSection: {
    gap: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: "#a3a3a3",
    fontWeight: "600",
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: "rgba(38,38,38,0.5)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(64,64,64,0.5)",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  textInputMultiline: {
    height: 100,
    textAlignVertical: "top",
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionButtonActive: {
    backgroundColor: "#06b6d4",
    borderColor: "rgba(34, 211, 238, 0.5)",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  optionButtonInactive: {
    backgroundColor: "rgba(38,38,38,0.5)",
    borderColor: "rgba(64,64,64,0.3)",
  },
  optionButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  optionButtonTextActive: {
    color: "#FFFFFF",
  },
  optionButtonTextInactive: {
    color: "#a3a3a3",
  },
  flexOne: {
    flex: 1,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  marginBottom8: {
    marginBottom: 10,
  },
  aiSuggestionsContainer: {
    gap: 14,
  },
  aiSuggestionsText: {
    color: "#d4d4d4",
    fontSize: 15,
    marginBottom: 10,
    fontWeight: "500",
  },
  suggestionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  suggestionCardSelected: {
    backgroundColor: "rgba(6,182,212,0.1)",
    borderColor: "rgba(6,182,212,0.5)",
    shadowColor: "#06b6d4",
    shadowOpacity: 0.2,
    elevation: 4,
  },
  suggestionCardUnselected: {
    backgroundColor: "rgba(38,38,38,0.5)",
    borderColor: "rgba(64,64,64,0.3)",
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  suggestionTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    flex: 1,
    letterSpacing: -0.3,
  },
  suggestionBadge: {
    backgroundColor: "rgba(6,182,212,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  suggestionBadgeText: {
    fontSize: 11,
    color: "#06b6d4",
    fontWeight: "700",
  },
  suggestionDescription: {
    fontSize: 14,
    color: "#a3a3a3",
    lineHeight: 20,
    fontWeight: "500",
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: "rgba(38,38,38,0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  createButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: -0.3,
  },
});
