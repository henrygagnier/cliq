import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  LinearTransition,
  Layout,
} from "react-native-reanimated";
import {
  Camera,
  Upload,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Youtube,
  Twitch,
  Plus,
  ArrowRight,
  Check,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");

const SocialImageIcon = ({ source }: { source: any }) => (
  <Image
    source={source}
    style={{ width: 36, height: 36 }}
    resizeMode="contain"
  />
);

const SocialIcons = {
  snapchat: require("assets/socials/snapchat.png"),
  instagram: require("assets/socials/instagram.png"),
  tiktok: require("assets/socials/tiktok.png"),
};

interface CreateProfileScreenProps {
  onContinue: (data?: {
    name?: string;
    photoUri?: string | null;
    socials?: Record<string, string>;
    bio?: string;
  }) => void;
}

interface Social {
  id: string;
  name: string;
  placeholder: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

const mainSocials: Social[] = [
  {
    id: "snapchat",
    name: "Snapchat",
    placeholder: "username",
    icon: () => <SocialImageIcon source={SocialIcons.snapchat} />,
    color: "#d4a574",
    bgColor: "#d4a574",
  },
  {
    id: "instagram",
    name: "Instagram",
    placeholder: "username",
    icon: () => <SocialImageIcon source={SocialIcons.instagram} />,
    color: "#a8556b",
    bgColor: "#a8556b",
  },
  {
    id: "tiktok",
    name: "TikTok",
    placeholder: "@username",
    icon: () => <SocialImageIcon source={SocialIcons.tiktok} />,
    color: "#000000",
    bgColor: "#000000",
  },
];

const additionalSocials: Social[] = [
  {
    id: "twitter",
    name: "Twitter/X",
    placeholder: "@handle",
    icon: () => <SocialImageIcon source={SocialIcons.twitter} />,
    color: "#1DA1F2",
    bgColor: "#1DA1F2",
  },
  {
    id: "venmo",
    name: "Venmo",
    placeholder: "@username",
    icon: () => <SocialImageIcon source={SocialIcons.venmo} />,
    color: "#3D95CE",
    bgColor: "#3D95CE",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    placeholder: "profile url",
    icon: () => <SocialImageIcon source={SocialIcons.linkedin} />,
    color: "#0A66C2",
    bgColor: "#0A66C2",
  },
  {
    id: "youtube",
    name: "YouTube",
    placeholder: "@channel",
    icon: () => <SocialImageIcon source={SocialIcons.youtube} />,
    color: "#FF0000",
    bgColor: "#FF0000",
  },
];

export function CreateProfileScreen({ onContinue }: CreateProfileScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [showAdditional, setShowAdditional] = useState(false);
  const [bio, setBio] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const insets = useSafeAreaInsets();

  const hasAtLeastOneSocial = Object.values(socials).some(
    (value) => value.trim() !== "",
  );

  const handleSocialChange = (id: string, value: string) => {
    setSocials((prev) => ({ ...prev, [id]: value }));
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const nextStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setIsAnimating(false);
    }, 600);
  };

  const handleStepComplete = () => {
    if (currentStep === 0) {
      nextStep();
    } else if (currentStep === 1) {
      if (name.trim()) nextStep();
    } else if (currentStep === 2) {
      if (hasAtLeastOneSocial) nextStep();
    } else if (currentStep === 3) {
      onContinue({
        name,
        photoUri,
        socials,
        bio,
      });
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return true;
    if (currentStep === 1) return name.trim() !== "";
    if (currentStep === 2) return hasAtLeastOneSocial;
    if (currentStep === 3) return true;
    return false;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Animated.View
            key="step0"
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            layout={LinearTransition}
            style={styles.stepContent}
          >
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <Text style={styles.stepTitle}>Add Your Photo</Text>
              <Text style={styles.stepSubtitle}>
                Let people see the real you!
              </Text>
            </Animated.View>

            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.photoButton}
              activeOpacity={0.8}
            >
              <View style={styles.photoContainer}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImage} />
                ) : name ? (
                  <View style={styles.photoInitials}>
                    <Text style={styles.photoInitialsText}>
                      {name.charAt(0).toUpperCase() || "😎"}
                    </Text>
                  </View>
                ) : (
                  <Camera size={64} color="#737373" />
                )}
              </View>
              <View style={styles.uploadIcon}>
                <Upload size={20} color="#000" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Tap to add your pic (optional)</Text>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View
            key="step1"
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            layout={LinearTransition}
            style={styles.stepContent}
          >
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <Text style={styles.stepTitle}>What's Your Name?</Text>
              <Text style={styles.stepSubtitle}>
                This is how people will find you
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(400)}>
              <TextInput
                autoComplete="off"
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#666"
                autoFocus
                style={styles.nameInput}
              />
            </Animated.View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View
            key="step2"
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            layout={LinearTransition}
            style={styles.socialsStep}
          >
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <Text style={styles.stepTitle}>Connect Your Socials</Text>
              <Text style={styles.stepSubtitle}>
                Add at least one to continue
              </Text>
            </Animated.View>

            <ScrollView
              style={styles.socialsScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.socialsContent}
            >
              {mainSocials.map((social, index) => (
                <Animated.View
                  key={social.id}
                  entering={FadeInDown.delay(600 + index * 100).duration(400)}
                  style={[
                    styles.socialInputWrapper,
                    index > 0 && styles.socialInputSpacing,
                  ]}
                >
                  <View
                    style={[
                      styles.socialIconMain,
                      { backgroundColor: social.bgColor },
                    ]}
                  >
                    <social.icon />
                  </View>
                  <TextInput
                    autoComplete="off"
                    textContentType="none"
                    value={socials[social.id] || ""}
                    onChangeText={(text) => handleSocialChange(social.id, text)}
                    placeholder={`${social.name} ${social.placeholder}`}
                    placeholderTextColor="#666"
                    style={styles.socialInput}
                  />
                </Animated.View>
              ))}

              <Animated.View entering={FadeInDown.delay(900).duration(400)}>
                <TouchableOpacity
                  onPress={() => setShowAdditional(!showAdditional)}
                  style={styles.addMoreButton}
                  activeOpacity={0.7}
                >
                  <Plus
                    size={16}
                    color="#666"
                    style={{
                      transform: [
                        { rotate: showAdditional ? "45deg" : "0deg" },
                      ],
                    }}
                  />
                  <Text style={styles.addMoreText}>
                    {showAdditional ? "Show Less" : "Add More Socials"}
                  </Text>
                </TouchableOpacity>

                {showAdditional && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(300)}
                    style={styles.additionalSocials}
                  >
                    {additionalSocials.map((social, index) => (
                      <Animated.View
                        key={social.id}
                        entering={FadeInDown.delay(index * 50).duration(300)}
                        style={[
                          styles.socialInputWrapper,
                          styles.socialInputSpacing,
                        ]}
                      >
                        <View
                          style={[
                            styles.socialIconSmall,
                            { backgroundColor: social.bgColor },
                          ]}
                        >
                          <social.icon />
                        </View>
                        <TextInput
                          value={socials[social.id] || ""}
                          onChangeText={(text) =>
                            handleSocialChange(social.id, text)
                          }
                          placeholder={`${social.name} ${social.placeholder}`}
                          placeholderTextColor="#666"
                          style={styles.socialInputSmall}
                        />
                      </Animated.View>
                    ))}
                  </Animated.View>
                )}
              </Animated.View>
            </ScrollView>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View
            key="step3"
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            layout={LinearTransition}
            style={styles.stepContent}
          >
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <Text style={styles.stepTitle}>Personalize Your Card</Text>
              <Text style={styles.stepSubtitle}>Add fun facts (optional)</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(400)}>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Coffee addict ☕ | Dog lover 🐕"
                placeholderTextColor="#666"
                numberOfLines={1}
                maxLength={150}
                autoFocus
                style={styles.bioInput}
              />
              <Text style={styles.bioCounter}>{bio.length}/150</Text>
            </Animated.View>
          </Animated.View>
        );
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(600)}
      style={[styles.content, { marginBottom: insets.bottom }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Your Cliqcard!🎉</Text>
        <Text style={styles.headerSubtitle}>Step {currentStep + 1} of 4</Text>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          {[0, 1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.progressSegment,
                step <= currentStep
                  ? styles.progressSegmentActive
                  : styles.progressSegmentInactive,
                step > 0 && styles.progressSegmentMargin,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Card Container */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[styles.card, { transform: [{ perspective: 1000 }] }]}
          layout={Layout.springify()}
        >
          {renderStep()}
        </Animated.View>
      </View>

      {/* Action Button */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(400)}
        style={styles.actionButtonContainer}
      >
        <TouchableOpacity
          onPress={handleStepComplete}
          disabled={!canProceed() || isAnimating}
          style={[
            styles.actionButton,
            canProceed() && !isAnimating
              ? styles.actionButtonEnabled
              : styles.actionButtonDisabled,
          ]}
          activeOpacity={0.9}
        >
          {currentStep === 3 ? (
            <>
              <Check size={20} color="#000" />
              <Text style={styles.actionButtonText}>Complete Profile</Text>
            </>
          ) : (
            <>
              <Text style={styles.actionButtonText}>Next</Text>
              <ArrowRight size={20} color="#000" />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f3f4f6",
    letterSpacing: 0.25,
  },
  headerSubtitle: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 8,
    fontWeight: "500",
  },
  progressBar: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 9999,
  },
  progressSegmentMargin: {
    marginLeft: 6,
  },
  progressSegmentActive: {
    backgroundColor: "#f59e0b",
  },
  progressSegmentInactive: {
    backgroundColor: "#1f2937",
  },
  cardContainer: {
    flex: 1,
    position: "relative",
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: "rgba(38, 38, 38, 0.8)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#404040",
    padding: 32,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  stepContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f9fafb",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    color: "#9ca3af",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
  photoButton: {
    position: "relative",
    marginTop: 32,
    marginBottom: 16,
  },
  photoContainer: {
    width: 160,
    height: 160,
    borderRadius: 9999,
    backgroundColor: "#262626",
    borderWidth: 2,
    borderColor: "#525252",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoInitials: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  photoInitialsText: {
    fontSize: 64,
    fontWeight: "700",
    color: "#000",
  },
  uploadIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#f59e0b",
    padding: 12,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "#111",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  photoHint: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  nameInput: {
    width: width - 112,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "rgba(38, 38, 38, 0.5)",
    borderWidth: 2,
    borderColor: "#404040",
    borderRadius: 16,
    color: "#f9fafb",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "500",
    marginTop: 32,
  },
  socialsStep: {
    flex: 1,
  },
  socialsScroll: {
    flex: 1,
  },
  socialsContent: {
    paddingTop: 24,
    paddingBottom: 8,
  },
  socialInputWrapper: {
    position: "relative",
    marginBottom: 16,
    overflow: "hidden",
  },
  socialInputSpacing: {
    marginTop: 16,
  },
  socialIconMain: {
    position: "absolute",
    left: 16,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  socialIconSmall: {
    position: "absolute",
    left: 12,
    top: 13,
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  socialInput: {
    paddingLeft: 64,
    paddingRight: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(38, 38, 38, 0.5)",
    borderWidth: 1,
    borderColor: "#404040",
    borderRadius: 12,
    color: "#f9fafb",
    fontSize: 16,
  },
  socialInputSmall: {
    paddingLeft: 56,
    paddingVertical: 12,
    fontSize: 14,
  },
  addMoreButton: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(38, 38, 38, 0.3)",
    borderWidth: 1,
    borderColor: "#404040",
    borderStyle: "dashed",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addMoreText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  additionalSocials: {
    marginTop: 12,
  },
  bioInput: {
    width: width - 112,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "rgba(38, 38, 38, 0.5)",
    borderWidth: 2,
    borderColor: "#404040",
    borderRadius: 16,
    color: "#f9fafb",
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 120,
    marginTop: 32,
    fontWeight: "500",
  },
  bioCounter: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 8,
    textAlign: "right",
    fontWeight: "500",
  },
  actionButtonContainer: {
    marginTop: 76,
  },
  actionButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    position: "absolute",
    bottom: 32,
  },
  actionButtonEnabled: {
    backgroundColor: "#f59e0b",
    elevation: 8,
  },
  actionButtonDisabled: {
    backgroundColor: "#374151",
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  // Custom Icon Styles
  snapchatIcon: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  snapchatPath: {
    width: 14,
    height: 14,
    backgroundColor: "white",
    borderRadius: 1,
  },
  tiktokIcon: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tiktokPath: {
    width: 8,
    height: 8,
    position: "absolute",
    borderRadius: 1,
  },
  tiktokPath2: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
  tiktokPath3: {
    transform: [{ translateX: -3 }, { translateY: -3 }],
  },
  venmoIcon: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  onlyfansIcon: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  spotifyIcon: {
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  spotifyPath: {
    width: 6,
    height: 6,
    backgroundColor: "white",
    borderRadius: 9999,
    position: "absolute",
    left: 5,
    top: 5,
  },
  spotifyPath2: {
    width: 10,
    height: 10,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 9999,
    position: "absolute",
    left: 3,
    top: 3,
  },
  spotifyPath3: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 9999,
    position: "absolute",
    left: 1,
    top: 1,
  },
  discordIcon: {
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  discordPath: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 9999,
  },
  discordPath2: {
    width: 4,
    height: 4,
    backgroundColor: "white",
    borderRadius: 9999,
    position: "absolute",
    bottom: 1,
    right: 1,
  },
});
