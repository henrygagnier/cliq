import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface RedeemedOffer {
  id: string;
  offer_title: string;
  business_name: string;
  redeemed_at: string;
  is_verified: boolean;
  redemption_code: string;
  offer_description: string;
}

export default function RedeemedOffersScreen() {
  const navigation = useNavigation<any>();
  const [redeemedOffers, setRedeemedOffers] = useState<RedeemedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRedeemedOffers();
  }, []);

  const loadRedeemedOffers = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRedeemedOffers([]);
        return;
      }

      const { data, error } = await supabase.rpc("get_user_redeemed_offers", {
        p_user_id: user.id,
      });

      if (error) throw error;
      setRedeemedOffers(data || []);
    } catch (error) {
      console.error("Error loading redeemed offers:", error);
      setRedeemedOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRedeemedOffers();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const renderOfferCard = (offer: RedeemedOffer) => (
    <View key={offer.id} style={styles.offerCard}>
      <View style={styles.offerCardHeader}>
        <View style={styles.iconContainer}>
          <FontAwesome6 name="badge-check" size={24} color="#22d3ee" />
        </View>
        <View style={styles.offerCardHeaderText}>
          <Text style={styles.offerTitle}>{offer.offer_title}</Text>
          <Text style={styles.businessName}>{offer.business_name}</Text>
        </View>
        {offer.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          </View>
        )}
      </View>

      {offer.offer_description && (
        <Text style={styles.offerDescription} numberOfLines={2}>
          {offer.offer_description}
        </Text>
      )}

      <View style={styles.codeContainer}>
        <View style={styles.codeLabel}>
          <FontAwesome6 name="barcode" size={14} color="#60A5FA" />
          <Text style={styles.codeLabelText}>Redemption Code</Text>
        </View>
        <Text style={styles.codeText}>{offer.redemption_code}</Text>
      </View>

      <View style={styles.offerCardFooter}>
        <Text style={styles.dateText}>
          Redeemed {formatDate(offer.redeemed_at)}
        </Text>
        {offer.is_verified ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusVerified}>✓ Verified</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.statusBadgePending]}>
            <Text style={styles.statusPending}>⏳ Pending</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Redeemed Offers</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#60A5FA" />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Redeemed Offers</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{redeemedOffers.length}</Text>
            <Text style={styles.statLabel}>Total Redeemed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {redeemedOffers.filter((o) => o.is_verified).length}
            </Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {redeemedOffers.filter((o) => !o.is_verified).length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Offers List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#60A5FA"
            />
          }
        >
          {redeemedOffers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <FontAwesome6 name="ticket" size={64} color="#52525B" />
              </View>
              <Text style={styles.emptyTitle}>No Redeemed Offers Yet</Text>
              <Text style={styles.emptyText}>
                Start exploring hotspots to discover and redeem amazing offers!
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Home")}
                style={styles.exploreButton}
              >
                <LinearGradient
                  colors={["#3B82F6", "#2563EB"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.exploreButtonGradient}
                >
                  <Text style={styles.exploreButtonText}>Explore Hotspots</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>{redeemedOffers.map((offer) => renderOfferCard(offer))}</>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#60A5FA",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  offerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  offerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(34, 211, 238, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  offerCardHeaderText: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    marginBottom: 2,
  },
  businessName: {
    fontSize: 14,
    color: "#94a3b8",
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 16,
    lineHeight: 20,
  },
  codeContainer: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  codeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  codeLabelText: {
    fontSize: 12,
    color: "#60A5FA",
    fontWeight: "600",
  },
  codeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    letterSpacing: 4,
    textAlign: "center",
  },
  offerCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: "#64748b",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  statusBadgePending: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
  },
  statusVerified: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22c55e",
  },
  statusPending: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F97316",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  exploreButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
