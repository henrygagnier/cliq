import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface BusinessOffer {
  id: string;
  title: string;
  expires_at: string;
  redemptions_count: number;
  is_active: boolean;
}

interface AllOffersModalProps {
  visible: boolean;
  onClose: () => void;
  offers: BusinessOffer[];
  onToggleOffer: (offerId: string, currentStatus: boolean) => void;
  onDeleteOffer: (offerId: string) => void;
}

export default function AllOffersModal({
  visible,
  onClose,
  offers,
  onToggleOffer,
  onDeleteOffer,
}: AllOffersModalProps) {
  const formatExpiresIn = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Expired";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day";
    return `${diffDays} days`;
  };

  const handleDelete = (offer: BusinessOffer) => {
    Alert.alert("Delete Offer", `Delete offer "${offer.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDeleteOffer(offer.id),
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Promotions</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {offers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={64} color="#404040" />
              <Text style={styles.emptyTitle}>No offers yet</Text>
              <Text style={styles.emptyText}>
                Create your first offer to attract more customers
              </Text>
            </View>
          ) : (
            offers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <View style={styles.offerTitleRow}>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: offer.is_active
                            ? "rgba(34, 211, 238, 0.1)"
                            : "rgba(115, 115, 115, 0.1)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: offer.is_active ? "#22d3ee" : "#737373" },
                        ]}
                      >
                        {offer.is_active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(offer)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.offerMetrics}>
                  <View style={styles.metric}>
                    <Ionicons name="time-outline" size={16} color="#a3a3a3" />
                    <Text style={styles.metricText}>
                      Expires in {formatExpiresIn(offer.expires_at)}
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Ionicons name="ticket-outline" size={16} color="#a3a3a3" />
                    <Text style={styles.metricText}>
                      {offer.redemptions_count} redeemed
                    </Text>
                  </View>
                </View>

                <View style={styles.offerFooter}>
                  <Text style={styles.toggleLabel}>Status</Text>
                  <TouchableOpacity
                    onPress={() => onToggleOffer(offer.id, offer.is_active)}
                    style={[
                      styles.toggleSwitch,
                      {
                        backgroundColor: offer.is_active
                          ? "#06b6d4"
                          : "#404040",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        { marginLeft: offer.is_active ? 22 : 2 },
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    backgroundColor: "#0a0a0a",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#262626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#737373",
    textAlign: "center",
    lineHeight: 20,
  },
  offerCard: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 16,
  },
  offerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  offerTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  offerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  offerMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricText: {
    fontSize: 13,
    color: "#a3a3a3",
  },
  offerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#262626",
  },
  toggleLabel: {
    fontSize: 13,
    color: "#737373",
    fontWeight: "600",
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
});
