import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Flame,
  Users,
  MapPin,
  TrendingUp,
  ChevronLeft,
  MoreVertical,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { PeopleScroller } from "./PeopleScroller";
import { ActivityFeed } from "./ActivityFeed";
import { ReactionBar } from "./ReactionBar";
import { LiveChat } from "./LiveChat";

interface LiveHotspot {
  hotspot_id: string;
  active_count: number;
  user_names: string[];
}

type TabType = "cards" | "chat" | "market";

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

export function LiveHotspotsHub() {
  const navigation = useNavigation();
  const [liveHotspots, setLiveHotspots] = useState<LiveHotspot[]>([]);
  const [joinedHotspot, setJoinedHotspot] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("cards");
  const [peopleCount, setPeopleCount] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    getCurrentUser();
    fetchLiveHotspots();
    checkJoinedHotspot();

    const interval = setInterval(() => {
      fetchLiveHotspots();
      checkJoinedHotspot();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (joinedHotspot?.id) {
      updateUserPresence();
      subscribeToActiveUsers();
      subscribeToReactions();

      const presenceInterval = setInterval(updateUserPresence, 30000);

      return () => {
        clearInterval(presenceInterval);
      };
    }
  }, [joinedHotspot?.id]);

  const getCurrentUser = async () => {
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
    }
  };

  const updateUserPresence = async () => {
    if (!joinedHotspot?.id) return;
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
        hotspot_id: joinedHotspot.id,
        full_name: profile?.full_name || "Anonymous",
        avatar_url: profile?.avatar_url,
        status: "Active",
        location_detail: joinedHotspot.name,
        last_seen: new Date().toISOString(),
      },
      {
        onConflict: "user_id,hotspot_id",
      },
    );
  };

  const subscribeToActiveUsers = () => {
    if (!joinedHotspot?.id) return;

    const channel = supabase
      .channel(`hotspot-users-${joinedHotspot.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_hotspot_users",
          filter: `hotspot_id=eq.${joinedHotspot.id}`,
        },
        async (payload) => {
          const { count } = await supabase
            .from("active_hotspot_users")
            .select("*", { count: "exact", head: true })
            .eq("hotspot_id", joinedHotspot.id)
            .gt(
              "last_seen",
              new Date(Date.now() - 10 * 60 * 1000).toISOString(),
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

  const subscribeToReactions = () => {
    if (!joinedHotspot?.id) return;

    const channel = supabase
      .channel(`hotspot-reactions-${joinedHotspot.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hotspot_reactions",
          filter: `hotspot_id=eq.${joinedHotspot.id}`,
        },
        (payload) => {
          const reaction = payload.new as any;
          const id = reaction.id;
          setReactions((prev) => [
            ...prev,
            {
              id,
              emoji: reaction.emoji,
              x: reaction.x_position,
              y: reaction.y_position,
            },
          ]);

          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== id));
          }, 2000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkJoinedHotspot = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("active_hotspot_users")
      .select("hotspot_id")
      .eq("user_id", user.id)
      .gt("last_seen", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .single();

    if (data) {
      const hotspot = { id: data.hotspot_id, name: data.hotspot_id };
      setJoinedHotspot(hotspot);
    } else {
      setJoinedHotspot(null);
    }
  };

  const fetchLiveHotspots = async () => {
    try {
      const { data, error } = await supabase
        .from("hotspot_active_counts")
        .select("*")
        .order("active_count", { ascending: false });

      if (error) throw error;
      setLiveHotspots(data || []);
    } catch (error) {
      console.error("Error fetching live hotspots:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLiveHotspots();
    await checkJoinedHotspot();
    setRefreshing(false);
  };

  const handleJoinHotspot = async (hotspotId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Error", "You must be logged in to join a hotspot");
      return;
    }

    const hotspot = { id: hotspotId, name: hotspotId };

    // Add user to hotspot
    await supabase.from("active_hotspot_users").upsert(
      {
        user_id: user.id,
        hotspot_id: hotspotId,
        full_name: currentUser?.full_name || "Anonymous",
        avatar_url: currentUser?.avatar_url,
        status: "Active",
        location_detail: hotspotId,
        last_seen: new Date().toISOString(),
      },
      {
        onConflict: "user_id,hotspot_id",
      },
    );

    setJoinedHotspot(hotspot);
    setActiveTab("cards");
  };

  const handleLeaveHotspot = async () => {
    Alert.alert(
      "Leave Hotspot",
      "Are you sure you want to leave this hotspot?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user && joinedHotspot) {
              await supabase
                .from("active_hotspot_users")
                .delete()
                .eq("user_id", user.id)
                .eq("hotspot_id", joinedHotspot.id);

              setJoinedHotspot(null);
              setActiveTab("cards");
            }
          },
        },
      ],
    );
  };

  const handleReaction = async (emoji: string, x: number, y: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !joinedHotspot) return;

    await supabase.from("hotspot_reactions").insert({
      hotspot_id: joinedHotspot.id,
      user_id: user.id,
      emoji,
      x_position: x,
      y_position: y,
    });
  };

  const getActivityLevel = (count: number) => {
    if (count >= 50) return { label: "🔥 Super Hot", color: "#EF4444" };
    if (count >= 25) return { label: "🔥 Very Active", color: "#F59E0B" };
    if (count >= 10) return { label: "✨ Active", color: "#3B82F6" };
    return { label: "👋 Getting Started", color: "#6B7280" };
  };

  // If user is in a hotspot, show the full live hotspot experience
  if (joinedHotspot) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.liveHeader}>
          <TouchableOpacity
            onPress={handleLeaveHotspot}
            style={styles.headerButton}
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.liveHeaderText}>Live Hotspot</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MoreVertical color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.liveScrollContent}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>{joinedHotspot.name}</Text>
              {isLive && <View style={styles.liveDot} />}
            </View>

            {isLive && (
              <View style={styles.liveContainer}>
                <View style={styles.liveBadgeHero}>
                  <Text style={styles.liveTextHero}>LIVE</Text>
                  <Flame color="#FF6B4A" size={14} />
                </View>
                <Text style={styles.activityText}>High activity</Text>
              </View>
            )}

            <View style={styles.peopleCountContainer}>
              <Text style={styles.peopleCountNumber}>{peopleCount}</Text>
              <Text style={styles.peopleCountLabel}>people here now</Text>
            </View>
          </View>

          {/* Pill Tabs */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabsWrapper}>
              <TouchableOpacity
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
              <Text style={styles.sectionLabel}>WHO'S HERE</Text>
              <PeopleScroller hotspotId={joinedHotspot.id} />
            </View>
          )}

          {activeTab === "chat" && (
            <View style={styles.tabContentChat}>
              <LiveChat
                hotspotId={joinedHotspot.id}
                currentUser={currentUser}
              />
            </View>
          )}

          {activeTab === "market" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
              <ActivityFeed hotspotId={joinedHotspot.id} />
            </View>
          )}
        </ScrollView>

        {/* Reaction Bar - Floating */}
        {activeTab !== "chat" && (
          <View style={styles.reactionBarContainer}>
            <ReactionBar onReaction={handleReaction} />
          </View>
        )}

        {/* Floating Reactions */}
        {reactions.map((reaction) => (
          <Animated.View
            key={reaction.id}
            style={[
              styles.floatingReaction,
              { left: reaction.x, bottom: 130 + reaction.y },
            ]}
          >
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
          </Animated.View>
        ))}

        {/* Sticky Leave Button */}
        <View style={styles.leaveButtonContainer}>
          <TouchableOpacity
            onPress={handleLeaveHotspot}
            style={styles.leaveButton}
          >
            <Text style={styles.leaveButtonText}>Leave Hotspot</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Otherwise show the discovery hub
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Hotspots</Text>
        <Text style={styles.headerSubtitle}>See what's happening now</Text>
      </View>

      {/* Stats Banner */}
      {liveHotspots.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <TrendingUp color="#3B82F6" size={20} />
            <Text style={styles.statNumber}>{liveHotspots.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Users color="#10B981" size={20} />
            <Text style={styles.statNumber}>
              {liveHotspots.reduce((sum, h) => sum + h.active_count, 0)}
            </Text>
            <Text style={styles.statLabel}>People</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Flame color="#F59E0B" size={20} />
            <Text style={styles.statNumber}>
              {liveHotspots.filter((h) => h.active_count >= 10).length}
            </Text>
            <Text style={styles.statLabel}>Hot</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
      >
        {liveHotspots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Flame color="rgba(255,255,255,0.3)" size={48} />
            <Text style={styles.emptyText}>No live hotspots right now</Text>
            <Text style={styles.emptySubtext}>
              Be the first to create activity!
            </Text>
          </View>
        ) : (
          liveHotspots.map((hotspot) => {
            const activity = getActivityLevel(hotspot.active_count);
            return (
              <TouchableOpacity
                key={hotspot.hotspot_id}
                onPress={() => handleJoinHotspot(hotspot.hotspot_id)}
                style={styles.hotspotCard}
              >
                <View style={styles.hotspotHeader}>
                  <View style={styles.hotspotHeaderLeft}>
                    <View style={styles.hotspotTitleRow}>
                      <MapPin color="white" size={20} />
                      <Text style={styles.hotspotName} numberOfLines={1}>
                        {hotspot.hotspot_id}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.activityBadge,
                        { backgroundColor: `${activity.color}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.activityBadgeText,
                          { color: activity.color },
                        ]}
                      >
                        {activity.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.hotspotIcon}>
                    <Flame color="#3B82F6" size={24} />
                  </View>
                </View>

                <View style={styles.peopleCountRow}>
                  <Users color="rgba(255,255,255,0.6)" size={18} />
                  <Text style={styles.peopleCountText}>
                    {hotspot.active_count}{" "}
                    {hotspot.active_count === 1 ? "person" : "people"} here now
                  </Text>
                </View>

                {hotspot.user_names && hotspot.user_names.length > 0 && (
                  <View style={styles.userNamesContainer}>
                    <Text style={styles.userNamesLabel}>Recently joined:</Text>
                    <Text style={styles.userNames} numberOfLines={1}>
                      {hotspot.user_names.slice(0, 3).join(", ")}
                      {hotspot.user_names.length > 3 && "..."}
                    </Text>
                  </View>
                )}

                <View style={styles.joinButton}>
                  <Text style={styles.joinButtonText}>Join Hotspot</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  emptySubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },
  hotspotCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  hotspotHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  hotspotHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  hotspotTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hotspotName: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    flex: 1,
  },
  activityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  activityBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  hotspotIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  peopleCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  peopleCountText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  userNamesContainer: {
    marginBottom: 16,
  },
  userNamesLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
  },
  userNames: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  joinButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  joinButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Live Hotspot Styles
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    flex: 1,
  },
  liveHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  liveScrollContent: {
    paddingBottom: 120,
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
  liveBadgeHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 107, 74, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveTextHero: {
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
  peopleCountNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  peopleCountLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
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
  tabContentChat: {
    paddingHorizontal: 24,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 16,
  },
  reactionBarContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  floatingReaction: {
    position: "absolute",
    zIndex: 50,
  },
  reactionEmoji: {
    fontSize: 32,
  },
  leaveButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  leaveButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  leaveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
