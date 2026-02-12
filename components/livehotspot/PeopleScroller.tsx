import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Alert, Modal, Linking } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { supabase } from "../../lib/supabase";

interface Person {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  is_friend: boolean;
  status?: string;
  location_detail?: string;
  joined_at: string;
  bio?: string;
  socials?: any;
}

interface PeopleScrollerProps {
  hotspotId: string;
}

export function PeopleScroller({ hotspotId }: PeopleScrollerProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showSocials, setShowSocials] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (!hotspotId) return;

    fetchActiveUsers();
    subscribeToUsers();
  }, [hotspotId]);

  const fetchActiveUsers = async () => {
    const { data, error } = await supabase
      .from("active_hotspot_users")
      .select("*")
      .eq("hotspot_id", hotspotId)
      .gt("last_seen", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error fetching active users:", error);
      return;
    }

    if (data) {
      // Fetch additional profile data for each user
      const enrichedPeople = await Promise.all(
        data.map(async (person: any) => {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("bio, socials")
            .eq("id", person.user_id)
            .single();
          
          return {
            ...person,
            bio: profile?.bio,
            socials: profile?.socials,
          };
        })
      );
      setPeople(enrichedPeople as Person[]);
    }
  };

  const subscribeToUsers = () => {
    const channel = supabase
      .channel(`people-${hotspotId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_hotspot_users",
          filter: `hotspot_id=eq.${hotspotId}`,
        },
        () => {
          fetchActiveUsers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getAvatarDisplay = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const joined = new Date(timestamp);
    const diffMs = now.getTime() - joined.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just joined";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return "Earlier";
  };

  const handleConnect = async (person: Person) => {
    try {
      setConnectingUserId(person.user_id);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Error", "You must be logged in to connect");
        return;
      }

      // Check if connection already exists
      const { data: existingConnection, error: checkError } = await supabase
        .from("connections")
        .select("id")
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${person.user_id}),and(user_id.eq.${person.user_id},connected_user_id.eq.${user.id})`)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking connection:", checkError);
        Alert.alert("Error", "Failed to check connection status");
        return;
      }

      if (existingConnection) {
        Alert.alert("Already Connected", `You're already connected with ${person.full_name}!`);
        return;
      }

      // Create new connection
      const { error: insertError } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          connected_user_id: person.user_id,
          location: person.location_detail || hotspotId,
          met_date: new Date().toISOString(),
          is_active: true,
          is_recent: true,
        });

      if (insertError) {
        console.error("Error creating connection:", insertError);
        Alert.alert("Error", "Failed to create connection");
        return;
      }

      Alert.alert(
        "Connected!",
        `You're now connected with ${person.full_name}. You can message them in your Wallet.`,
        [{ text: "Great!" }]
      );

    } catch (error) {
      console.error("Error in handleConnect:", error);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setConnectingUserId(null);
    }
  };

  const handleShowSocials = (person: Person) => {
    setSelectedPerson(person);
    setShowSocials(true);
  };

  const handleShowAbout = (person: Person) => {
    setSelectedPerson(person);
    setShowAbout(true);
  };

  const openSocialLink = async (platform: string, username: string) => {
    const urls: Record<string, string> = {
      instagram: `https://instagram.com/${username}`,
      snapchat: `https://snapchat.com/add/${username}`,
      linkedin: `https://linkedin.com/in/${username}`,
      github: `https://github.com/${username}`,
      twitter: `https://twitter.com/${username}`,
      youtube: `https://youtube.com/@${username}`,
    };
    
    const url = urls[platform];
    if (url) {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    }
  };

  if (people.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No one else is here yet</Text>
        <Text style={styles.emptySubtext}>Be the first to join!</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {people.map((person) => (
        <View key={person.id} style={styles.card}>
          {/* Embossed Pattern Background */}
          <View style={styles.embossedPattern} />

          {/* Top Section */}
          <View style={styles.topSection}>
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {person.avatar_url ? (
                  <Image
                    source={{ uri: person.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <FontAwesome6 name="user" size={24} color="#072E46" />
                  </View>
                )}
              </View>

              {/* Name & Status */}
              <View style={styles.nameSection}>
                <Text style={styles.name} numberOfLines={1}>
                  {person.full_name || "Anonymous"}
                </Text>
                <View style={styles.statusRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.statusText}>
                    {person.status || "Active"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Location & Connect Row */}
          <View style={styles.locationConnectRow}>
            <View style={styles.locationChip}>
              <FontAwesome6 name="location-dot" size={14} color="#072E46" />
              <Text style={styles.locationText} numberOfLines={1}>
                {person.location_detail || "At this hotspot"}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.connectButton}
              onPress={() => handleConnect(person)}
              disabled={connectingUserId === person.user_id}
            >
              <Text style={styles.connectText}>
                {connectingUserId === person.user_id ? "Connecting..." : "Connect"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionButton}
              onPress={() => handleShowSocials(person)}
            >
              <FontAwesome6 name="link" size={12} color="#072E46" />
              <Text style={styles.actionButtonText}>Socials</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.actionButton}
              onPress={() => handleShowAbout(person)}
            >
              <FontAwesome6 name="circle-info" size={12} color="#072E46" />
              <Text style={styles.actionButtonText}>About</Text>
            </TouchableOpacity>
          </View>

          {/* Tier Badge - Bottom Left */}
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>BEGINNER</Text>
            <Text style={styles.tierLabel}>CARD</Text>
          </View>

          {/* Cliqcard Text - Bottom Right */}
          <View style={styles.brandingContainer}>
            <Text style={styles.branding}>CLIQCARD</Text>
          </View>
        </View>
      ))}

      {/* Socials Modal */}
      <Modal
        visible={showSocials}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSocials(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPerson?.full_name}'s Socials
              </Text>
              <TouchableOpacity onPress={() => setShowSocials(false)}>
                <FontAwesome6 name="xmark" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {selectedPerson?.socials && Object.keys(selectedPerson.socials).length > 0 ? (
                Object.entries(selectedPerson.socials).map(([platform, username]) => (
                  username && (
                    <TouchableOpacity
                      key={platform}
                      style={styles.socialRow}
                      onPress={() => openSocialLink(platform, username as string)}
                    >
                      <View style={styles.socialIconContainer}>
                        <FontAwesome6 
                          name={platform === "twitter" ? "x-twitter" : platform as any} 
                          size={20} 
                          color="#333" 
                        />
                      </View>
                      <Text style={styles.socialUsername}>@{username as string}</Text>
                      <FontAwesome6 name="arrow-up-right-from-square" size={16} color="#666" />
                    </TouchableOpacity>
                  )
                ))
              ) : (
                <Text style={styles.emptyModalText}>No social links added yet</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={showAbout}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAbout(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                About {selectedPerson?.full_name}
              </Text>
              <TouchableOpacity onPress={() => setShowAbout(false)}>
                <FontAwesome6 name="xmark" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text style={styles.bioText}>
                {selectedPerson?.bio || "No bio added yet"}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontSize: 16,
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#CFEFFB",
    borderRadius: 20,
    padding: 20,
    position: "relative",
    marginBottom: 16,
    height: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 20,
  },
  embossedPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    backgroundColor: "rgba(4, 46, 70, 0.08)",
    borderRadius: 20,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
    width: 60,
    height: 60,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7ED6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: "600",
    color: "#072E46",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3DDC84",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#072E46",
  },
  locationConnectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#CFEFFB",
    boxShadow: "inset 0px 4px 10px 1px rgba(0, 0, 0, 0.15)",
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#072E46",
    flex: 1,
  },
  connectButton: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  connectText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#CFEFFB",
    boxShadow: "inset 0px 2px 10px 1px rgba(0, 0, 0, 0.15)",
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#072E46",
  },
  tierBadge: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  tierText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#072E46",
  },
  tierLabel: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.5,
    opacity: 0.5,
    color: "#072E46",
  },
  brandingContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  branding: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#072E46",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  modalContent: {
    maxHeight: 400,
  },
  emptyModalText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    paddingVertical: 40,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  socialIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center",
  },
  socialUsername: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
});
