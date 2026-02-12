import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from "react-native";

interface ReactionBarProps {
  onReaction: (emoji: string, x: number, y: number) => void;
}

const reactions = ["🔥", "😮", "🎉"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ReactionBar({ onReaction }: ReactionBarProps) {
  const handleReaction = (emoji: string) => {
    const x = Math.random() * (SCREEN_WIDTH - 100) + 50;
    const y = Math.random() * 50;
    onReaction(emoji, x, y);
  };

  return (
    <View style={styles.container}>
      {reactions.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          onPress={() => handleReaction(emoji)}
          style={styles.button}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 24,
  },
});
