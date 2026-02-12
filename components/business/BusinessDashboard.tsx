import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import CreateOfferModal from "./CreateOfferModal";
import EditProfileModal from "./EditProfileModal";
import ChatModerationModal from "./ChatModerationModal";
import BoostExposureModal from "./BoostExposureModal";
import AllOffersModal from "./AllOffersModal";
import { hasBusinessEnteredRaffle } from "../../lib/boostExposureUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface BusinessProfile {
  id: string;
  business_name: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  status: string;
  hotspot_id?: string | null;
}

interface BusinessOffer {
  id: string;
  title: string;
  expires_at: string;
  redemptions_count: number;
  is_active: boolean;
}

interface AnalyticsData {
  views: number;
  checkIns: number;
  comments: number;
  promotions: number;
  viewsChange: number;
  checkInsChange: number;
  commentsChange: number;
  promotionsChange: number;
}

export default function BusinessDashboard() {
  const navigation = useNavigation<any>();
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeOffers, setActiveOffers] = useState<BusinessOffer[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    views: 0,
    checkIns: 0,
    comments: 0,
    promotions: 0,
    viewsChange: 0,
    checkInsChange: 0,
    commentsChange: 0,
    promotionsChange: 0,
  });
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const [hasEnteredRaffle, setHasEnteredRaffle] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Load business profile
      const { data: profile } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setBusinessProfile(profile);

        // Load categories
        const { data: cats } = await supabase
          .from("business_categories")
          .select("category")
          .eq("business_id", profile.id);

        if (cats) {
          setCategories(cats.map((c) => c.category));
        }

        // Check if already entered raffle
        console.log(
          "🎟️ [Dashboard] Checking raffle status for business:",
          profile.id,
        );
        const entered = await hasBusinessEnteredRaffle(profile.id);
        console.log("🎟️ [Dashboard] Raffle entry status:", entered);
        setHasEnteredRaffle(entered);

        // Load active offers
        const { data: offers } = await supabase
          .from("business_offers")
          .select("*")
          .eq("business_id", profile.id)
          .order("created_at", { ascending: false });

        if (offers) {
          setActiveOffers(offers);
        }

        // Load analytics
        await loadAnalytics(profile.id);

        // Load unread messages count from hotspot messages using hotspot_id UUID
        // Only count messages that haven't been rejected
        if (profile.hotspot_id) {
          const { count: hotspotCount } = await supabase
            .from("hotspot_messages")
            .select("*", { count: "exact", head: true })
            .eq("hotspot_id", profile.hotspot_id)
            .or("moderation_status.is.null,moderation_status.eq.approved");

          setUnreadMessages(hotspotCount || 0);
        }
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAnalytics = async (businessId: string) => {
    try {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 14);

      // Get current week analytics
      const { data: currentWeek } = await supabase
        .from("business_analytics")
        .select(
          "views_count, check_ins_count, comments_count, promotions_count",
        )
        .eq("business_id", businessId)
        .gte("date", lastWeek.toISOString().split("T")[0])
        .lte("date", today.toISOString().split("T")[0]);

      // Get previous week analytics for comparison
      const { data: previousWeek } = await supabase
        .from("business_analytics")
        .select(
          "views_count, check_ins_count, comments_count, promotions_count",
        )
        .eq("business_id", businessId)
        .gte("date", twoWeeksAgo.toISOString().split("T")[0])
        .lt("date", lastWeek.toISOString().split("T")[0]);

      if (currentWeek && previousWeek) {
        const currentTotals = currentWeek.reduce(
          (acc, day) => ({
            views: acc.views + (day.views_count || 0),
            checkIns: acc.checkIns + (day.check_ins_count || 0),
            comments: acc.comments + (day.comments_count || 0),
            promotions: acc.promotions + (day.promotions_count || 0),
          }),
          { views: 0, checkIns: 0, comments: 0, promotions: 0 },
        );

        const previousTotals = previousWeek.reduce(
          (acc, day) => ({
            views: acc.views + (day.views_count || 0),
            checkIns: acc.checkIns + (day.check_ins_count || 0),
            comments: acc.comments + (day.comments_count || 0),
            promotions: acc.promotions + (day.promotions_count || 0),
          }),
          { views: 0, checkIns: 0, comments: 0, promotions: 0 },
        );

        setAnalytics({
          views: currentTotals.views,
          checkIns: currentTotals.checkIns,
          comments: currentTotals.comments,
          promotions: currentTotals.promotions,
          viewsChange:
            previousTotals.views > 0
              ? Math.round(
                  ((currentTotals.views - previousTotals.views) /
                    previousTotals.views) *
                    100,
                )
              : 0,
          checkInsChange:
            previousTotals.checkIns > 0
              ? Math.round(
                  ((currentTotals.checkIns - previousTotals.checkIns) /
                    previousTotals.checkIns) *
                    100,
                )
              : 0,
          commentsChange:
            previousTotals.comments > 0
              ? Math.round(
                  ((currentTotals.comments - previousTotals.comments) /
                    previousTotals.comments) *
                    100,
                )
              : 0,
          promotionsChange:
            previousTotals.promotions > 0
              ? Math.round(
                  ((currentTotals.promotions - previousTotals.promotions) /
                    previousTotals.promotions) *
                    100,
                )
              : 0,
        });
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const toggleOffer = async (offerId: string, currentStatus: boolean) => {
    if (!businessProfile) return;
    try {
      const { error } = await supabase
        .from("business_offers")
        .update({ is_active: !currentStatus })
        .eq("id", offerId)
        .eq("business_id", businessProfile.id);

      if (error) throw error;

      setActiveOffers(
        activeOffers.map((offer) =>
          offer.id === offerId
            ? { ...offer, is_active: !currentStatus }
            : offer,
        ),
      );
    } catch (error: any) {
      console.error("Error toggling offer:", error);
      Alert.alert(
        "Unable to Update",
        error?.message || "We couldn't change this offer's status.",
      );
    }
  };

  const deleteOffer = async (offerId: string) => {
    if (!businessProfile) return;
    try {
      const { error } = await supabase
        .from("business_offers")
        .delete()
        .eq("id", offerId)
        .eq("business_id", businessProfile.id);

      if (error) throw error;

      setActiveOffers(activeOffers.filter((offer) => offer.id !== offerId));
    } catch (error: any) {
      console.error("Error deleting offer:", error);
      Alert.alert(
        "Unable to Delete",
        error?.message || "We couldn't remove this offer. Please try again.",
      );
    }
  };

  const showOfferMenu = (offer: BusinessOffer) => {
    Alert.alert("Delete Offer", `Delete offer "${offer.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteOffer(offer.id),
      },
    ]);
  };

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

  const stats = [
    {
      label: "Views",
      value: analytics.views.toLocaleString(),
      change: analytics.viewsChange,
      icon: "eye-outline",
      iconSet: "ionicons",
    },
    {
      label: "Check Ins",
      value: analytics.checkIns.toLocaleString(),
      change: analytics.checkInsChange,
      icon: "map-marker-outline",
      iconSet: "materialcommunity",
    },
    {
      label: "Comments",
      value: analytics.comments.toLocaleString(),
      change: analytics.commentsChange,
      icon: "message-square",
      iconSet: "feather",
    },
    {
      label: "Promotions",
      value: analytics.promotions.toLocaleString(),
      change: analytics.promotionsChange,
      icon: "ticket-outline",
      iconSet: "ionicons",
    },
  ];

  const quickActions = [
    {
      label: "Create Offer",
      icon: "gift",
      action: () => setShowCreateOfferModal(true),
    },
    {
      label: hasEnteredRaffle ? "Raffle Entered ✓" : "Boost Exposure",
      icon: "trending-up",
      action: () => {
        if (!hasEnteredRaffle) {
          setShowBoostModal(true);
        }
      },
      disabled: hasEnteredRaffle,
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  if (!businessProfile) {
    return (
      <View style={styles.noProfileContainer}>
        <Text style={styles.noProfileTitle}>No business profile found</Text>
        <Text style={styles.noProfileSubtitle}>
          Create a business profile to access the dashboard
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text
                style={styles.businessName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {businessProfile.business_name}
              </Text>
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#22d3ee" />
                <Text style={styles.statusText}>
                  {businessProfile.status === "active" ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            <Text
              style={styles.categoryText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {categories.join(" & ")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowEditModal(true)}
            style={styles.editButton}
          >
            <Feather name="edit-3" size={20} color="#a3a3a3" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#06b6d4"
          />
        }
      >
        <View style={styles.content}>
          {/* Chat Moderation */}
          <TouchableOpacity
            onPress={() => setShowChatModal(true)}
            style={styles.chatCard}
            activeOpacity={0.8}
          >
            <View style={styles.chatCardContent}>
              <View style={styles.chatCardHeader}>
                <View style={styles.chatIconContainer}>
                  <Ionicons name="chatbubbles" size={20} color="white" />
                </View>
                <View style={styles.chatTextContainer}>
                  <Text style={styles.chatTitle}>Chat Moderation</Text>
                  <Text style={styles.chatSubtitle}>Reviews & Messages</Text>
                </View>
                {unreadMessages > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unreadMessages}</Text>
                  </View>
                )}
              </View>
            </View>
            <LinearGradient
              colors={["#06b6d4", "#3b82f6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.chatButton}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.chatButtonText}>View Live Chat Feed</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="white"
                style={{ marginLeft: "auto" }}
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Performance Overview */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance</Text>
              <Text style={styles.sectionSubtitle}>Last 7 days</Text>
            </View>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <TouchableOpacity
                  key={stat.label}
                  onPress={() => {
                    setSelectedStat(stat.label);
                    setShowAnalyticsModal(true);
                  }}
                  style={styles.statCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.statHeader}>
                    {stat.iconSet === "ionicons" && (
                      <Ionicons
                        name={stat.icon as any}
                        size={20}
                        color="#737373"
                      />
                    )}
                    {stat.iconSet === "materialcommunity" && (
                      <MaterialCommunityIcons
                        name={stat.icon as any}
                        size={20}
                        color="#737373"
                      />
                    )}
                    {stat.iconSet === "feather" && (
                      <Feather
                        name={stat.icon as any}
                        size={20}
                        color="#737373"
                      />
                    )}
                    <View style={styles.changeContainer}>
                      <Ionicons
                        name={stat.change >= 0 ? "arrow-up" : "arrow-down"}
                        size={12}
                        color={stat.change >= 0 ? "#22d3ee" : "#ef4444"}
                      />
                      <Text
                        style={[
                          styles.changeText,
                          { color: stat.change >= 0 ? "#22d3ee" : "#ef4444" },
                        ]}
                      >
                        {Math.abs(stat.change)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity
                onPress={() => setShowActionsMenu(true)}
                style={styles.moreButton}
              >
                <Text style={styles.moreButtonText}>More</Text>
                <Ionicons name="ellipsis-vertical" size={16} color="#22d3ee" />
              </TouchableOpacity>
            </View>
            <View style={styles.actionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={action.disabled ? undefined : action.action}
                  activeOpacity={action.disabled ? 1 : 0.8}
                  disabled={action.disabled}
                >
                  <LinearGradient
                    colors={
                      action.label.includes("Entered") ||
                      action.label.includes("✓")
                        ? ["#22c55e", "#16a34a"] // Green for entered
                        : ["#06b6d4", "#3b82f6"] // Blue for not entered
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.actionCard,
                      action.disabled && { opacity: 0.7 },
                    ]}
                  >
                    {action.label.includes("Entered") ||
                    action.label.includes("✓") ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="white"
                        style={{ marginBottom: 12 }}
                      />
                    ) : (
                      <Feather
                        name={action.icon as any}
                        size={24}
                        color="white"
                        style={{ marginBottom: 12 }}
                      />
                    )}
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Active Offers */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Promotions</Text>
              <TouchableOpacity onPress={() => setShowAllOffers(true)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.offersContainer}>
              {activeOffers.filter((o) => o.is_active).length === 0 ? (
                <View style={styles.emptyOffersCard}>
                  <Text style={styles.emptyOffersText}>
                    No active offers yet. Create one to get started!
                  </Text>
                </View>
              ) : (
                activeOffers
                  .filter((o) => o.is_active)
                  .slice(0, 3)
                  .map((offer) => (
                    <View key={offer.id} style={styles.offerCard}>
                      <View style={styles.offerContent}>
                        <View style={styles.offerDetails}>
                          <Text style={styles.offerTitle}>{offer.title}</Text>
                          <View style={styles.offerMetrics}>
                            <View style={styles.offerMetric}>
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color="#a3a3a3"
                              />
                              <Text style={styles.offerMetricText}>
                                Expires in {formatExpiresIn(offer.expires_at)}
                              </Text>
                            </View>
                            <View style={styles.offerMetric}>
                              <Ionicons
                                name="ticket-outline"
                                size={14}
                                color="#a3a3a3"
                              />
                              <Text style={styles.offerMetricText}>
                                {offer.redemptions_count} redeemed
                              </Text>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.offerMenu}
                          onPress={() => showOfferMenu(offer)}
                        >
                          <Ionicons
                            name="ellipsis-vertical"
                            size={16}
                            color="#737373"
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.offerFooter}>
                        <Text style={styles.offerStatusLabel}>Status</Text>
                        <TouchableOpacity
                          onPress={() => toggleOffer(offer.id, offer.is_active)}
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
            </View>
          </View>

          {/* Recommendations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <View style={styles.recommendationsContainer}>
              {[
                ...(!hasEnteredRaffle
                  ? [
                      {
                        icon: "zap",
                        title: "Boost Exposure",
                        description:
                          "Reach 10x more nearby users. Get featured to active customers in your area instantly.",
                        action: () => setShowBoostModal(true),
                      },
                    ]
                  : []),
                {
                  icon: "gift",
                  title: "Create Offer",
                  description:
                    "Drive repeat visits with exclusive perks. Businesses see 40% more check-ins with active offers.",
                  action: () => setShowCreateOfferModal(true),
                },
                {
                  icon: "message-circle",
                  title: "Moderate Chat",
                  description:
                    "Review and manage messages from customers. Keep your business reputation positive.",
                  action: () => setShowChatModal(true),
                },
              ].map((rec, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.recommendationCard}
                  activeOpacity={0.8}
                  onPress={rec.action}
                >
                  <View style={styles.recommendationContent}>
                    <View style={styles.recommendationIcon}>
                      <Feather
                        name={rec.icon as any}
                        size={20}
                        color="#22d3ee"
                      />
                    </View>
                    <View style={styles.recommendationText}>
                      <Text style={styles.recommendationTitle}>
                        {rec.title}
                      </Text>
                      <Text style={styles.recommendationDescription}>
                        {rec.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        businessProfile={businessProfile}
        categories={categories}
        onUpdate={loadDashboardData}
      />

      <CreateOfferModal
        visible={showCreateOfferModal}
        onClose={() => setShowCreateOfferModal(false)}
        businessId={businessProfile.id}
        hotspotId={businessProfile.hotspot_id || null}
        onOfferCreated={loadDashboardData}
      />

      <ChatModerationModal
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        businessId={businessProfile.id}
      />

      <BoostExposureModal
        visible={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        businessId={businessProfile.id}
        category={categories[0] || "General"}
        alreadyEntered={hasEnteredRaffle}
        onSuccess={() => {
          setShowBoostModal(false);
          loadDashboardData(); // Refresh to update entry status
        }}
      />

      <AllOffersModal
        visible={showAllOffers}
        onClose={() => setShowAllOffers(false)}
        offers={activeOffers}
        onToggleOffer={toggleOffer}
        onDeleteOffer={deleteOffer}
      />

      {/* Actions Menu Modal */}
      {/* Analytics Modal */}
      <Modal
        visible={showAnalyticsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnalyticsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.analyticsModalContainer}>
            <View style={styles.analyticsHeader}>
              <View>
                <Text style={styles.analyticsTitle}>
                  {selectedStat || "Analytics"}
                </Text>
                <Text style={styles.analyticsSubtitle}>
                  Last 7 days performance
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAnalyticsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#a3a3a3" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.analyticsContent}>
              {/* Chart */}
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>7-Day Trend</Text>
                <View style={styles.customChart}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day, index) => {
                      const value = Math.floor(Math.random() * 80) + 20;
                      return (
                        <View key={day} style={styles.chartBar}>
                          <View style={styles.chartBarContainer}>
                            <View
                              style={[
                                styles.chartBarFill,
                                { height: `${value}%` },
                              ]}
                            >
                              <LinearGradient
                                colors={["#06b6d4", "#3b82f6"]}
                                style={styles.chartBarGradient}
                              />
                            </View>
                          </View>
                          <Text style={styles.chartLabel}>{day}</Text>
                        </View>
                      );
                    },
                  )}
                </View>
              </View>

              {/* Stats Summary */}
              <View style={styles.statsSummary}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryValue}>
                    {selectedStat === "Views"
                      ? analytics.views.toLocaleString()
                      : selectedStat === "Check Ins"
                        ? analytics.checkIns.toLocaleString()
                        : selectedStat === "Comments"
                          ? analytics.comments.toLocaleString()
                          : analytics.promotions.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Change</Text>
                  <View style={styles.summaryChangeRow}>
                    <Ionicons
                      name={
                        selectedStat === "Views"
                          ? analytics.viewsChange >= 0
                            ? "arrow-up"
                            : "arrow-down"
                          : selectedStat === "Check Ins"
                            ? analytics.checkInsChange >= 0
                              ? "arrow-up"
                              : "arrow-down"
                            : selectedStat === "Comments"
                              ? analytics.commentsChange >= 0
                                ? "arrow-up"
                                : "arrow-down"
                              : analytics.promotionsChange >= 0
                                ? "arrow-up"
                                : "arrow-down"
                      }
                      size={18}
                      color={
                        selectedStat === "Views"
                          ? analytics.viewsChange >= 0
                            ? "#22d3ee"
                            : "#ef4444"
                          : selectedStat === "Check Ins"
                            ? analytics.checkInsChange >= 0
                              ? "#22d3ee"
                              : "#ef4444"
                            : selectedStat === "Comments"
                              ? analytics.commentsChange >= 0
                                ? "#22d3ee"
                                : "#ef4444"
                              : analytics.promotionsChange >= 0
                                ? "#22d3ee"
                                : "#ef4444"
                      }
                    />
                    <Text
                      style={[
                        styles.summaryValue,
                        {
                          color:
                            selectedStat === "Views"
                              ? analytics.viewsChange >= 0
                                ? "#22d3ee"
                                : "#ef4444"
                              : selectedStat === "Check Ins"
                                ? analytics.checkInsChange >= 0
                                  ? "#22d3ee"
                                  : "#ef4444"
                                : selectedStat === "Comments"
                                  ? analytics.commentsChange >= 0
                                    ? "#22d3ee"
                                    : "#ef4444"
                                  : analytics.promotionsChange >= 0
                                    ? "#22d3ee"
                                    : "#ef4444",
                        },
                      ]}
                    >
                      {selectedStat === "Views"
                        ? Math.abs(analytics.viewsChange)
                        : selectedStat === "Check Ins"
                          ? Math.abs(analytics.checkInsChange)
                          : selectedStat === "Comments"
                            ? Math.abs(analytics.commentsChange)
                            : Math.abs(analytics.promotionsChange)}
                      %
                    </Text>
                  </View>
                </View>
              </View>

              {/* Insights */}
              <View style={styles.insightsContainer}>
                <Text style={styles.insightsTitle}>Insights</Text>
                <View style={styles.insightCard}>
                  <Ionicons name="bulb" size={20} color="#eab308" />
                  <Text style={styles.insightText}>
                    Your {selectedStat?.toLowerCase()} are trending{" "}
                    {selectedStat === "Views"
                      ? analytics.viewsChange >= 0
                        ? "up"
                        : "down"
                      : selectedStat === "Check Ins"
                        ? analytics.checkInsChange >= 0
                          ? "up"
                          : "down"
                        : selectedStat === "Comments"
                          ? analytics.commentsChange >= 0
                            ? "up"
                            : "down"
                          : analytics.promotionsChange >= 0
                            ? "up"
                            : "down"}{" "}
                    compared to last week. Keep up the momentum!
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Actions Menu Modal */}
      <Modal
        visible={showActionsMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionsMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowActionsMenu(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.actionsMenuContainer}>
              <View style={styles.actionsMenuHeader}>
                <Text style={styles.actionsMenuTitle}>All Actions</Text>
                <TouchableOpacity
                  onPress={() => setShowActionsMenu(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={20} color="#a3a3a3" />
                </TouchableOpacity>
              </View>
              <View style={styles.actionsMenuGrid}>
                {[
                  {
                    label: "Create Offer",
                    icon: "gift",
                    action: () => {
                      setShowActionsMenu(false);
                      setShowCreateOfferModal(true);
                    },
                  },
                  {
                    label: "Boost Exposure",
                    icon: "zap",
                    action: () => {
                      setShowActionsMenu(false);
                      setShowBoostModal(true);
                    },
                  },
                  {
                    label: "Edit Profile",
                    icon: "edit-3",
                    action: () => {
                      setShowActionsMenu(false);
                      setShowEditModal(true);
                    },
                  },
                  {
                    label: "View Analytics",
                    icon: "bar-chart-2",
                    action: () => {
                      setShowActionsMenu(false);
                      setShowAnalyticsModal(true);
                    },
                  },
                  {
                    label: "Chat Moderation",
                    icon: "message-circle",
                    action: () => {
                      setShowActionsMenu(false);
                      setShowChatModal(true);
                    },
                  },
                ].map((action, index) => (
                  <TouchableOpacity
                    key={action.label}
                    style={styles.actionsMenuItem}
                    activeOpacity={0.7}
                    onPress={action.action}
                  >
                    <Feather
                      name={action.icon as any}
                      size={20}
                      color="#d4d4d4"
                      style={{ marginBottom: 8 }}
                    />
                    <Text style={styles.actionsMenuItemText}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  noProfileContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  noProfileTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "700",
  },
  noProfileSubtitle: {
    color: "#a3a3a3",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  header: {
    backgroundColor: "rgba(10, 10, 10, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(38, 38, 38, 0.5)",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.2)",
    flexShrink: 0,
  },
  statusText: {
    fontSize: 12,
    color: "#06b6d4",
    fontWeight: "600",
  },
  categoryText: {
    fontSize: 14,
    color: "#a3a3a3",
    marginTop: 2,
    fontWeight: "500",
  },
  editButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(64, 64, 64, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(64, 64, 64, 0.3)",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  chatCard: {
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.2)",
    marginBottom: 24,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  chatCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  chatIconContainer: {
    padding: 14,
    backgroundColor: "#06b6d4",
    borderRadius: 16,
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  chatTextContainer: {
    flex: 1,
  },
  chatTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: -0.3,
  },
  chatSubtitle: {
    fontSize: 14,
    color: "#a3a3a3",
    marginTop: 3,
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    minWidth: 28,
    alignItems: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  chatButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  chatButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: -0.3,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#737373",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(38, 38, 38, 0.5)",
    flex: 1,
    minWidth: "45%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: "#737373",
    fontWeight: "500",
  },
  moreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.2)",
  },
  moreButtonText: {
    fontSize: 14,
    color: "#06b6d4",
    fontWeight: "600",
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    borderRadius: 16,
    padding: 20,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 14,
    color: "#737373",
    fontWeight: "600",
  },
  offersContainer: {
    gap: 12,
  },
  emptyOffersCard: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(38, 38, 38, 0.5)",
  },
  emptyOffersText: {
    color: "#a3a3a3",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  offerCard: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(38, 38, 38, 0.5)",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  offerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  offerDetails: {
    flex: 1,
  },
  offerTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 6,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  offerMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  offerMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  offerMetricText: {
    fontSize: 13,
    color: "#a3a3a3",
    fontWeight: "500",
  },
  offerMenu: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(64, 64, 64, 0.3)",
  },
  offerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(64, 64, 64, 0.3)",
  },
  offerStatusLabel: {
    fontSize: 13,
    color: "#737373",
    fontWeight: "600",
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendationsContainer: {
    gap: 12,
    marginTop: 12,
  },
  recommendationCard: {
    backgroundColor: "rgba(8, 47, 73, 0.3)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.2)",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  recommendationContent: {
    flexDirection: "row",
    gap: 14,
  },
  recommendationIcon: {
    padding: 8,
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.2)",
  },
  recommendationText: {
    flex: 1,
  },
  recommendationTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  recommendationDescription: {
    fontSize: 13,
    color: "#a3a3a3",
    lineHeight: 20,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  actionsMenuContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#171717",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: "rgba(64, 64, 64, 0.3)",
    padding: 24,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  actionsMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionsMenuTitle: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(64, 64, 64, 0.4)",
  },
  actionsMenuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionsMenuItem: {
    backgroundColor: "#262626",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(64, 64, 64, 0.5)",
    width: "48%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  actionsMenuItemText: {
    color: "#e5e5e5",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  analyticsModalContainer: {
    flex: 1,
    marginTop: 60,
    backgroundColor: "#171717",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: "rgba(64, 64, 64, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  analyticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(38, 38, 38, 0.5)",
  },
  analyticsTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  analyticsSubtitle: {
    fontSize: 14,
    color: "#a3a3a3",
    marginTop: 6,
    fontWeight: "500",
  },
  analyticsContent: {
    flex: 1,
    padding: 20,
  },
  chartContainer: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(38, 38, 38, 0.5)",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  customChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 180,
    paddingHorizontal: 8,
    gap: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  chartBarContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(38, 38, 38, 0.5)",
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  chartBarFill: {
    width: "100%",
    borderRadius: 6,
    overflow: "hidden",
  },
  chartBarGradient: {
    flex: 1,
    width: "100%",
  },
  chartLabel: {
    fontSize: 11,
    color: "#737373",
    fontWeight: "600",
  },
  statsSummary: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#262626",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(64, 64, 64, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#737373",
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  summaryChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  insightsContainer: {
    marginBottom: 20,
  },
  insightsTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  insightCard: {
    flexDirection: "row",
    backgroundColor: "rgba(234, 179, 8, 0.1)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.2)",
    gap: 12,
    shadowColor: "#eab308",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: "#e5e5e5",
    lineHeight: 20,
    fontWeight: "500",
  },
});
