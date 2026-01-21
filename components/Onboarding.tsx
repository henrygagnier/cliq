import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as FileSystem from "expo-file-system";
import { supabase } from "../lib/supabase";
import { WelcomeScreen } from "./onboarding/WelcomeScreen";
import { ValuePropCarousel } from "./onboarding/ValuePropCarousel";
import { PermissionsScreen } from "./onboarding/PermissionsScreen";
import { CreateProfileScreen } from "./onboarding/CreateProfileScreen";
import { DateOfBirthScreen } from "./onboarding/DateOfBirthScreen";
import { InterestSelectionScreen } from "./onboarding/InterestSelectionScreen";
import { MapPreviewScreen } from "./onboarding/MapPreviewScreen";
import { ReadyScreen } from "./onboarding/ReadyScreen";

type OnboardingStep =
  | "welcome"
  | "value-prop"
  | "permissions"
  | "profile"
  | "dob"
  | "interests"
  | "map-preview"
  | "ready"
  | "complete";

interface OnboardingProps {
  userId: string;
  email: string;
  onComplete: () => void;
}

interface OnboardingData {
  name?: string;
  photoUri?: string | null;
  socials?: Record<string, string>;
  bio?: string;
  dob?: string;
  interests?: string[];
}

export default function Onboarding({
  userId,
  email,
  onComplete,
}: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      let avatarUrl: string | null = null;

      // If there's a photo, upload it to Supabase Storage
      if (onboardingData.photoUri) {
        try {
          const fileName = `${userId}-${Date.now()}.jpg`;
          const fileInfo = await FileSystem.getInfoAsync(
            onboardingData.photoUri,
          );

          if (!fileInfo.exists) {
            throw new Error("Photo file does not exist");
          }

          const base64 = await FileSystem.readAsStringAsync(
            onboardingData.photoUri,
            {
              encoding: FileSystem.EncodingType.Base64,
            },
          );

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("avatars")
              .upload(fileName, Buffer.from(base64, "base64"), {
                contentType: "image/jpeg",
              });

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(fileName);

          avatarUrl = publicUrl;
        } catch (photoErr) {
          console.error("Error uploading photo:", photoErr);
          // Continue without photo if upload fails
        }
      }

      // Save all onboarding data to Supabase
      const { error: dbError } = await supabase.from("user_profiles").upsert({
        id: userId,
        email,
        full_name: onboardingData.name || "",
        avatar_url: avatarUrl,
        socials: onboardingData.socials || {},
        bio: onboardingData.bio || "",
        dob: onboardingData.dob || null,
        interests: onboardingData.interests || [],
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      setCurrentStep("complete");
      // Call onComplete immediately without showing a screen
      onComplete();
    } catch (err) {
      console.error("Error saving onboarding data:", err);
      // Still complete onboarding even if there's an error
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === "complete") {
    return null;
  }

  return (
    <View style={styles.container}>
      {currentStep === "welcome" && (
        <WelcomeScreen onGetStarted={() => setCurrentStep("value-prop")} />
      )}

      {currentStep === "value-prop" && (
        <ValuePropCarousel onComplete={() => setCurrentStep("permissions")} />
      )}

      {currentStep === "permissions" && (
        <PermissionsScreen onAllow={() => setCurrentStep("profile")} />
      )}

      {currentStep === "profile" && (
        <CreateProfileScreen
          onContinue={(data?: Partial<OnboardingData>) => {
            if (data) {
              setOnboardingData((prev) => ({ ...prev, ...data }));
            }
            setCurrentStep("dob");
          }}
        />
      )}

      {currentStep === "dob" && (
        <DateOfBirthScreen
          onContinue={(dob) => {
            setOnboardingData((prev) => ({ ...prev, dob }));
            setCurrentStep("interests");
          }}
        />
      )}

      {currentStep === "interests" && (
        <InterestSelectionScreen
          onContinue={(interests: string[]) => {
            setOnboardingData((prev) => ({ ...prev, interests }));
            setCurrentStep("map-preview");
          }}
        />
      )}

      {currentStep === "map-preview" && (
        <MapPreviewScreen onContinue={() => setCurrentStep("ready")} />
      )}

      {currentStep === "ready" && <ReadyScreen onEnterMap={handleComplete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  completeContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  completeContent: {
    alignItems: "center",
    gap: 16,
  },
  completeIcon: {
    width: 64,
    height: 64,
    backgroundColor: "#f59e0b",
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  completeEmoji: {
    fontSize: 24,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f5f5f0",
  },
  completeDescription: {
    color: "#a0a0a0",
  },
});
