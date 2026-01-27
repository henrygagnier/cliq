import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
} from "react-native";
import { Camera, ChevronRight } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

interface CreateProfileScreenProps {
  onContinue: (data: {
    name: string;
    photoUri: string | null;
    socials: Record<string, string>;
  }) => void;
}

const SOCIAL_PLATFORMS = [
  {
    id: "snapchat",
    name: "Snapchat",
    placeholder: "Your Snapchat username",
    color: "#FFFC00",
  },
  {
    id: "instagram",
    name: "Instagram",
    placeholder: "Your Instagram username",
    color: "#E4405F",
  },
  {
    id: "tiktok",
    name: "TikTok",
    placeholder: "Your TikTok username",
    color: "#000000",
  },
];

const ADDITIONAL_PLATFORMS = [
  {
    id: "twitter",
    name: "Twitter/X",
    placeholder: "Your X username",
    color: "#000000",
  },
  {
    id: "facebook",
    name: "Facebook",
    placeholder: "Your Facebook username",
    color: "#1877F2",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    placeholder: "Your LinkedIn username",
    color: "#0A66C2",
  },
  {
    id: "youtube",
    name: "YouTube",
    placeholder: "Your YouTube channel",
    color: "#FF0000",
  },
];

export function CreateProfileScreen({ onContinue }: CreateProfileScreenProps) {
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [socials, setSocials] = useState<
    Record<string, { value: string; enabled: boolean }>
  >({
    snapchat: { value: "", enabled: false },
    instagram: { value: "", enabled: false },
    tiktok: { value: "", enabled: false },
    twitter: { value: "", enabled: false },
    facebook: { value: "", enabled: false },
    linkedin: { value: "", enabled: false },
    youtube: { value: "", enabled: false },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const toggleSocial = (id: string) => {
    setSocials((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  const updateSocialValue = (id: string, value: string) => {
    setSocials((prev) => ({
      ...prev,
      [id]: { ...prev[id], value },
    }));
  };

  const handleContinue = () => {
    // Transform socials to simple format: only include enabled ones with values
    const enabledSocials: Record<string, string> = {};
    Object.entries(socials).forEach(([key, social]) => {
      if (social.enabled && social.value.trim()) {
        enabledSocials[key] = social.value.trim();
      }
    });
    
    onContinue({ name, photoUri, socials: enabledSocials });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Your Cliqcard</Text>
          <View style={styles.divider} />
        </View>

        {/* Profile Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <View style={styles.photoContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.photoCircle}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.profileImage}
                />
              ) : (
                <Camera width={48} height={48} color="#6B7280" />
              )}
              <View style={styles.cameraButton}>
                <Camera width={16} height={16} color="#000000" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Add your photo (just your face visible)
            </Text>
          </View>
        </View>

        {/* Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />
        </View>

        {/* Connect Your Socials Section */}
        <View style={styles.section}>
          <Text style={styles.mainTitle}>Connect your socials</Text>
          <Text style={styles.subtitle}>
            This will appear on your card for seamless connections. Pick which
            you want to display.
          </Text>

          <View style={styles.socialsContainer}>
            {SOCIAL_PLATFORMS.map((platform) => (
              <View key={platform.id} style={styles.socialCard}>
                <View style={styles.socialHeader}>
                  <View style={styles.socialLeft}>
                    <View
                      style={[
                        styles.socialIcon,
                        { backgroundColor: platform.color },
                      ]}
                    >
                      <Text style={styles.socialIconText}>
                        {platform.name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.socialName}>{platform.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleSocial(platform.id)}
                    style={[
                      styles.toggle,
                      socials[platform.id].enabled && styles.toggleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        socials[platform.id].enabled &&
                          styles.toggleThumbActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
                {socials[platform.id].enabled && (
                  <TextInput
                    value={socials[platform.id].value}
                    onChangeText={(value) =>
                      updateSocialValue(platform.id, value)
                    }
                    placeholder={platform.placeholder}
                    placeholderTextColor="#6B7280"
                    style={styles.socialInput}
                  />
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setShowMore(!showMore)}
            style={styles.showMoreButton}
          >
            <Text style={styles.showMoreText}>
              {showMore ? "- Show less" : "+ Add more"}
            </Text>
          </TouchableOpacity>

          {/* Additional Platforms */}
          {showMore && (
            <View style={styles.socialsContainer}>
              {ADDITIONAL_PLATFORMS.map((platform) => (
                <View key={platform.id} style={styles.socialCard}>
                  <View style={styles.socialHeader}>
                    <View style={styles.socialLeft}>
                      <View
                        style={[
                          styles.socialIcon,
                          { backgroundColor: platform.color },
                        ]}
                      >
                        <Text
                          style={[
                            styles.socialIconText,
                            {
                              color:
                                platform.color === "#000000" ? "#FFF" : "#FFF",
                            },
                          ]}
                        >
                          {platform.name.charAt(0)}
                        </Text>
                      </View>
                      <Text style={styles.socialName}>{platform.name}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleSocial(platform.id)}
                      style={[
                        styles.toggle,
                        socials[platform.id].enabled && styles.toggleActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          socials[platform.id].enabled &&
                            styles.toggleThumbActive,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                  {socials[platform.id].enabled && (
                    <TextInput
                      value={socials[platform.id].value}
                      onChangeText={(value) =>
                        updateSocialValue(platform.id, value)
                      }
                      placeholder={platform.placeholder}
                      placeholderTextColor="#6B7280"
                      style={styles.socialInput}
                    />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          style={styles.continueButton}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <ChevronRight width={20} height={20} color="#000000" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  divider: {
    width: 48,
    height: 4,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    marginTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: "#D1D5DB",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  mainTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  photoContainer: {
    alignItems: "center",
  },
  photoCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#1F2937",
    borderWidth: 2,
    borderColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#D4AF37",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  photoHint: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: "#FFFFFF",
    fontSize: 16,
  },
  socialsContainer: {
    gap: 12,
  },
  socialCard: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 16,
    padding: 16,
  },
  socialHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  socialLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  socialIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  socialIconText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  socialName: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#374151",
    justifyContent: "center",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#D4AF37",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  socialInput: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 12,
  },
  showMoreButton: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: "center",
  },
  showMoreText: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "600",
  },
  continueButton: {
    backgroundColor: "#D4AF37",
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
});
