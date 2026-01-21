import * as React from "react";
import { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { Text } from "@gluestack-ui/themed";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { LinearGradient } from "expo-linear-gradient";
import type { Session } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";

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

interface Profile {
  full_name?: string;
  company?: string;
  location?: string;
  current_hotspot?: string;
  avatar_url?: string;
  points?: number;
  created_at?: string;
  dob?: string;
  bio?: string;
  socials?: Partial<Record<SocialKey, string>>;
}

// Add this helper function at the top of your file (outside the component)
function formatMemberSince(createdAt: string | undefined): string {
  if (!createdAt) return "N/A";

  const date = new Date(createdAt);
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();

  return `${month} ${year}`;
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

type ModalMode = "view" | "edit";
type CardTier = "lightblue" | "bronze" | "gold" | "platinum" | "black";

// Tier thresholds
const TIER_THRESHOLDS = {
  LIGHTBLUE: 0,
  BRONZE: 300,
  SILVER: 800,
  GOLD: 2000,
  BLACK: 3500,
};

// Function to calculate tier based on points
function calculateTier(points: number): {
  tier: CardTier;
  displayName: string;
  pointsToNext: number;
  nextTierName: string;
  tierProgress: number;
} {
  const currentPoints = points || 0;

  // Top tier (BLACK)
  if (currentPoints >= TIER_THRESHOLDS.BLACK) {
    return {
      tier: "black",
      displayName: "BLACK",
      pointsToNext: 0,
      nextTierName: "MAX",
      tierProgress: 100,
    };
  }

  // GOLD band
  else if (currentPoints >= TIER_THRESHOLDS.GOLD) {
    const pointsToNext = TIER_THRESHOLDS.BLACK - currentPoints;
    const tierProgress =
      ((currentPoints - TIER_THRESHOLDS.GOLD) /
        (TIER_THRESHOLDS.BLACK - TIER_THRESHOLDS.GOLD)) *
      100;
    return {
      tier: "gold",
      displayName: "GOLD",
      pointsToNext,
      nextTierName: "BLACK",
      tierProgress,
    };
  }

  // SILVER band — use platinum styles per request
  else if (currentPoints >= TIER_THRESHOLDS.SILVER) {
    const pointsToNext = TIER_THRESHOLDS.GOLD - currentPoints;
    const tierProgress =
      ((currentPoints - TIER_THRESHOLDS.SILVER) /
        (TIER_THRESHOLDS.GOLD - TIER_THRESHOLDS.SILVER)) *
      100;
    // Use platinum styles for SILVER
    return {
      tier: "platinum",
      displayName: "SILVER",
      pointsToNext,
      nextTierName: "GOLD",
      tierProgress,
    };
  }

  // BRONZE band
  else if (currentPoints >= TIER_THRESHOLDS.BRONZE) {
    const pointsToNext = TIER_THRESHOLDS.SILVER - currentPoints;
    const tierProgress =
      ((currentPoints - TIER_THRESHOLDS.BRONZE) /
        (TIER_THRESHOLDS.SILVER - TIER_THRESHOLDS.BRONZE)) *
      100;
    return {
      tier: "bronze",
      displayName: "BRONZE",
      pointsToNext,
      nextTierName: "SILVER",
      tierProgress,
    };
  }

  // LIGHTBLUE / default
  else {
    const pointsToNext = TIER_THRESHOLDS.BRONZE - currentPoints;
    const tierProgress =
      TIER_THRESHOLDS.BRONZE === 0
        ? 0
        : (currentPoints / TIER_THRESHOLDS.BRONZE) * 100;
    return {
      tier: "lightblue",
      displayName: "BEGINNER",
      pointsToNext,
      nextTierName: "BRONZE",
      tierProgress,
    };
  }
}

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

export default function UnifiedCardScreen({
  session,
}: {
  session: Session | null;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showPointsDetail, setShowPointsDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { width } = Dimensions.get("window");
  const CARD_WIDTH = Math.min(width - 40, 380);

  useEffect(() => {
    if (session?.user) loadProfile();
  }, [session]);

  async function loadProfile() {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", session?.user.id)
      .single();

    console.log(data);

    if (error) {
      Alert.alert("Failed to load profile");
      return;
    }
    setProfile(data);
  }

  async function pickAndUploadImage() {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        setUploading(false);
        return;
      }

      const imageUri = result.assets[0].uri;
      const fileName = `${session?.user.id}-${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        name: fileName,
        type: "image/jpeg",
      } as any);

      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, formData as any, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        Alert.alert("Upload failed", error.message);
        setUploading(false);
        return;
      }

      const publicUrl = supabase.storage.from("avatars").getPublicUrl(fileName)
        .data.publicUrl;

      setDraft({ ...draft!, avatar_url: publicUrl });
      setUploading(false);
    } catch (error) {
      Alert.alert("Error", "Failed to upload image");
      setUploading(false);
    }
  }

  async function saveProfile() {
    if (!draft || !session?.user) return;

    const { error } = await supabase
      .from("user_profiles")
      .update(draft)
      .eq("id", session.user.id);

    if (error) {
      Alert.alert("Save failed");
      return;
    }
    setProfile(draft);
    setModalMode(null);
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const isEdit = modalMode === "edit";
  const data = isEdit ? draft : profile;

  const age = calculateAgeFromDob(profile?.dob);

  const {
    tier: cardTier,
    displayName: displayTier,
    pointsToNext,
    nextTierName,
    tierProgress,
  } = calculateTier(profile?.points || 0);
  const config = tierConfig[cardTier];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* CARD */}
      <View style={[styles.cardWrap, { width: CARD_WIDTH }]}>
        <View
          style={[
            styles.card,
            {
              width: CARD_WIDTH,
              backgroundColor: config.cardBg,
              height: showAbout ? "auto" : 220,
            },
          ]}
        >
          {/* Embossed Pattern Background */}
          <View
            style={[
              styles.embossedPattern,
              { backgroundColor: config.embossColor },
            ]}
          />

          {/* Top Section */}
          <View style={styles.topSection}>
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {profile.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                  />
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
                {/* Age Badge */}
                <View
                  style={[styles.ageBadge, { backgroundColor: config.cardBg }]}
                >
                  <Text
                    style={[styles.ageBadgeText, { color: config.textColor }]}
                  >
                    {age ?? "--"}
                  </Text>
                </View>
              </View>

              {/* Name & Status */}
              <View style={styles.nameSection}>
                <Text style={[styles.name, { color: config.textColor }]}>
                  {profile.full_name || "Max Morgenstern"}
                </Text>
                <View style={styles.statusRow}>
                  <View style={styles.activeDot} />
                  <Text
                    style={[styles.statusText, { color: config.textColor }]}
                  >
                    Active
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Location & Connect Row */}
          <View style={styles.locationConnectRow}>
            <View
              style={[styles.locationChip, { backgroundColor: config.cardBg }]}
            >
              <FontAwesome6
                name="location-dot"
                size={14}
                color={config.textColor}
              />
              <Text style={[styles.locationText, { color: config.textColor }]}>
                {profile.current_hotspot ||
                  profile.location ||
                  "Not at a hotspot"}
              </Text>
            </View>

            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectText}>Connect</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setDraft(profile);
                setModalMode("view");
                setShowAbout(false);
              }}
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
              onPress={() => setShowAbout(!showAbout)}
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

          {/* Tier Badge - Bottom Left */}
          <View style={styles.tierBadge}>
            <Text style={[styles.tierText, { color: config.textColor }]}>
              {displayTier}
            </Text>
            <Text style={[styles.tierLabel, { color: config.textColor }]}>
              CARD
            </Text>
          </View>

          {/* Cliqcard Text - Bottom Right */}
          <View style={styles.brandingContainer}>
            <Text style={[styles.branding, { color: config.textColor }]}>
              CLIQCARD
            </Text>
          </View>

          {/* About Me Section (Expanded) */}
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
                {profile.bio || "No bio added yet"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* STATS CARD */}
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.statsCard, { width: CARD_WIDTH }]}
        onPress={() => setShowPointsDetail(!showPointsDetail)}
      >
        <View style={styles.statsTop}>
          <View style={styles.statLeft}>
            <Text style={styles.statValue}>
              {(profile.points || 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>TOTAL POINTS</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statRight}>
            <View style={styles.statRightContent}>
              <Text style={styles.statValueSecondary}>{pointsToNext}</Text>
              <View style={styles.statRightLabel}>
                <Text style={styles.statLabel}>UNTIL NEXT TIER</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Points Detail Dropdown */}
      {showPointsDetail && (
        <View style={[styles.pointsDetail, { width: CARD_WIDTH }]}>
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>PROGRESS TO {nextTierName}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: config.cardBg,
                    width: `${Math.max(
                      0,
                      Math.min(100, Math.round(tierProgress)),
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Points this month</Text>
              <Text style={styles.detailValue}>0</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lifetime points</Text>
              <Text style={styles.detailValue}>
                {(profile.points || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Member since</Text>
              <Text style={styles.detailValue}>
                {" "}
                {formatMemberSince(profile.created_at)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* MODAL */}
      <Modal visible={modalMode !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEdit ? "Edit Card" : "Connect With Me"}
              </Text>
              <TouchableOpacity onPress={() => setModalMode(null)}>
                <FontAwesome6 name="xmark" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {isEdit && (
              <>
                <Field
                  label="Full Name"
                  value={draft?.full_name}
                  onChange={(v) => setDraft({ ...draft!, full_name: v })}
                />

                <View style={styles.profilePictureSection}>
                  <Text style={styles.label}>Profile Picture</Text>
                  <TouchableOpacity
                    onPress={pickAndUploadImage}
                    disabled={uploading}
                    style={styles.avatarEditButton}
                  >
                    {draft?.avatar_url ? (
                      <Image
                        source={{ uri: draft.avatar_url }}
                        style={styles.avatarEditPreview}
                      />
                    ) : (
                      <View style={styles.avatarEditPlaceholder}>
                        <FontAwesome6 name="camera" size={32} color="#007AFF" />
                      </View>
                    )}
                    {uploading && (
                      <View style={styles.uploadingOverlay}>
                        <Text style={styles.uploadingText}>Uploading...</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.avatarHint}>
                    {uploading
                      ? "Uploading..."
                      : "Tap to change your profile picture"}
                  </Text>
                </View>
              </>
            )}

            <Text style={styles.section}>
              {isEdit ? "Edit Socials" : "Follow Me On"}
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {SOCIALS.map((s) => {
                const value = data?.socials?.[s.key];
                if (!isEdit && !value) return null;

                return (
                  <View key={s.key} style={styles.socialRow}>
                    <View style={styles.socialIconContainer}>
                      <FontAwesome6 name={s.icon} size={18} color="#666" />
                    </View>
                    {isEdit ? (
                      <TextInput
                        placeholder={`${s.label} username`}
                        value={value}
                        onChangeText={(v) =>
                          setDraft({
                            ...draft!,
                            socials: { ...draft!.socials, [s.key]: v },
                          })
                        }
                        style={styles.input}
                      />
                    ) : (
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
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setModalMode(null)}
                style={styles.cancel}
              >
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              {isEdit && (
                <TouchableOpacity
                  onPress={saveProfile}
                  activeOpacity={0.7}
                  style={styles.save}
                >
                  <Text style={{ color: "#FFF", fontWeight: "600" }}>Save</Text>
                </TouchableOpacity>
              )}
              {!isEdit && (
                <TouchableOpacity
                  onPress={() => {
                    setDraft(profile);
                    setModalMode("edit");
                  }}
                  activeOpacity={0.7}
                  style={styles.editButton}
                >
                  <FontAwesome6 name="pencil" size={14} color="#FFF" />
                  <Text style={{ color: "#FFF", fontWeight: "600" }}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={async () => {
          await supabase.auth.signOut();
        }}
        style={[styles.logoutButton, { width: CARD_WIDTH }]}
      >
        <FontAwesome6 name="right-from-bracket" size={16} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  contentContainer: { alignItems: "center", paddingTop: 40, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  tierSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    backgroundColor: "#1A1A1A",
    padding: 6,
    borderRadius: 12,
  },
  tierButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  tierButtonActive: { backgroundColor: "#333" },
  tierButtonText: { color: "#666", fontSize: 12, fontWeight: "700" },
  tierButtonTextActive: { color: "#FFF" },

  cardWrap: { marginBottom: 16 },
  card: {
    borderRadius: 20,
    padding: 20,
    position: "relative",
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
    justifyContent: "center",
    alignItems: "center",
  },

  ageBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  ageBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  nameSection: {
    flex: 1,
  },

  name: {
    fontSize: 19,
    fontWeight: "600",
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
  },

  chipIcon: {
    width: 48,
    height: 40,
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
  },

  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },

  chipSquare: {
    width: 16,
    height: 14,
    borderWidth: 1,
    borderRadius: 2,
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
    boxShadow: "inset 0px 4px 10px 1px rgba(0, 0, 0, 0.15)",
  },

  locationText: {
    fontSize: 13,
    fontWeight: "500",
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
    boxShadow: "inset 0px 2px 10px 1px rgba(0, 0, 0, 0.15)",
  },

  actionButtonText: {
    fontSize: 11,
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
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },

  bioText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },

  statsCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 24,
    marginBottom: 8,
  },

  statsTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  statLeft: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    fontSize: 32,
    fontWeight: "300",
    color: "#FFF",
    lineHeight: 32,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: 1.5,
  },

  divider: {
    width: 1,
    height: 48,
    backgroundColor: "#3A3A3C",
    marginHorizontal: 16,
  },

  statRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  statValueSecondary: {
    fontSize: 32,
    fontWeight: "300",
    color: "#8E8E93",
    lineHeight: 32,
    marginRight: 12,
  },

  statRightLabel: {
    alignItems: "flex-start",
  },

  pointsDetail: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },

  progressSection: {
    marginBottom: 20,
  },

  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  statRightContent: {
    alignItems: "center", // Center the content
    gap: 4, // Add spacing between elements
  },

  progressBar: {
    height: 8,
    backgroundColor: "#2C2C2E",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: 8,
    borderRadius: 4,
  },

  details: {
    gap: 8,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },

  detailLabel: {
    fontSize: 13,
    color: "#8E8E93",
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
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

  field: {
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    flex: 1,
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

  save: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: "#111",
    borderRadius: 12,
    alignItems: "center",
  },

  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: "#007AFF",
    borderRadius: 12,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1C1C1E",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },

  logoutText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },

  profilePictureSection: {
    marginBottom: 20,
  },

  avatarEditButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
    overflow: "hidden",
  },

  avatarEditPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  avatarEditPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8E8E8",
    justifyContent: "center",
    alignItems: "center",
  },

  uploadingOverlay: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  uploadingText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },

  avatarHint: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "500",
  },
});
