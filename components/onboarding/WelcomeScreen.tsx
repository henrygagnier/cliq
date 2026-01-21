import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();

  // Responsive sizes with breakpoint at 400
  const logoSize = Math.min(400, SCREEN_WIDTH * 0.9); // max 400 or 90% screen width
  const taglineMaxWidth = Math.min(320, SCREEN_WIDTH * 0.85);
  const buttonPaddingHorizontal = SCREEN_WIDTH < 400 ? 32 : 48;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Animated.View entering={FadeInDown.duration(800)} style={styles.content}>
        {/* Logo */}
        <Animated.View
          entering={ZoomIn.duration(600).delay(200)}
          style={styles.logoContainer}
        >
          <Image
            source={require("assets/cliqcard.png")}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text
          entering={FadeIn.duration(600).delay(600)}
          style={[styles.tagline, { maxWidth: taglineMaxWidth }]}
        >
          Connect, Chat, Discover... Instantly!
        </Animated.Text>

        {/* Button */}
        <Animated.View entering={FadeInDown.duration(600).delay(800)}>
          <TouchableOpacity onPress={onGetStarted} activeOpacity={0.85}>
            <LinearGradient
              colors={["#fbbf24", "#d97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.button,
                { paddingHorizontal: buttonPaddingHorizontal },
              ]}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
    gap: 32,
  },
  logoContainer: {
    alignItems: "center",
  },
  tagline: {
    color: "#d4d4d4",
    fontSize: 20,
    textAlign: "center",
    fontFamily: "Satisfy",
  },
  button: {
    marginTop: 48,
    paddingVertical: 16,
    borderRadius: 9999,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
