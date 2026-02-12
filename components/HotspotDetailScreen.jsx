import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { ChatFeedModal } from "./ChatFeedModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper functions
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const miToFeet = (mi) => mi * 5280;

const getDailyUserRange = (current) => {
  const estimated = current * 3.5;
  if (estimated >= 100) return "100+";
  if (estimated >= 70) return "70+";
  if (estimated >= 50) return "50+";
  if (estimated >= 25) return "25+";
  return "10+";
};

const getCategoryTags = (category) => {
  const categoryMap = {
    bars: ["Cocktails", "Happy Hour", "Nightlife"],
    bar: ["Cocktails", "Happy Hour", "Nightlife"],
    pub: ["Cocktails", "Happy Hour", "Nightlife"],
    food: ["Dining", "Casual", "Takeout"],
    cafe: ["Coffee", "Casual", "WiFi"],
    restaurant: ["Dining", "Casual", "Takeout"],
    fitness: ["Workout", "Wellness", "Classes"],
    fitness_centre: ["Workout", "Wellness", "Classes"],
    nightlife: ["Club", "Dancing", "Late Night"],
    events: ["Live", "Entertainment", "Special Event"],
    coworking_space: ["Work", "WiFi", "Community"],
    college: ["Study", "Campus", "Community"],
    university: ["Study", "Campus", "Community"],
    library: ["Study", "Quiet", "Books"],
  };
  return (
    categoryMap[category?.toLowerCase()] || ["Trending", "Popular", "Local"]
  );
};

const HotspotDetailScreen = ({ route }) => {
  const hotspot = route?.params?.hotspot;
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(0)).current;

  // State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [actualDistance, setActualDistance] = useState(null);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [weeklyUserCount, setWeeklyUserCount] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [redeemedOfferInfo, setRedeemedOfferInfo] = useState(null);
  const [redeemedOfferIds, setRedeemedOfferIds] = useState(() => new Set());
  const [showOffersList, setShowOffersList] = useState(false);

  if (!hotspot) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.card}>
          <Text style={styles.fallbackText}>No hotspot data available</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.fallbackButton}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const categoryTags = getCategoryTags(hotspot.type || hotspot.category);
  const currentCount = activeUsers.length || hotspot.people_count || 0;

  // Animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 30,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        if (hotspot.latitude && hotspot.longitude) {
          const distMi = calculateDistance(
            coords.latitude,
            coords.longitude,
            hotspot.latitude,
            hotspot.longitude,
          );
          const distFeet = miToFeet(distMi);
          if (distFeet < 1000) {
            setActualDistance(`${Math.round(distFeet)}ft`);
          } else {
            setActualDistance(`${distMi.toFixed(1)}mi`);
          }
        }
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };
    getUserLocation();
  }, [hotspot]);

  // Get current user
  useEffect(() => {
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

        setCurrentUser({
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || user.email?.split("@")[0] || "User",
          profile: profile,
        });
      }
    };
    getCurrentUser();
  }, []);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("hotspot_messages_with_replies")
        .select("*")
        .eq("hotspot_id", hotspot.id)
        .or("moderation_status.is.null,moderation_status.eq.approved")
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw error;

      const formattedMessages = data.map((msg) => ({
        ...msg,
        username: msg.full_name || msg.email?.split("@")[0] || "Unknown User",
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Fetch weekly user count from history
  const fetchWeeklyUserCount = async () => {
    try {
      const oneWeekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error, count } = await supabase
        .from("hotspot_visit_history")
        .select("user_id", { count: "exact", head: false })
        .eq("hotspot_id", hotspot.id)
        .gte("visited_at", oneWeekAgo);

      if (error) throw error;

      // Get unique user count
      const uniqueUsers = data ? new Set(data.map((d) => d.user_id)).size : 0;
      setWeeklyUserCount(uniqueUsers);
    } catch (error) {
      console.error("Error fetching weekly user count:", error);
      setWeeklyUserCount(0);
    }
  };

  // Fetch active users
  const fetchActiveUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("active_hotspot_users")
        .select("*")
        .eq("hotspot_id", hotspot.id)
        .gte("last_seen", new Date(Date.now() - 30 * 60 * 1000).toISOString());

      if (error) throw error;

      const formattedUsers = data.map((u) => {
        return {
          user_id: u.user_id,
          joined_at: u.joined_at,
          last_seen: u.last_seen,
          username: u.full_name || "User",
          avatar_url: u.avatar_url || null,
          bio: u.status || null,
          points: 0,
        };
      });

      setActiveUsers(formattedUsers);

      if (currentUser) {
        setIsJoined(formattedUsers.some((u) => u.user_id === currentUser.id));
      }
    } catch (error) {
      console.error("Error fetching active users:", error);
    }
  };

  const loadRedeemedOffers = useCallback(async () => {
    if (!currentUser?.id || !hotspot?.id) {
      setRedeemedOfferIds(new Set());
      return;
    }

    try {
      const { data, error } = await supabase
        .from("offer_redemptions")
        .select("offer_id")
        .eq("user_id", currentUser.id)
        .eq("hotspot_id", hotspot.id);

      if (error) throw error;

      setRedeemedOfferIds(new Set(data.map((row) => row.offer_id)));
    } catch (error) {
      console.error("Error loading redeemed offers:", error);
    }
  }, [currentUser?.id, hotspot?.id]);

  // Fetch offers for this hotspot
  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      const { data, error } = await supabase.rpc("get_active_offers", {
        p_hotspot_id: hotspot.id,
      });

      if (error) throw error;
      setOffers(data || []);
      loadRedeemedOffers();
    } catch (error) {
      console.error("Error fetching offers:", error);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  };

  // Load data
  useEffect(() => {
    if (hotspot.id) {
      fetchMessages();
      fetchActiveUsers();
      fetchWeeklyUserCount();
      fetchOffers();
    }
  }, [hotspot.id, currentUser]);

  useEffect(() => {
    loadRedeemedOffers();
  }, [loadRedeemedOffers]);

  // Realtime subscriptions
  useEffect(() => {
    if (!hotspot.id) return;

    const messagesChannel = supabase
      .channel(`hotspot-messages-${hotspot.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hotspot_messages",
          filter: `hotspot_id=eq.${hotspot.id}`,
        },
        () => fetchMessages(),
      )
      .subscribe();

    const usersChannel = supabase
      .channel(`hotspot-users-${hotspot.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hotspot_active_users",
          filter: `hotspot_id=eq.${hotspot.id}`,
        },
        () => fetchActiveUsers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [hotspot.id]);

  // Join/leave hotspot
  const toggleJoinHotspot = async () => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    try {
      if (isJoined) {
        const { error } = await supabase
          .from("hotspot_active_users")
          .delete()
          .eq("hotspot_id", hotspot.id)
          .eq("user_id", currentUser.id);

        if (error) throw error;
        setIsJoined(false);
      } else {
        if (userLocation && hotspot.latitude && hotspot.longitude) {
          const distMi = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            hotspot.latitude,
            hotspot.longitude,
          );
          const distFeet = miToFeet(distMi);

          if (distFeet > 10000) {
            Alert.alert(
              "Too far away",
              `You must be within 500ft to join. You're ${Math.round(distFeet)}ft away.`,
            );
            return;
          }
        }

        const now = new Date().toISOString();

        // First, leave any other hotspots the user is currently in
        const { error: deleteError } = await supabase
          .from("active_hotspot_users")
          .delete()
          .eq("user_id", currentUser.id);

        if (deleteError) {
          console.error("Error leaving previous hotspots:", deleteError);
        }

        // Now join the new hotspot
        const { error: activeError } = await supabase
          .from("active_hotspot_users")
          .insert({
            hotspot_id: hotspot.id,
            user_id: currentUser.id,
            full_name: currentUser.full_name || "Anonymous",
            avatar_url: currentUser.avatar_url,
            status: "Active",
            location_detail: hotspot.name,
            last_seen: now,
          });

        if (activeError) {
          console.error(
            "Error inserting into active_hotspot_users:",
            activeError,
          );
          throw activeError;
        }

        console.log("Successfully joined hotspot:", hotspot.id);

        // Save to permanent visit history
        const { error: historyError } = await supabase
          .from("hotspot_visit_history")
          .insert({
            hotspot_id: hotspot.id,
            user_id: currentUser.id,
            visited_at: now,
          });

        if (historyError) throw historyError;
        setIsJoined(true);

        // Refresh weekly count
        fetchWeeklyUserCount();

        const today = new Date().toISOString().split("T")[0];
        const { data: existingPoints } = await supabase
          .from("points_transactions")
          .select("id")
          .eq("user_id", currentUser.id)
          .eq("description", `Joined hotspot: ${hotspot.name}`)
          .gte("created_at", today)
          .maybeSingle();

        if (!existingPoints) {
          await supabase.from("points_transactions").insert({
            user_id: currentUser.id,
            transaction_type: "earn",
            points: 5,
            description: `Joined hotspot: ${hotspot.name}`,
          });
        }
      }
    } catch (error) {
      console.error("Error toggling join:", error);
      Alert.alert("Error", "Failed to update status");
    }
  };

  const handleRedeemOffer = async (offer) => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to redeem offers");
      return;
    }

    try {
      const { data: existingRedemption } = await supabase
        .from("offer_redemptions")
        .select("id")
        .eq("offer_id", offer.id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (existingRedemption) {
        Alert.alert("Already Redeemed", "You have already redeemed this offer");
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
    } catch (error) {
      console.error("Error redeeming offer:", error);
      Alert.alert("Error", error.message || "Failed to redeem offer");
    }
  };

  const renderOffer = (offer) => {
    const daysRemaining = offer.days_remaining;
    const isExpiringSoon = daysRemaining !== null && daysRemaining <= 3;
    const isRedeemed = redeemedOfferIds.has(offer.id);

    return (
      <TouchableOpacity
        key={offer.id}
        style={[styles.offerCard, isRedeemed && styles.offerCardRedeemed]}
        onPress={() => handleRedeemOffer(offer)}
        activeOpacity={isRedeemed ? 1 : 0.8}
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
                    : offer.offer_type === "loyalty"
                      ? "LOYALTY"
                      : "OFFER"}
            </Text>
          </View>
          {isExpiringSoon && (
            <View style={styles.expiringBadge}>
              <Text style={styles.expiringText}>⚡ {daysRemaining}d left</Text>
            </View>
          )}
        </View>
        <Text style={styles.offerTitle}>{offer.title}</Text>
        {offer.description && (
          <Text style={styles.offerDescription} numberOfLines={2}>
            {offer.description}
          </Text>
        )}
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

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 1000,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      navigation.goBack();
    });
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
          pointerEvents="box-only"
        />

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>{hotspot.name}</Text>
                <Text style={styles.subtitle}>
                  {(hotspot.type || hotspot.category)?.replace(/_/g, " ")} •{" "}
                  {actualDistance || hotspot.distance || "nearby"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <FontAwesome6 name="xmark" size={20} color="#60A5FA" />
              </TouchableOpacity>
            </View>

            {/* Category Pills */}
            <View style={styles.categoryPills}>
              {categoryTags.map((tag) => (
                <View key={tag} style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Live Activity Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <View style={styles.liveIndicator} />
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>{currentCount}</Text>
                  <Text style={styles.statLabel}>Now</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <FontAwesome6 name="users" size={16} color="#60A5FA" />
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>
                    {weeklyUserCount !== null ? weeklyUserCount : "..."}
                  </Text>
                  <Text style={styles.statLabel}>this week</Text>
                </View>
              </View>
            </View>

            {/* Offers Section */}
            {(offers.length > 0 || loadingOffers) && (
              <View style={styles.offersSection}>
                <TouchableOpacity
                  style={[
                    styles.offersSectionHeader,
                    showOffersList && styles.offersSectionHeaderExpanded,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setShowOffersList((prev) => !prev)}
                >
                  <FontAwesome6 name="ticket" size={18} color="#60A5FA" />
                  <Text style={styles.offersSectionTitle}>Active Offers</Text>
                  <View style={styles.offersCountBadge}>
                    <Text style={styles.offersCountText}>
                      {loadingOffers ? "--" : offers.length}
                    </Text>
                  </View>
                  <FontAwesome6
                    name={showOffersList ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#94A3B8"
                  />
                </TouchableOpacity>

                {showOffersList && (
                  <>
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
                        {offers.map((offer) => renderOffer(offer))}
                      </ScrollView>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Live Chat Feed and Join Button */}
            <View style={styles.actionSection}>
              {/* Chat Feed */}
              <TouchableOpacity
                style={styles.chatFeed}
                onPress={() => {
                  console.log("Chat clicked, current state:", isChatModalOpen);
                  setIsChatModalOpen(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.chatHeader}>
                  <FontAwesome6 name="message" size={16} color="#60A5FA" />
                  <Text style={styles.chatTitle}>Live Chat</Text>
                  <View style={styles.chatLiveIndicator} />
                </View>

                {!isChatModalOpen ? (
                  <>
                    <View style={styles.chatMessages}>
                      {messages
                        .slice(0, showAllMessages ? messages.length : 2)
                        .map((msg) => (
                          <View key={msg.id} style={styles.chatMessage}>
                            <Text style={styles.chatUser}>{msg.username}</Text>
                            <Text style={styles.chatText}> {msg.content}</Text>
                            <Text style={styles.chatTime}>
                              {" "}
                              {getTimeAgo(msg.created_at)}
                            </Text>
                          </View>
                        ))}
                    </View>
                    {!showAllMessages && messages.length > 2 && (
                      <TouchableOpacity
                        onPress={(e) => setShowAllMessages(true)}
                      >
                        <Text style={styles.viewMore}>View more...</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={styles.chatPrompt}>
                      Click to join conversation
                    </Text>
                  </>
                ) : (
                  <View style={styles.chatMessages}>
                    {messages.map((msg) => (
                      <View key={msg.id} style={styles.chatMessage}>
                        <Text
                          style={[
                            styles.chatUser,
                            msg.user_id === currentUser?.id &&
                              styles.chatUserSelf,
                          ]}
                        >
                          {msg.username}
                        </Text>
                        <Text style={styles.chatText}> {msg.content}</Text>
                        <Text style={styles.chatTime}>
                          {" "}
                          {getTimeAgo(msg.created_at)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>

              {/* Join Button */}
              <TouchableOpacity onPress={toggleJoinHotspot} activeOpacity={0.8}>
                <LinearGradient
                  colors={
                    isJoined ? ["#EF4444", "#DC2626"] : ["#3B82F6", "#2563EB"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.joinButton}
                >
                  <FontAwesome6 name="credit-card" size={20} color="white" />
                  <Text style={styles.joinButtonText}>
                    {isJoined ? "Leave" : "Join"}
                    {"\n"}Hotspot
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>

      {/* Chat Modal */}
      {isChatModalOpen && (
        <ChatFeedModal
          hotspot={hotspot}
          messages={messages}
          setMessages={setMessages}
          onClose={() => setIsChatModalOpen(false)}
        />
      )}

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
              Present this screen to a team member to claim your reward at{" "}
              {redeemedOfferInfo?.location}
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
              <Text style={styles.redeemCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: "#18181B", // zinc-900
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    borderTopWidth: 1,
    borderColor: "#27272A", // zinc-800
    height: "45%",
    width: "100%",
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 48,
    height: 4,
    backgroundColor: "#52525B", // zinc-600
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#A1A1AA", // zinc-400
    textTransform: "capitalize",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#27272A", // zinc-800
    justifyContent: "center",
    alignItems: "center",
  },
  categoryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#60A5FA",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(39, 39, 42, 0.5)", // zinc-800/50
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#52525B", // zinc-600
    marginHorizontal: 12,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
  },
  statContent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  statLabel: {
    fontSize: 14,
    color: "#A1A1AA",
  },
  actionSection: {
    flexDirection: "row",
    gap: 12,
  },
  chatFeed: {
    flex: 1,
    backgroundColor: "rgba(39, 39, 42, 0.5)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#52525B",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  chatLiveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F97316",
    marginLeft: "auto",
  },
  chatMessages: {
    maxHeight: 192,
  },
  chatMessage: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  chatUser: {
    fontSize: 14,
    fontWeight: "600",
    color: "#60A5FA",
  },
  chatUserSelf: {
    color: "#3B82F6",
  },
  chatText: {
    fontSize: 14,
    color: "#D4D4D8",
  },
  chatTime: {
    fontSize: 12,
    color: "#71717A",
  },
  viewMore: {
    fontSize: 12,
    fontWeight: "600",
    color: "#60A5FA",
    marginTop: 12,
  },
  chatPrompt: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
    marginTop: 12,
  },
  joinButton: {
    width: 100,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
  },
  fallbackText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    padding: 24,
  },
  fallbackButton: {
    color: "#60A5FA",
    textAlign: "center",
    fontSize: 16,
  },
  redeemModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  redeemModal: {
    width: "100%",
    backgroundColor: "#18181B",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  redeemModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  redeemModalSubtitle: {
    fontSize: 14,
    color: "#d4d4d8",
    textAlign: "center",
    lineHeight: 20,
  },
  redeemCodeCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
    alignItems: "center",
    gap: 6,
  },
  redeemCodeLabel: {
    color: "#93c5fd",
    fontSize: 12,
    letterSpacing: 1,
  },
  redeemCode: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 4,
  },
  redeemOfferTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  redeemOfferDescription: {
    fontSize: 14,
    color: "#d4d4d8",
    textAlign: "center",
  },
  redeemCloseButton: {
    marginTop: 4,
    backgroundColor: "#60A5FA",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  redeemCloseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  offersSection: {
    marginBottom: 24,
  },
  offersSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  offersSectionHeaderExpanded: {
    marginBottom: 12,
  },
  offersSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  offersCountBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: "auto",
  },
  offersCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#60A5FA",
  },
  offersScroll: {
    gap: 12,
    paddingRight: 24,
  },
  offerCard: {
    width: 280,
    backgroundColor: "rgba(39, 39, 42, 0.8)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#52525B",
  },
  offerCardRedeemed: {
    opacity: 0.55,
  },
  offerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  offerTypeTag: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  offerTypeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#60A5FA",
  },
  expiringBadge: {
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(249, 115, 22, 0.4)",
  },
  expiringText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F97316",
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: "#A1A1AA",
    marginBottom: 12,
    lineHeight: 20,
  },
  offerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#52525B",
  },
  redeemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#60A5FA",
  },
  redeemTextRedeemed: {
    color: "rgba(255, 255, 255, 0.5)",
  },
});

export default HotspotDetailScreen;
