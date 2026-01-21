import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import { Image } from "react-native";
import {
  Crown,
  Trophy,
  TrendingUp,
  Clock,
  MapPin,
  Users,
  UserPlus,
  Zap,
  Plus,
  Minus,
  Star,
} from "lucide-react-native";

// Tier Thresholds
const TIER_THRESHOLDS = {
  LIGHTBLUE: 0,
  BRONZE: 300,
  SILVER: 800,
  GOLD: 2000,
  BLACK: 3500,
};

type CardTier = "lightblue" | "bronze" | "platinum" | "gold" | "black";

// TypeScript Interfaces
interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  avatar: string;
  id: string;
}

interface Activity {
  id: string;
  type: "earn" | "spend" | "adjustment";
  description: string;
  points: number;
  timestamp: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  points: number | null;
  avatar_url: string | null;
}

interface TierInfo {
  tier: CardTier;
  displayName: string;
  pointsToNext: number;
  nextTierName: string;
  tierProgress: number;
}

interface RewardHeaderProps {
  points: number;
  nextTierPoints: number;
  tierName: string;
  tierProgress: number;
}

interface LiveLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserRank?: number;
  currentUserPoints?: number;
}

interface RecentActivityProps {
  activities: Activity[];
}

interface RankStyle {
  bg: [string, string, string];
  border: string;
  shadow: string;
}

// Function to calculate tier based on points
function calculateTier(points: number): TierInfo {
  const currentPoints = points || 0;

  if (currentPoints >= TIER_THRESHOLDS.BLACK) {
    return {
      tier: "black",
      displayName: "Black Tier",
      pointsToNext: 0,
      nextTierName: "MAX",
      tierProgress: 100,
    };
  } else if (currentPoints >= TIER_THRESHOLDS.GOLD) {
    const pointsToNext = TIER_THRESHOLDS.BLACK - currentPoints;
    const tierProgress =
      ((currentPoints - TIER_THRESHOLDS.GOLD) /
        (TIER_THRESHOLDS.BLACK - TIER_THRESHOLDS.GOLD)) *
      100;
    return {
      tier: "gold",
      displayName: "Gold Tier",
      pointsToNext,
      nextTierName: "Black Tier",
      tierProgress,
    };
  } else if (currentPoints >= TIER_THRESHOLDS.SILVER) {
    const pointsToNext = TIER_THRESHOLDS.GOLD - currentPoints;
    const tierProgress =
      ((currentPoints - TIER_THRESHOLDS.SILVER) /
        (TIER_THRESHOLDS.GOLD - TIER_THRESHOLDS.SILVER)) *
      100;
    return {
      tier: "platinum",
      displayName: "Silver Tier",
      pointsToNext,
      nextTierName: "Gold Tier",
      tierProgress,
    };
  } else if (currentPoints >= TIER_THRESHOLDS.BRONZE) {
    const pointsToNext = TIER_THRESHOLDS.SILVER - currentPoints;
    const tierProgress =
      ((currentPoints - TIER_THRESHOLDS.BRONZE) /
        (TIER_THRESHOLDS.SILVER - TIER_THRESHOLDS.BRONZE)) *
      100;
    return {
      tier: "bronze",
      displayName: "Bronze Tier",
      pointsToNext,
      nextTierName: "Silver Tier",
      tierProgress,
    };
  } else {
    const pointsToNext = TIER_THRESHOLDS.BRONZE - currentPoints;
    const tierProgress =
      TIER_THRESHOLDS.BRONZE === 0
        ? 0
        : (currentPoints / TIER_THRESHOLDS.BRONZE) * 100;
    return {
      tier: "lightblue",
      displayName: "Beginner",
      pointsToNext,
      nextTierName: "Bronze Tier",
      tierProgress,
    };
  }
}

// RewardHeader Component
const RewardHeader: React.FC<RewardHeaderProps> = ({
  points,
  nextTierPoints,
  tierName,
  tierProgress,
}) => {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.mainTitle}>Cliqcard Rewards</Text>
      <LinearGradient
        colors={["#0f172a", "#1e293b", "#0f172a"]}
        style={styles.pointsCard}
      >
        <View style={styles.pointsCardInner}>
          <View style={styles.balanceHeader}>
            <Trophy color="#94a3b8" size={20} />
            <Text style={styles.balanceLabel}>Your Balance</Text>
          </View>
          <Text style={styles.pointsAmount}>
            {points.toLocaleString()}{" "}
            <Text style={styles.pointsSuffix}>pts</Text>
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>Progress to {tierName}</Text>
              <Text style={styles.progressTarget}>
                {nextTierPoints === 0
                  ? "MAX"
                  : `${nextTierPoints.toLocaleString()} pts`}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(tierProgress, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// LiveLeaderboard Component
const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  entries,
  currentUserRank,
  currentUserPoints,
}) => {
  const [filter, setFilter] = useState<"local" | "friends" | "global">("local");

  const getRankStyle = (rank: number): RankStyle => {
    if (rank === 1)
      return {
        bg: ["#083344", "#1e3a8a", "#083344"],
        border: "#22d3ee",
        shadow: "#22d3ee40",
      };
    if (rank === 2)
      return {
        bg: ["#0f172a", "#1e293b", "#0f172a"],
        border: "#94a3b8",
        shadow: "#94a3b826",
      };
    if (rank === 3)
      return {
        bg: ["#0f172a", "#18181b", "#0f172a"],
        border: "#64748b",
        shadow: "#94a3b81a",
      };
    return {
      bg: ["#1e293b", "#1e293b", "#1e293b"],
      border: "#334155",
      shadow: "#00000000",
    };
  };

  return (
    <View style={styles.leaderboardContainer}>
      <View style={styles.leaderboardCard}>
        <View style={styles.leaderboardHeader}>
          <View style={styles.leaderboardTitleRow}>
            <TrendingUp color="#94a3b8" size={20} />
            <Text style={styles.leaderboardTitle}>Live Leaderboard</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(["local", "friends", "global"] as const).map((f) => (
            <TouchableOpacity
              activeOpacity={0.7}
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterButton,
                filter === f
                  ? styles.filterButtonActive
                  : styles.filterButtonInactive,
              ]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === f
                    ? styles.filterButtonTextActive
                    : styles.filterButtonTextInactive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.entriesContainer}>
          {entries.map((entry) => {
            const rankStyle = getRankStyle(entry.rank);
            return (
              <LinearGradient
                key={entry.id}
                colors={rankStyle.bg}
                style={[
                  styles.entryCard,
                  {
                    borderColor: rankStyle.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <View style={styles.rankContainer}>
                  {entry.rank <= 3 ? (
                    <Crown
                      color={entry.rank === 1 ? "#22d3ee" : "#94a3b8"}
                      size={24}
                    />
                  ) : (
                    <Text style={styles.rankNumber}>{entry.rank}</Text>
                  )}
                </View>

                <View
                  style={[
                    styles.avatar,
                    entry.rank === 1 && styles.avatar1,
                    entry.rank === 2 && styles.avatar2,
                    entry.rank === 3 && styles.avatar3,
                  ]}
                >
                  {entry.avatar.startsWith("http") ? (
                    <Image
                      source={{ uri: entry.avatar }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                    />
                  ) : (
                    <Text style={styles.avatarText}>{entry.avatar}</Text>
                  )}
                </View>

                <View style={styles.usernameContainer}>
                  <Text
                    style={[
                      styles.username,
                      entry.rank === 1 && styles.username1,
                      entry.rank === 2 && styles.username2,
                      entry.rank === 3 && styles.username3,
                    ]}
                  >
                    {entry.username}
                  </Text>
                </View>

                <View style={styles.pointsContainer}>
                  <Text
                    style={[
                      styles.entryPoints,
                      entry.rank === 1 && styles.entryPoints1,
                      entry.rank === 2 && styles.entryPoints2,
                      entry.rank === 3 && styles.entryPoints3,
                    ]}
                  >
                    {entry.points.toLocaleString()}
                  </Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </LinearGradient>
            );
          })}

          {currentUserRank && currentUserRank > 10 && (
            <View style={styles.currentUserContainer}>
              <View style={styles.currentUserCard}>
                <View style={styles.rankContainer}>
                  <Text style={styles.rankNumber}>#{currentUserRank}</Text>
                </View>
                <View style={styles.currentUserAvatar}>
                  <Text style={styles.avatarText}>You</Text>
                </View>
                <View style={styles.usernameContainer}>
                  <Text style={styles.currentUserName}>You</Text>
                </View>
                <View style={styles.pointsContainer}>
                  <Text style={styles.currentUserPoints}>
                    {currentUserPoints?.toLocaleString()}
                  </Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// EarnPointsActions Component
const EarnPointsActions: React.FC = () => {
  const actions = [
    {
      id: 1,
      title: "Check into Hotspots",
      description: "Visit trending locations",
      points: 5,
      icon: MapPin,
    },
    {
      id: 2,
      title: "App Login",
      description: "Connect with others",
      points: 10,
      icon: Users,
    },
    {
      id: 3,
      title: "Connect with others",
      description: "Grow your network",
      points: 5,
      icon: UserPlus,
    },
    {
      id: 4,
      title: "Chat with 3 likes",
      description: "Be visible and engage",
      points: 5,
      icon: Zap,
    },
    {
      id: 5,
      title: "Give a Review on App",
      description: "Help us improve",
      points: 25,
      icon: Star,
    },
  ];

  return (
    <View style={styles.actionsContainer}>
      <Text style={styles.sectionTitle}>Ways to Earn More</Text>
      <View style={styles.actionsGrid}>
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <LinearGradient
              key={action.id}
              colors={["#0f172a", "#1e293b"]}
              style={styles.actionCard}
            >
              <View style={styles.actionCardInner}>
                <View style={styles.actionIcon}>
                  <IconComponent color="#94a3b8" size={24} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
                <View style={styles.actionPointsRow}>
                  <Text style={styles.actionPoints}>+{action.points}</Text>
                  <Text style={styles.actionPointsLabel}>pts</Text>
                </View>
              </View>
            </LinearGradient>
          );
        })}
      </View>
    </View>
  );
};

// RecentActivity Component
const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  return (
    <View style={styles.activityContainer}>
      <View style={styles.activityHeader}>
        <Clock color="#94a3b8" size={20} />
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>

      {activities.length === 0 ? (
        <View style={styles.activityEmpty}>
          <View style={styles.activityEmptyIcon}>
            <Clock color="#64748b" size={24} />
          </View>
          <Text style={styles.activityEmptyTitle}>No activity yet</Text>
          <Text style={styles.activityEmptySubtitle}>
            Earn or redeem points to see your history here.
          </Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {activities.map((activity) => (
            <View key={activity.id} style={styles.activityCard}>
              <View
                style={[
                  styles.activityIcon,
                  activity.type === "earn"
                    ? styles.activityIconEarn
                    : styles.activityIconRedeem,
                ]}
              >
                {activity.type === "earn" ? (
                  <Plus color="#34d399" size={16} />
                ) : (
                  <Minus color="#f87171" size={16} />
                )}
              </View>

              <View style={styles.activityContent}>
                <Text style={styles.activityDescription}>
                  {activity.description}
                </Text>
                <Text style={styles.activityTimestamp}>
                  {activity.timestamp}
                </Text>
              </View>

              <View style={styles.activityPointsContainer}>
                <Text
                  style={[
                    styles.activityPoints,
                    activity.type === "earn"
                      ? styles.activityPointsEarn
                      : styles.activityPointsRedeem,
                  ]}
                >
                  {activity.type === "earn" ? "+" : "-"}
                  {activity.points}
                </Text>
                <Text style={styles.activityPointsLabel}>pts</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// Main App Component
export function RewardsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tierInfo, setTierInfo] = useState<TierInfo>(calculateTier(0));

  const getDefaultAvatar = (index: number): string => {
    const avatars = [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=5",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=6",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=7",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=8",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=9",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=10",
    ];
    return avatars[index] || avatars[0];
  };

  const formatTimestamp = (date: string): string => {
    const created = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return created.toLocaleDateString();
  };

  const fetchData = async (): Promise<void> => {
    try {
      // Fetch current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setCurrentUser(profile);
          const points = profile?.points || 0;
          setTierInfo(calculateTier(points));
        }

        // Fetch user's recent activities
        const { data: activityData, error: activityError } = await supabase
          .from("points_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (activityError) {
          console.error("Error fetching activities:", activityError);
        } else if (activityData) {
          const formattedActivities: Activity[] = activityData.map((tx) => ({
            id: tx.id,
            type: tx.transaction_type,
            description: tx.description,
            points: Math.abs(tx.points),
            timestamp: formatTimestamp(tx.created_at),
          }));
          setActivities(formattedActivities);
        }
      }

      // Fetch leaderboard
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from("user_profiles")
        .select("id, full_name, points, avatar_url")
        .order("points", { ascending: false })
        .limit(20);

      if (leaderboardError) {
        console.error("Error fetching leaderboard:", leaderboardError);
      } else if (leaderboardData) {
        const formattedLeaderboard: LeaderboardEntry[] = leaderboardData.map(
          (user, index) => ({
            rank: index + 1,
            username: user.full_name || "Anonymous",
            points: user.points || 0,
            avatar: user.avatar_url || getDefaultAvatar(index),
            id: user.id,
          })
        );
        setLeaderboard(formattedLeaderboard);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = (): void => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#94a3b8" />
      </View>
    );
  }

  const userPoints = currentUser?.points || 0;
  const currentUserRank =
    leaderboard.findIndex((entry) => entry.id === currentUser?.id) + 1;

  return (
    <LinearGradient colors={["#000000", "#0f172a"]} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <RewardHeader
          points={userPoints}
          nextTierPoints={tierInfo.pointsToNext}
          tierName={tierInfo.nextTierName}
          tierProgress={tierInfo.tierProgress}
        />
        <LiveLeaderboard
          entries={leaderboard}
          currentUserRank={currentUserRank > 10 ? currentUserRank : undefined}
          currentUserPoints={userPoints}
        />
        <EarnPointsActions />
        <RecentActivity activities={activities} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  pointsCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#06b6d4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  pointsCardInner: {
    position: "relative",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },
  pointsAmount: {
    fontSize: 40,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 20,
    letterSpacing: -1,
  },
  pointsSuffix: {
    fontSize: 24,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  progressContainer: {
    gap: 8,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  progressTarget: {
    fontSize: 13,
    color: "#06b6d4",
    fontWeight: "600",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#1e293b",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 0,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#06b6d4",
    borderRadius: 4,
  },
  leaderboardContainer: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    marginBottom: 8,
  },
  leaderboardCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "#1e293b",
    backdropFilter: "blur(10px)",
  },
  leaderboardHeader: {
    marginBottom: 16,
  },
  leaderboardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    flex: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.2)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#06b6d4",
  },
  liveText: {
    fontSize: 11,
    color: "#06b6d4",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    backgroundColor: "#1e293b",
    padding: 4,
    borderRadius: 12,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#334155",
  },
  filterButtonInactive: {
    backgroundColor: "transparent",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#f1f5f9",
  },
  filterButtonTextInactive: {
    color: "#64748b",
  },
  entriesContainer: {
    gap: 8,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  rankContainer: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "700",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#334155",
  },
  avatar1: {
    backgroundColor: "#06b6d4",
  },
  avatar2: {
    backgroundColor: "#94a3b8",
  },
  avatar3: {
    backgroundColor: "#64748b",
  },
  avatarText: {
    fontSize: 20,
    color: "#f1f5f9",
  },
  usernameContainer: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    color: "#e2e8f0",
    fontWeight: "600",
  },
  username1: {
    color: "#22d3ee",
  },
  username2: {
    color: "#cbd5e1",
  },
  username3: {
    color: "#94a3b8",
  },
  pointsContainer: {
    alignItems: "flex-end",
  },
  entryPoints: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "700",
  },
  entryPoints1: {
    color: "#06b6d4",
  },
  entryPoints2: {
    color: "#cbd5e1",
  },
  entryPoints3: {
    color: "#94a3b8",
  },
  pointsLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  currentUserContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  currentUserCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#475569",
  },
  currentUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3b82f6",
  },
  currentUserName: {
    fontSize: 14,
    color: "#f1f5f9",
    fontWeight: "600",
  },
  currentUserPoints: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "700",
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "48%",
    borderRadius: 16,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  actionCardInner: {
    padding: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  actionTitle: {
    fontSize: 14,
    color: "#f1f5f9",
    fontWeight: "600",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 12,
    lineHeight: 16,
  },
  actionPointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionPoints: {
    fontSize: 14,
    color: "#06b6d4",
    fontWeight: "700",
  },
  actionPointsLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  activityContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 32,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "basline",
  
    gap: 10,
    marginBottom: 16,
  },
  activityList: {
    gap: 8,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  activityIconEarn: {
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    borderColor: "rgba(34, 211, 238, 0.2)",
  },
  activityIconRedeem: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: "#f1f5f9",
    fontWeight: "500",
    marginBottom: 4,
  },
  activityTimestamp: {
    fontSize: 12,
    color: "#94a3b8",
  },
  activityPointsContainer: {
    alignItems: "flex-end",
  },
  activityPoints: {
    fontSize: 15,
    fontWeight: "700",
  },
  activityPointsEarn: {
    color: "#06b6d4",
  },
  activityPointsRedeem: {
    color: "#ef4444",
  },
  activityPointsLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  activityEmpty: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  activityEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  activityEmptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  activityEmptySubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 220,
  },
});