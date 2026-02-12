import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  Linking,
  Alert,
  Animated,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

type CardTier = "lightblue" | "bronze" | "gold" | "platinum" | "black";

const tierConfig = {
  lightblue: {
    cardBg: "#CFEFFB",
    textColor: "#072E46",
    accentColor: "#7ED6FF",
    embossColor: "rgba(4, 46, 70, 0.08)",
    highlightColor: "rgba(255, 255, 255, 0.9)",
  },
  bronze: {
    cardBg: "#B08357",
    textColor: "#4A2F18",
    accentColor: "#D19C65",
    embossColor: "rgba(0, 0, 0, 0.12)",
    highlightColor: "rgba(255, 255, 255, 0.15)",
  },
  black: {
    cardBg: "#2C2C2E",
    textColor: "#8E8E93",
    accentColor: "#6C6C70",
    embossColor: "rgba(0, 0, 0, 0.3)",
    highlightColor: "rgba(255, 255, 255, 0.05)",
  },
  gold: {
    cardBg: "#B8986E",
    textColor: "#8B7355",
    accentColor: "#D4AF74",
    embossColor: "rgba(0, 0, 0, 0.15)",
    highlightColor: "rgba(255, 255, 255, 0.2)",
  },
  platinum: {
    cardBg: "#A8B2BC",
    textColor: "#6B7780",
    accentColor: "#C5CFD9",
    embossColor: "rgba(0, 0, 0, 0.2)",
    highlightColor: "rgba(255, 255, 255, 0.25)",
  },
};

const TIER_THRESHOLDS = {
  LIGHTBLUE: 0,
  BRONZE: 300,
  SILVER: 800,
  GOLD: 2000,
  BLACK: 3500,
};

function calculateTier(points: number): {
  tier: CardTier;
  displayName: string;
} {
  const currentPoints = points || 0;

  if (currentPoints >= TIER_THRESHOLDS.BLACK) {
    return { tier: "black", displayName: "BLACK" };
  } else if (currentPoints >= TIER_THRESHOLDS.GOLD) {
    return { tier: "gold", displayName: "GOLD" };
  } else if (currentPoints >= TIER_THRESHOLDS.SILVER) {
    return { tier: "platinum", displayName: "SILVER" };
  } else if (currentPoints >= TIER_THRESHOLDS.BRONZE) {
    return { tier: "bronze", displayName: "BRONZE" };
  } else {
    return { tier: "lightblue", displayName: "BEGINNER" };
  }
}

function calculateAgeFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const dobDate = new Date(dob);
  if (Number.isNaN(dobDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dobDate.getFullYear();
  const monthDiff = today.getMonth() - dobDate.getMonth();
  const dayDiff = today.getDate() - dobDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

type SocialKey =
  | "instagram"
  | "snapchat"
  | "linkedin"
  | "github"
  | "twitter"
  | "youtube";

const SOCIALS: { key: SocialKey; label: string; icon: string }[] = [
  { key: "instagram", label: "Instagram", icon: "instagram" },
  { key: "snapchat", label: "Snapchat", icon: "snapchat" },
  { key: "linkedin", label: "LinkedIn", icon: "linkedin-in" },
  { key: "github", label: "GitHub", icon: "github" },
  { key: "twitter", label: "Twitter / X", icon: "twitter" },
  { key: "youtube", label: "YouTube", icon: "youtube" },
];

function getSocialURL(platform: SocialKey, username: string): string {
  const urls: Record<SocialKey, string> = {
    instagram: `https://instagram.com/${username}`,
    snapchat: `https://snapchat.com/add/${username}`,
    linkedin: `https://linkedin.com/in/${username}`,
    github: `https://github.com/${username}`,
    twitter: `https://twitter.com/${username}`,
    youtube: `https://youtube.com/@${username}`,
  };
  return urls[platform] || "";
}

async function openSocialLink(
  platform: SocialKey,
  username: string,
): Promise<void> {
  const url = getSocialURL(platform, username);
  if (url) {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", `Unable to open ${platform}`);
    }
  }
}

interface ProfileCardProps {
  name: string;
  avatarUrl?: string;
  location?: string;
  dob?: string;
  bio?: string;
  points?: number;
  socials?: Partial<Record<SocialKey, string>>;
  onSocialsPress?: () => void;
  onAboutPress?: () => void;
  onConnectPress?: () => void;
  onMessagePress?: () => void;
  onCardPress?: () => void;
  showConnect?: boolean;
  statusText?: string;
  ageBadgeText?: string;
}

export function ProfileCard({
  name,
  avatarUrl,
  location,
  dob,
  bio,
  points = 0,
  socials,
  onSocialsPress,
  onAboutPress,
  onConnectPress,
  onMessagePress,
  onCardPress,
  showConnect = true,
  statusText = "Active",
  ageBadgeText,
}: ProfileCardProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [showSocialsModal, setShowSocialsModal] = useState(false);
  const { width } = Dimensions.get("window");
  const CARD_WIDTH = Math.min(width * 0.78, 340);

  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const age = calculateAgeFromDob(dob);
  const { tier: cardTier, displayName: displayTier } = calculateTier(points);
  const config = tierConfig[cardTier];

  if (!age && age !== 0) {
    console.log("Age calculation failed:", { dob, age });
  }

  const handleAboutPress = () => {
    setShowAbout(!showAbout);
    if (onAboutPress) onAboutPress();
  };

  const handleSocialsPress = () => {
    setShowSocialsModal(true);
    if (onSocialsPress) onSocialsPress();
  };

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: -20,
        useNativeDriver: true,
        friction: 10,
        tension: 120,
      }),
      Animated.spring(scale, {
        toValue: 1.03,
        useNativeDriver: true,
        friction: 10,
        tension: 120,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 10,
        tension: 120,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 10,
        tension: 120,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (onCardPress) {
      onCardPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayPressIn={0}
      delayPressOut={0}
    >
      <Animated.View
        style={[
          styles.cardWrap,
          {
            width: CARD_WIDTH,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              width: CARD_WIDTH,
              backgroundColor: config.cardBg,
              height: showAbout ? "auto" : 145,
            },
          ]}
        >
          <View
            style={[
              styles.embossedPattern,
              { backgroundColor: config.embossColor },
            ]}
          />

          <View style={styles.topSection}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: config.accentColor },
                    ]}
                  >
                    <FontAwesome6
                      name="user"
                      size={24}
                      color={config.textColor}
                    />
                  </View>
                )}
              </View>

              <View style={styles.nameSection}>
                <Text style={[styles.name, { color: config.textColor }]}>
                  {name || "Anonymous"}
                </Text>
                <View style={styles.statusRow}>
                  <View style={styles.activeDot} />
                  <Text
                    style={[styles.statusText, { color: config.textColor }]}
                  >
                    {statusText}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {showConnect && (
            <View style={styles.locationConnectRow}>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={onConnectPress}
              >
                <Text style={styles.connectText}>Connect</Text>
              </TouchableOpacity>
            </View>
          )}

          {onMessagePress && (
            <View style={styles.messageButtonContainer}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onMessagePress}
                style={[
                  styles.actionButton,
                  { backgroundColor: config.cardBg },
                ]}
              >
                <FontAwesome6
                  name="message"
                  size={12}
                  color={config.textColor}
                />
                <Text
                  style={[styles.actionButtonText, { color: config.textColor }]}
                >
                  Message
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSocialsPress}
              style={[styles.actionButton, { backgroundColor: config.cardBg }]}
            >
              <FontAwesome6 name="link" size={12} color={config.textColor} />
              <Text
                style={[styles.actionButtonText, { color: config.textColor }]}
              >
                Socials
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAboutPress}
              style={[styles.actionButton, { backgroundColor: config.cardBg }]}
            >
              <FontAwesome6
                name="circle-info"
                size={12}
                color={config.textColor}
              />
              <Text
                style={[styles.actionButtonText, { color: config.textColor }]}
              >
                About
              </Text>
            </TouchableOpacity>
          </View>

          {showAbout && (
            <View
              style={[
                styles.aboutSection,
                {
                  backgroundColor: config.cardBg,
                },
              ]}
            >
              <Text style={[styles.bioText, { color: config.textColor }]}>
                {bio || "No bio added yet"}
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>

      <Modal visible={showSocialsModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect With Me</Text>
              <TouchableOpacity onPress={() => setShowSocialsModal(false)}>
                <FontAwesome6 name="xmark" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.section}>Follow Me On</Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {SOCIALS.map((s) => {
                const value = socials?.[s.key];
                if (!value) return null;

                return (
                  <View key={s.key} style={styles.socialRow}>
                    <View style={styles.socialIconContainer}>
                      <FontAwesome6 name={s.icon} size={18} color="#666" />
                    </View>
                    <TouchableOpacity
                      style={styles.socialLink}
                      onPress={() => {
                        if (value) {
                          openSocialLink(s.key, value);
                        }
                      }}
                    >
                      <Text style={styles.socialValue}>{value}</Text>
                      <FontAwesome6
                        name="arrow-up-right-from-square"
                        size={14}
                        color="#007AFF"
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {!socials ||
                (Object.values(socials).every((v) => !v) && (
                  <Text style={styles.noSocials}>No socials added yet</Text>
                ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowSocialsModal(false)}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    marginBottom: 8,
    alignSelf: "center",
  },
  card: {
    borderRadius: 16,
    padding: 14,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  embossedPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    borderRadius: 20,
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  avatarContainer: {
    position: "relative",
    width: 48,
    height: 48,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  ageBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  ageBadgeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 3,
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
    backgroundColor: "#34C759",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  locationConnectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    boxShadow: "inset 0px 4px 10px 1px rgba(0, 0, 0, 0.15)",
  },
  locationText: {
    fontSize: 11,
    fontWeight: "500",
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1C1C1E",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  connectText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  messageButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginBottom: 0,
    marginTop: 0,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    boxShadow: "inset 0px 2px 10px 1px rgba(0, 0, 0, 0.15)",
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: "500",
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
  },
  tierLabel: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.5,
    opacity: 0.5,
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
  },
  aboutSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  bioText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  section: {
    fontSize: 16,
    fontWeight: "700",
    marginVertical: 12,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
  },
  socialIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center",
  },
  socialLink: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: 4,
  },
  socialValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  noSocials: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    paddingVertical: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  cancel: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
});
