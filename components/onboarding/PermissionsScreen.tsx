import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { Navigation, MapPin, Shield } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";

interface PermissionsScreenProps {
  onAllow: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function PermissionsScreen({ onAllow }: PermissionsScreenProps) {
  const insets = useSafeAreaInsets();

  // Press scale animation for Allow button
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const onPressOut = () => {
    scale.value = withSequence(
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
  };

  const handleAllow = async () => {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const result = await Location.requestForegroundPermissionsAsync();
        status = result.status;
      }
      onAllow();
    } catch {
      onAllow();
    }
  };

  // Adjust icon size for smaller screens
  const iconSize = SCREEN_WIDTH < 400 ? 48 : 64;
  const iconWrapperPadding = SCREEN_WIDTH < 400 ? 24 : 32;

  return (
    <LinearGradient
      colors={["#000000", "#171717", "#0a0a0a"]}
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
        {/* Icon with amber glow */}
        <View
          style={[
            styles.iconContainer,
            { width: iconSize * 2, height: iconSize * 2 },
          ]}
        >
          <LinearGradient
            colors={["#262626", "#171717"]}
            style={[
              styles.iconWrapper,
              {
                padding: iconWrapperPadding,
                borderRadius: iconWrapperPadding * 0.75,
              },
            ]}
          >
            <Navigation size={iconSize} color="#fbbf24" strokeWidth={2} />
          </LinearGradient>
        </View>

        {/* Title and description */}
        <View style={[styles.textContainer, { maxWidth: SCREEN_WIDTH * 0.9 }]}>
          <Text
            style={[styles.title, { fontSize: SCREEN_WIDTH < 400 ? 24 : 30 }]}
          >
            Enable Location Access
          </Text>
          <Text
            style={[
              styles.description,
              { fontSize: SCREEN_WIDTH < 400 ? 14 : 16 },
            ]}
          >
            Location access is <Text style={styles.highlight}>essential</Text>{" "}
            for your Cliqcard to work. Without it, you won't be able to check
            in, discover nearby events, or connect with people around you.
          </Text>
        </View>

        <View
          style={[
            styles.cardsContainer,
            { marginTop: SCREEN_WIDTH < 400 ? 12 : 16 },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <MapPin size={20} color="#fbbf24" strokeWidth={2} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Check In Anywhere</Text>
              <Text style={styles.cardDescription}>
                Share your card at venues, events, and locations
              </Text>
            </View>
          </View>

          <View style={[styles.card, { marginTop: 12 }]}>
            <View style={styles.cardIcon}>
              <Shield size={20} color="#fbbf24" strokeWidth={2} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Full Functionality</Text>
              <Text style={styles.cardDescription}>
                Access all features and connect with nearby users
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* CTA buttons */}
      <View style={[styles.ctaContainer, { maxWidth: SCREEN_WIDTH * 0.9 }]}>
        <Animated.View style={[styles.allowButtonWrapper, animatedStyle]}>
          <LinearGradient
            colors={["#fbbf24", "#f59e0b"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.allowButton}
          >
            <TouchableOpacity
              onPress={handleAllow}
              activeOpacity={1}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              accessibilityRole="button"
            >
              <Text style={styles.allowButtonText}>Allow Location Access</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        <TouchableOpacity
          onPress={onAllow}
          activeOpacity={0.7}
          style={styles.skipButton}
          accessibilityRole="button"
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    maxWidth: 448,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapper: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#404040",
    backgroundColor: "#262626",
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({
      android: {
        elevation: 10,
      },
    }),
  },
  textContainer: {
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontWeight: "700",
    color: "#f5f5f5",
    textAlign: "center",
  },
  description: {
    color: "#a3a3a3",
    textAlign: "center",
    lineHeight: 24,
  },
  highlight: {
    color: "#fbbf24",
    fontWeight: "600",
  },
  cardsContainer: {
    width: "100%",
  },
  card: {
    backgroundColor: "rgba(23,23,23,0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#262626",
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardIcon: {
    backgroundColor: "rgba(251,191,36,0.1)",
    padding: 8,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    color: "#e5e5e5",
    fontWeight: "500",
    fontSize: 14,
  },
  cardDescription: {
    color: "#737373",
    fontSize: 12,
    marginTop: 4,
    flexShrink: 1,
  },
  ctaContainer: {
    maxWidth: 448,
    width: "100%",
    alignSelf: "center",
    gap: 12,
    paddingBottom: 12,
  },
  allowButtonWrapper: {
    borderRadius: 9999,
  },
  allowButton: {
    paddingVertical: 16,
    borderRadius: 9999,
    shadowColor: "#fbbf24",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    ...Platform.select({
      android: {
        elevation: 12,
      },
    }),
  },
  allowButtonText: {
    textAlign: "center",
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
  },
  skipButton: {
    paddingVertical: 16,
  },
  skipButtonText: {
    textAlign: "center",
    color: "#a3a3a3",
    fontWeight: "500",
    fontSize: 16,
  },
});
