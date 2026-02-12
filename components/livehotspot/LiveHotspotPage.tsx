import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { ChevronLeft, MoreVertical, Flame } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { PeopleScroller } from "./PeopleScroller";
import { ActivityFeed } from "./ActivityFeed";
import { LiveChat } from "./LiveChat";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

type TabType = "cards" | "chat" | "market";

export function LiveHotspotPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params as any;

  const [hotspot, setHotspot] = useState<any>(routeParams?.hotspot || null);
  const [activeTab, setActiveTab] = useState<TabType>("cards");
  const [peopleCount, setPeopleCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [redeemedOfferInfo, setRedeemedOfferInfo] = useState<null | {
    code: string;
    title: string;
    description?: string | null;
    location: string;
  }>(null);
  const [redeemedOfferIds, setRedeemedOfferIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const checkUserHotspot = useCallback(async () => {
    setLoading(true);

    // Get current user first
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser({ ...user, ...profile });

      // If no hotspot from route params, check if user is in a hotspot
      if (!routeParams?.hotspot) {
        const { data, error } = await supabase
          .from("active_hotspot_users")
          .select("hotspot_id, location_detail")
          .eq("user_id", user.id)
          .gt("last_seen", new Date(Date.now() - 30 * 60 * 1000).toISOString())
          .order("last_seen", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error checking active hotspot:", error);
        }

        console.log("Checking for active hotspot, found:", data);

        if (data) {
          const foundHotspot = {
            id: data.hotspot_id,
            name: data.location_detail || data.hotspot_id,
          };
          setHotspot(foundHotspot);

          // Update presence immediately
          await supabase.from("active_hotspot_users").upsert(
            {
              user_id: user.id,
              hotspot_id: data.hotspot_id,
              full_name: profile?.full_name || "Anonymous",
              avatar_url: profile?.avatar_url,
              status: "Active",
              location_detail: data.location_detail,
              last_seen: new Date().toISOString(),
            },
            {
              onConflict: "user_id,hotspot_id",
            },
          );
        } else {
          setHotspot(null);
        }
      }
    }
    setLoading(false);
  }, [routeParams?.hotspot]);

  // Reload whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkUserHotspot();
      fetchOffers();
    }, [checkUserHotspot, fetchOffers]),
  );

  useEffect(() => {
    checkUserHotspot();
  }, [checkUserHotspot]);

  useEffect(() => {
    if (!hotspot?.id) return;
    updateUserPresence();
    fetchPeopleCount();
    subscribeToActiveUsers();

    const presenceInterval = setInterval(updateUserPresence, 30000);

    return () => {
      clearInterval(presenceInterval);
      // Don't call leaveHotspot() here - only remove on explicit "Leave" action
      // The last_seen timestamp will naturally expire after 30 minutes
    };
  }, [hotspot?.id]);
  const updateUserPresence = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();

    await supabase.from("active_hotspot_users").upsert(
      {
        user_id: user.id,
        hotspot_id: hotspot.id,
        full_name: profile?.full_name || "Anonymous",
        avatar_url: profile?.avatar_url,
        status: "Active",
        location_detail: hotspot.name,
        last_seen: new Date().toISOString(),
      },
      {
        onConflict: "user_id,hotspot_id",
      },
    );
  };

  const leaveHotspot = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("active_hotspot_users")
      .delete()
      .eq("user_id", user.id)
      .eq("hotspot_id", hotspot.id);
  };

  const fetchPeopleCount = async () => {
    const { count } = await supabase
      .from("active_hotspot_users")
      .select("*", { count: "exact", head: true })
      .eq("hotspot_id", hotspot.id)
      .gt("last_seen", new Date(Date.now() - 30 * 60 * 1000).toISOString());

    if (count !== null) {
      setPeopleCount(count);
      setIsLive(count > 0);
    }
  };

  const subscribeToActiveUsers = () => {
    const channel = supabase
      .channel(`hotspot-users-${hotspot.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_hotspot_users",
          filter: `hotspot_id=eq.${hotspot.id}`,
        },
        async (payload) => {
          const { count } = await supabase
            .from("active_hotspot_users")
            .select("*", { count: "exact", head: true })
            .eq("hotspot_id", hotspot.id)
            .gt(
              "last_seen",
              new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            );

          if (count !== null) {
            setPeopleCount(count);
            setIsLive(count > 0);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadRedeemedOffers = useCallback(async () => {
    if (!currentUser?.id || !hotspot?.id) {
      setRedeemedOfferIds(new Set<string>());
      return;
    }

    try {
      const { data, error } = await supabase
        .from("offer_redemptions")
        .select("offer_id")
        .eq("user_id", currentUser.id)
        .eq("hotspot_id", hotspot.id);

      if (error) throw error;

      setRedeemedOfferIds(new Set<string>(data.map((row) => row.offer_id)));
    } catch (error) {
      console.error("Error loading redeemed offers:", error);
    }
  }, [currentUser?.id, hotspot?.id]);

  const fetchOffers = useCallback(async () => {
    if (!hotspot?.id) return;
    try {
      setLoadingOffers(true);
      const { data, error } = await supabase.rpc("get_active_offers", {
        p_hotspot_id: hotspot.id,
      });

      if (error) throw error;
      setOffers(data || []);
      loadRedeemedOffers();
    } catch (error) {
      console.error("Error loading offers:", error);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, [hotspot?.id, loadRedeemedOffers]);

  const handleRedeemOffer = async (offer: any) => {
    if (!currentUser?.id) {
      Alert.alert("Sign in required", "Log in to redeem offers.");
      return;
    }

    try {
      const { data: existing } = await supabase
        .from("offer_redemptions")
        .select("id")
        .eq("offer_id", offer.id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (existing) {
        Alert.alert(
          "Already redeemed",
          "You have already redeemed this offer.",
        );
        return;
      }

      const redemptionCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      const { error } = await supabase.from("offer_redemptions").insert({
        offer_id: offer.id,
        user_id: currentUser.id,
        business_id: offer.business_id,
        hotspot_id: hotspot.id,
        redemption_code: redemptionCode,
        redeemed_location: hotspot.name,
      });

      if (error) throw error;

      setRedeemedOfferInfo({
        code: redemptionCode,
        title: offer.title,
        description: offer.description,
        location: hotspot.name,
      });
      setRedeemedOfferIds((prev) => {
        const updated = new Set(prev);
        updated.add(offer.id);
        return updated;
      });
      fetchOffers();
    } catch (error: any) {
      console.error("Error redeeming offer:", error);
      Alert.alert("Error", error.message || "Failed to redeem offer.");
    }
  };

  const renderOfferCard = (offer: any) => {
    const daysRemaining =
      typeof offer.days_remaining === "number" ? offer.days_remaining : null;
    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3;
    const isRedeemed = redeemedOfferIds.has(offer.id);

    return (
      <TouchableOpacity
        key={offer.id}
        style={[styles.offerCard, isRedeemed && styles.offerCardRedeemed]}
        activeOpacity={isRedeemed ? 1 : 0.85}
        onPress={() => handleRedeemOffer(offer)}
        disabled={isRedeemed}
      >
        <View style={styles.offerHeader}>
          <View style={styles.offerTypeTag}>
            <Text style={styles.offerTypeText}>
              {offer.offer_type === "percentage"
                ? `${offer.offer_value}% OFF`
                : offer.offer_type === "fixed"
                  ? `$${offer.offer_value} OFF`
                  : offer.offer_type === "bogo"
                    ? "BOGO"
                    : "OFFER"}
            </Text>
          </View>
          {isExpiringSoon && (
            <View style={styles.expiringBadge}>
              <Text style={styles.expiringText}>
                ⚡ {Math.max(daysRemaining, 0)}d left
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.offerTitle}>{offer.title}</Text>
        {offer.description ? (
          <Text style={styles.offerDescription} numberOfLines={2}>
            {offer.description}
          </Text>
        ) : null}
        <View style={styles.offerFooter}>
          <Text
            style={[styles.redeemText, isRedeemed && styles.redeemTextRedeemed]}
          >
            {isRedeemed ? "Already Redeemed" : "Tap to Redeem"}
          </Text>
          <FontAwesome6
            name="ticket"
            size={14}
            color={isRedeemed ? "#9CA3AF" : "#60A5FA"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    loadRedeemedOffers();
  }, [loadRedeemedOffers]);

  const handleLeave = async () => {
    Alert.alert(
      "Leave Hotspot",
      "Are you sure you want to leave this hotspot?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            await leaveHotspot();
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleShare = () => {
    Alert.alert("Share Hotspot", "Share functionality coming soon!");
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>Live Hotspot</Text>
          </View>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Not in a hotspot - show filler page
  if (!hotspot) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerButton} />
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>Live Hotspot</Text>
          </View>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Flame color="rgba(255,255,255,0.3)" size={64} />
          <Text style={styles.emptyTitle}>Not in a Hotspot</Text>
          <Text style={styles.emptySubtext}>
            Join a hotspot from the Discover tab to see live activity, chat with
            people nearby, and more!
          </Text>
          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => navigation.navigate("Home" as never)}
          >
            <Text style={styles.discoverButtonText}>Browse Hotspots</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>Live Hotspot</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MoreVertical color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            activeTab === "chat" && styles.scrollContentChat,
          ]}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>{hotspot.name}</Text>
              {isLive && <View style={styles.liveDot} />}
            </View>

            {isLive && (
              <View style={styles.liveContainer}>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>LIVE</Text>
                  <Flame color="#FF6B4A" size={14} />
                </View>
                <Text style={styles.activityText}>High activity</Text>
              </View>
            )}

            <View style={styles.peopleCountContainer}>
              <Text style={styles.peopleCount}>{peopleCount}</Text>
              <Text style={styles.peopleLabel}>
                {peopleCount === 1 ? "person here now" : "people here now"}
              </Text>
            </View>

            {hotspot.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>🎵 {hotspot.category}</Text>
              </View>
            )}
          </View>

          {/* Pill Tabs */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabsWrapper}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setActiveTab("cards")}
                style={[styles.tab, activeTab === "cards" && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "cards" && styles.tabTextActive,
                  ]}
                >
                  Cards
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setActiveTab("chat")}
                style={[styles.tab, activeTab === "chat" && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "chat" && styles.tabTextActive,
                  ]}
                >
                  Live Chat
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setActiveTab("market")}
                style={[styles.tab, activeTab === "market" && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "market" && styles.tabTextActive,
                  ]}
                >
                  Activity
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Content */}
          {activeTab === "cards" && (
            <View style={styles.tabContent}>
              <View style={styles.offersHeaderRow}>
                <Text style={styles.sectionLabel}>ACTIVE OFFERS</Text>
                {!loadingOffers && offers.length > 0 && (
                  <View style={styles.offersCountBadge}>
                    <Text style={styles.offersCountText}>{offers.length}</Text>
                  </View>
                )}
              </View>

              {loadingOffers ? (
                <View style={styles.offersEmpty}>
                  <ActivityIndicator color="#60A5FA" />
                </View>
              ) : offers.length === 0 ? (
                <View style={styles.offersEmpty}>
                  <Text style={styles.offersEmptyText}>
                    No live offers right now. Check back soon.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.offersScroll}
                >
                  {offers.map((offer) => renderOfferCard(offer))}
                </ScrollView>
              )}

              <Text style={[styles.sectionLabel, styles.sectionLabelSpacer]}>
                WHO'S HERE
              </Text>
              <PeopleScroller hotspotId={hotspot.id} />
            </View>
          )}

          {activeTab === "chat" && (
            <View style={styles.chatContainer}>
              <LiveChat hotspotId={hotspot.id} currentUser={currentUser} />
            </View>
          )}

          {activeTab === "market" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
              <ActivityFeed hotspotId={hotspot.id} />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <View style={styles.actionsWrapper}>
              <TouchableOpacity
                onPress={handleShare}
                style={[styles.actionButton, styles.shareButton]}
              >
                <Text style={styles.actionButtonText}>Share Hotspot</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLeave}
                style={[styles.actionButton, styles.leaveButton]}
              >
                <Text style={styles.actionButtonText}>Leave Hotspot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={!!redeemedOfferInfo}
        transparent
        animationType="slide"
        onRequestClose={() => setRedeemedOfferInfo(null)}
      >
        <View style={styles.redeemModalOverlay}>
          <View style={styles.redeemModal}>
            <FontAwesome6 name="ticket" size={32} color="#60A5FA" />
            <Text style={styles.redeemModalTitle}>Show This To Staff</Text>
            <Text style={styles.redeemModalSubtitle}>
              Present this screen to a team member at{" "}
              {redeemedOfferInfo?.location} to unlock the perk.
            </Text>
            <View style={styles.redeemCodeCard}>
              <Text style={styles.redeemCodeLabel}>Redemption Code</Text>
              <Text style={styles.redeemCode}>{redeemedOfferInfo?.code}</Text>
            </View>
            <Text style={styles.redeemOfferTitle}>
              {redeemedOfferInfo?.title}
            </Text>
            {redeemedOfferInfo?.description ? (
              <Text style={styles.redeemOfferDescription}>
                {redeemedOfferInfo.description}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.redeemCloseButton}
              onPress={() => setRedeemedOfferInfo(null)}
            >
              <Text style={styles.redeemCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  scrollContentChat: {
    paddingBottom: 0,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "white",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B4A",
  },
  liveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 107, 74, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FF6B4A",
    letterSpacing: 1,
  },
  activityText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  peopleCountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  peopleCount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  peopleLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  categoryBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  tabsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  tabsWrapper: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 4,
    borderRadius: 25,
    flexDirection: "row",
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#3B82F6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  tabTextActive: {
    color: "white",
  },
  tabContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  tabContentNoPadding: {
    paddingHorizontal: 24,
  },
  chatContainer: {
    paddingHorizontal: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 16,
  },
  sectionLabelSpacer: {
    marginTop: 32,
  },
  offersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  offersCountBadge: {
    backgroundColor: "rgba(96, 165, 250, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offersCountText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "600",
  },
  offersScroll: {
    gap: 12,
    paddingBottom: 8,
  },
  offersEmpty: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingVertical: 24,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    marginBottom: 16,
  },
  offersEmptyText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 24,
  },
  offerCard: {
    width: 260,
    backgroundColor: "rgba(39,39,42,0.9)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  offerCardRedeemed: {
    opacity: 0.5,
  },
  offerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  offerTypeTag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.4)",
    backgroundColor: "rgba(96,165,250,0.15)",
  },
  offerTypeText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "700",
  },
  expiringBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.4)",
    backgroundColor: "rgba(249,115,22,0.15)",
  },
  expiringText: {
    color: "#F97316",
    fontSize: 11,
    fontWeight: "600",
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },
  offerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  redeemText: {
    color: "#60A5FA",
    fontWeight: "600",
    fontSize: 13,
  },
  redeemTextRedeemed: {
    color: "rgba(255,255,255,0.5)",
  },
  actionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  actionsWrapper: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  shareButton: {
    backgroundColor: "#3B82F6",
  },
  leaveButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 24,
  },
  discoverButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 16,
  },
  discoverButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  redeemModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  redeemModal: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 16,
  },
  redeemModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  redeemModalSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 20,
  },
  redeemCodeCard: {
    width: "100%",
    backgroundColor: "rgba(59,130,246,0.1)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    alignItems: "center",
  },
  redeemCodeLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  redeemCode: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    letterSpacing: 4,
  },
  redeemOfferTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
  },
  redeemOfferDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 20,
  },
  redeemCloseButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    marginTop: 8,
  },
  redeemCloseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
