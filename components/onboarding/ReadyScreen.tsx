import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useSharedValue,
  useDerivedValue,
} from "react-native-reanimated";
import { Check, ArrowRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ReadyScreenProps {
  onEnterMap: () => void;
}

export function ReadyScreen({ onEnterMap }: ReadyScreenProps) {
  const insets = useSafeAreaInsets();

  // Shared value for pulse animation progress
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  React.useEffect(() => {
    // Animate scale from 1 -> 1.2 -> 1 in a loop
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    // Animate opacity similarly from 0.5 -> 0.2 -> 0.5
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const checklistItems = [
    "Profile created",
    "Interests selected",
    "Ready to explore",
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Celebratory background glow */}
      <View style={styles.backgroundGlow} />

      <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
        {/* Success Icon */}
        <Animated.View
          entering={FadeIn.delay(200).duration(600)}
          style={styles.iconContainer}
        >
          {/* Pulsing background */}
       

          <View style={styles.iconWrapper}>
            <Check size={64} color="#000" strokeWidth={3} />
          </View>
        </Animated.View>

        {/* Message */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.messageContainer}
        >
          <Text style={styles.messageTitle}>You're All Set!</Text>
          <Text style={styles.messageDescription}>
            Welcome to Cliqcard. Your adventure starts now.
          </Text>
        </Animated.View>

        {/* Feature checklist */}
        <Animated.View
          entering={FadeIn.delay(600).duration(600)}
          style={styles.checklist}
        >
          {checklistItems.map((item, i) => (
            <Animated.View
              key={item}
              entering={FadeInDown.delay(700 + i * 100).duration(400)}
              style={styles.checklistItem}
            >
              <View style={styles.checklistIcon}>
                <Check size={16} color="#f59e0b" strokeWidth={2.5} />
              </View>
              <Text style={styles.checklistText}>{item}</Text>
            </Animated.View>
          ))}
        </Animated.View>
      </Animated.View>

      {/* Enter Map CTA */}
      <Animated.View
        entering={FadeInDown.delay(1000).duration(600)}
        style={styles.ctaContainer}
      >
        <TouchableOpacity
          onPress={onEnterMap}
          style={styles.ctaButton}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaButtonText}>Enter the Map</Text>
          <View style={{ marginLeft: 8 }}>
            <ArrowRight size={20} color="#000" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 48,
    position: "relative",
  },
  backgroundGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f59e0b",
    opacity: 0.12,
  },
  content: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 10,
  },
  iconContainer: {
    position: "relative",
  },
  iconPulse: {
    position: "absolute",
    width: 120,
    height: 120,
    backgroundColor: "#f59e0b",
    borderRadius: 60,
    opacity: 0.3,
  },
  iconWrapper: {
    position: "relative",
    backgroundColor: "#f59e0b",
    padding: 32,
    borderRadius: 9999,
  },
  messageContainer: {
    alignItems: "center",
    maxWidth: 384,
    marginTop: 16,
    marginBottom: 32,
  },
  messageTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#f5f5f0",
    textAlign: "center",
  },
  messageDescription: {
    color: "#a0a0a0",
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
  },
  checklist: {
    width: "100%",
    maxWidth: 384,
    marginBottom: 64,
    gap: 12,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(23, 23, 23, 0.3)",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 16,
    padding: 16,
  },
  checklistIcon: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    padding: 6,
    borderRadius: 9999,
    marginRight: 12,
  },
  checklistText: {
    color: "#d4d4d4",
    fontWeight: "500",
    fontSize: 16,
  },
  ctaContainer: {
    width: "100%",
    maxWidth: 400,
    position: "relative",
    zIndex: 10,
  },
  ctaButton: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#f59e0b",
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: "absolute",
    bottom: 32
  },
  ctaButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 18,
    
  },
});
