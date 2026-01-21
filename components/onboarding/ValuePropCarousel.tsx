import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Image,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { LinearGradient } from "expo-linear-gradient";
import { Map, Users, MessageCircle, ChevronRight } from "lucide-react-native";

const { width } = Dimensions.get("window");

interface ValuePropCarouselProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    icon: Map,
    title: "Discover What's Happening Around You",
    description:
      "See live hotspots and activity on an interactive map in real-time.",
    image: require("assets/happylady.png"),
  },
  {
    id: 2,
    icon: Users,
    title: "Check In & Connect Instantly",
    description:
      "See who's at your favorite locations and make real connections.",
    image: require("assets/starbucks.png"),
  },
  {
    id: 3,
    icon: MessageCircle,
    title: "Network at Real-World Events",
    description:
      "Join conversations and connect with people at the places you visit.",
    image: require("assets/crowd.png"),
  },
];

export function ValuePropCarousel({ onComplete }: ValuePropCarouselProps) {
  const carouselRef = useRef<any>(null);
  const [index, setIndex] = useState(0);

  return (
    <LinearGradient
      colors={["#000000", "#111111", "#0a0a0a"]}
      style={styles.container}
    >
      <Carousel
        ref={carouselRef}
        width={width}
        height={width * 1.3}
        data={slides}
        pagingEnabled
        loop={false}
        onSnapToItem={setIndex}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={styles.slide}>
              {/* Image container */}
              <View style={styles.imageWrapper}>
                {/* Glow */}
                <LinearGradient
                  colors={["rgba(251,191,36,0.25)", "transparent"]}
                  style={styles.glow}
                />

                <View style={styles.imageContainer}>
                  <Image source={item.image} style={styles.image} />

                  {/* Overlay gradient */}
                  <LinearGradient
                    colors={["rgba(0,0,0,0.65)", "transparent"]}
                    style={styles.overlay}
                  />

                  {/* Icon box (exact position) */}
                  <View style={styles.iconBox}>
                    <Icon size={32} color="#fbbf24" strokeWidth={2} />
                  </View>
                </View>
              </View>

              {/* Text */}
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Pagination dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {/* Bottom button */}
      <Pressable style={styles.button} onPress={onComplete}>
        <Text style={styles.buttonText}>
          {index === slides.length - 1 ? "Continue" : "Skip"}
        </Text>
        <ChevronRight size={20} color="#000" />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  slide: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageWrapper: {
    width: width * 0.85,
    aspectRatio: 1,
    marginTop: 24,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    blurRadius: 30,
  },
  imageContainer: {
    flex: 1,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#262626",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  iconBox: {
    position: "absolute",
    bottom: 24,
    left: 24,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(251,191,36,0.2)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
  },
  textContainer: {
    paddingHorizontal: 24,
    paddingBottom: 96,
    alignItems: "center",
  },
  title: {
    color: "#f5f5f5",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    color: "#a3a3a3",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#525252",
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#fbbf24",
  },
  button: {
    position: "absolute",
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: "#fbbf24",
    paddingVertical: 16,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#000",
  },
});
