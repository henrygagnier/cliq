import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import {
  getUserConnections,
  Connection,
  getDMConversations,
  DMConversation,
  formatRelativeTime,
} from "../../lib/walletUtils";
import { ProfileCard } from "../shared/ProfileCard";
import { DMModal } from "./DMModal";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffWeeks > 0) return `${diffWeeks}w ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

function isRecent(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays <= 7; // Recent if within last week
}

export default function WalletScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"Wallet" | "DMs">("Wallet");
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(
    null,
  );
  const [connectionProfiles, setConnectionProfiles] = useState<
    Record<string, any>
  >({});
  const [selectedConnection, setSelectedConnection] =
    useState<Connection | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadConnections(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadConnections(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadConnections(userId: string) {
    setLoading(true);
    const data = await getUserConnections(userId);
    setConnections(data);

    // Load DM conversations
    const conversations = await getDMConversations(userId);
    setDmConversations(conversations);

    // Load current user's profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (profile) {
      setUserProfile(profile);
    }

    // Load profiles with socials for all connections
    if (data.length > 0) {
      const userIds = data.map((c) => c.connected_user_id);
      console.log("Loading profiles for user IDs:", userIds);

      const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("id, socials, bio, dob")
        .in("id", userIds);

      if (error) {
        console.error("Error loading profiles:", error);
      }

      if (profiles) {
        console.log("Loaded profiles:", JSON.stringify(profiles, null, 2));
        profiles.forEach((p) => {
          console.log(`Profile ${p.id}: dob = ${p.dob}`);
        });
        const profileMap: Record<string, any> = {};
        profiles.forEach((p) => {
          profileMap[p.id] = p;
        });
        setConnectionProfiles(profileMap);
      }
    }

    setLoading(false);
  }

  const recentCliqs = connections.filter((c) => isRecent(c.created_at));
  const olderCliqs = connections.filter((c) => !isRecent(c.created_at));

  console.log("[WalletScreen] 📊 Connection Data:", {
    totalConnections: connections.length,
    recentCliqs: recentCliqs.length,
    olderCliqs: olderCliqs.length,
    activeTab: activeTab,
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading connections...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {userProfile?.full_name
            ? `${userProfile.full_name.split(" ")[0]}'s Wallet`
            : "My Wallet"}
        </Text>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === "Wallet" && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab("Wallet")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "Wallet" && styles.segmentTextActive,
              ]}
            >
              Wallet
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeTab === "DMs" && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab("DMs")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "DMs" && styles.segmentTextActive,
              ]}
            >
              DMs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.walletContent}>
          {connections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No connections yet</Text>
              <Text style={styles.emptySubtext}>
                Connect with people at hotspots to see them here
              </Text>
            </View>
          ) : (
            <>
              {/* DMs Tab */}
              {activeTab === "DMs" && (
                <>
                  {dmConversations.length > 0 ? (
                    <View style={styles.dmList}>
                      {dmConversations.map((conversation) => (
                        <TouchableOpacity
                          key={conversation.connection.id}
                          style={styles.dmItem}
                          onPress={() =>
                            setSelectedConnection(conversation.connection)
                          }
                        >
                          <View style={styles.dmAvatar}>
                            {conversation.connection.connected_user_photo ? (
                              <Image
                                source={{
                                  uri: conversation.connection
                                    .connected_user_photo,
                                }}
                                style={styles.dmAvatarImage}
                              />
                            ) : (
                              <View style={styles.dmAvatarPlaceholder}>
                                <FontAwesome6
                                  name="user"
                                  size={18}
                                  color="#666"
                                />
                              </View>
                            )}
                          </View>
                          <View style={styles.dmContent}>
                            <View style={styles.dmHeader}>
                              <Text style={styles.dmName}>
                                {conversation.connection.connected_user_name ||
                                  "Unknown"}
                              </Text>
                              <Text style={styles.dmTime}>
                                {formatRelativeTime(
                                  conversation.lastMessage!.created_at,
                                )}
                              </Text>
                            </View>
                            <View style={styles.dmMessageRow}>
                              <Text
                                style={[
                                  styles.dmMessage,
                                  conversation.unreadCount > 0 &&
                                    styles.dmMessageUnread,
                                ]}
                                numberOfLines={1}
                              >
                                {conversation.lastMessage!.sender_id ===
                                session?.user.id
                                  ? `You: ${conversation.lastMessage!.content}`
                                  : conversation.lastMessage!.content}
                              </Text>
                              {conversation.unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                  <Text style={styles.unreadCount}>
                                    {conversation.unreadCount}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No messages yet</Text>
                      <Text style={styles.emptySubtext}>
                        Start a conversation with your connections
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Wallet Tab */}
              {activeTab === "Wallet" && (
                <>
                  {/* Recent Cliqs */}
                  {recentCliqs.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>YOUR CONNECTIONS</Text>
                      <View style={styles.cardList}>
                        {recentCliqs.map((connection) => {
                          console.log(
                            "[WalletScreen] 🎴 Rendering ProfileCard for:",
                            connection.connected_user_name,
                          );
                          const profile =
                            connectionProfiles[connection.connected_user_id] ||
                            {};
                          return (
                            <ProfileCard
                              key={connection.id}
                              name={
                                connection.connected_user_name || "Unknown User"
                              }
                              avatarUrl={connection.connected_user_photo}
                              location="Not at a hotspot"
                              points={0}
                              socials={profile.socials}
                              bio={profile.bio}
                              dob={profile.dob}
                              statusText={
                                connection.mutual_count > 0
                                  ? `${connection.mutual_count} mutual`
                                  : "Connected"
                              }
                              showConnect={false}
                              onMessagePress={() => {
                                console.log(
                                  "Opening DM for connection:",
                                  connection,
                                );
                                console.log("Connection ID:", connection.id);
                                console.log(
                                  "Profile data:",
                                  connectionProfiles[
                                    connection.connected_user_id
                                  ],
                                );
                                setSelectedConnection(connection);
                              }}
                            />
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Older Cliqs */}
                  {olderCliqs.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>EARLIER</Text>
                      <View style={styles.cardList}>
                        {olderCliqs.map((connection) => {
                          const profile =
                            connectionProfiles[connection.connected_user_id] ||
                            {};
                          return (
                            <ProfileCard
                              key={connection.id}
                              name={
                                connection.connected_user_name || "Unknown User"
                              }
                              avatarUrl={connection.connected_user_photo}
                              location="Not at a hotspot"
                              points={0}
                              socials={profile.socials}
                              bio={profile.bio}
                              dob={profile.dob}
                              statusText={
                                connection.mutual_count > 0
                                  ? `${connection.mutual_count} mutual`
                                  : "Connected"
                              }
                              showConnect={false}
                              onMessagePress={() => {
                                console.log(
                                  "Opening DM for older connection:",
                                  connection,
                                );
                                console.log("Connection ID:", connection.id);
                                console.log(
                                  "Profile data:",
                                  connectionProfiles[
                                    connection.connected_user_id
                                  ],
                                );
                                setSelectedConnection(connection);
                              }}
                            />
                          );
                        })}
                      </View>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* DM Modal */}
      {selectedConnection && session && (
        <DMModal
          connection={selectedConnection}
          currentUserId={session.user.id}
          currentHotspot={null}
          onClose={() => setSelectedConnection(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
    marginBottom: 16,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#161616",
    borderRadius: 100,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#0A0A0A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
  },
  segmentTextActive: {
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  walletContent: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 1.2,
  },
  cardList: {
    gap: 12,
    overflow: "visible",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  dmList: {
    gap: 0,
  },
  dmItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    maxWidth: 340,
    width: "100%",
    alignSelf: "center",
  },
  dmAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
  },
  dmAvatarImage: {
    width: 52,
    height: 52,
  },
  dmAvatarPlaceholder: {
    width: 52,
    height: 52,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  dmContent: {
    flex: 1,
    gap: 4,
  },
  dmHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dmName: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  dmTime: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
  },
  dmMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dmMessage: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    flex: 1,
  },
  dmMessageUnread: {
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
});
