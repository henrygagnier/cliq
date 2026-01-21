import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Text } from "@gluestack-ui/themed";

interface LiveIndicatorProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function LiveIndicator({
  size = "md",
  showText = true,
}: LiveIndicatorProps) {
  const sizeMap: Record<string, number> = { sm: 8, md: 10, lg: 12 };
  const textSizeMap: Record<string, number> = { sm: 12, md: 14, lg: 16 };

  const dot = sizeMap[size] ?? sizeMap.md;
  const textSize = textSizeMap[size] ?? textSizeMap.md;

  const pulse = useRef(new Animated.Value(1)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(ripple, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(ripple, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, ripple]);

  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0.8, 0.15, 0],
  });

  return (
    <View style={styles.container}>
      <View style={{ width: dot, height: dot }}>
        <Animated.View
          style={[
            styles.ripple,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
              backgroundColor: "#DC2626",
            },
          ]}
        />
        <Animated.View
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              transform: [{ scale: pulse }],
              backgroundColor: "#DC2626",
            },
          ]}
        />
      </View>
      {showText && (
        <Text style={[styles.liveText, { fontSize: textSize }]}>Live</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  ripple: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  liveText: {
    color: "#DC2626",
    marginLeft: 8,
    fontWeight: "600",
  },
});
