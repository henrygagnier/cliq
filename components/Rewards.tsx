import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Text } from "@gluestack-ui/themed";
import type { Session } from "@supabase/supabase-js";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";

// Use the native lucide package that's already in the project
import {
  Coffee,
  Wine,
  Utensils,
  Dumbbell,
  GraduationCap,
  ShoppingBag,
  Music,
  Users,
} from "lucide-react-native";
import { LiveIndicator } from "./LiveIndicator";

interface HotspotsMainPageProps {
  onCategoryClick: (category: string) => void;
  onHotspotClick: (hotspotId: string | number) => void;
}

export function TrendingHotspotCard({
  name,
  userCount,
  imageUrl,
  category,
  isTrending = false,
  onClick,
}: {
  name: string;
  userCount: number;
  imageUrl?: string | null;
  category?: string;
  isTrending?: boolean;
  onClick: () => void;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const animatedStyle = { transform: [{ scale }] };
  const glowStyle = isTrending
    ? {
        borderColor: "#D4AF37",
        shadowColor: "#D4AF37",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 8,
      }
    : {};

  return (
    <Animated.View
      style={[styles.trendingCardAnimated, animatedStyle, glowStyle]}
    >
      <TouchableOpacity
        onPress={onClick}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
      >
        <View
          style={[
            styles.trendingInner,
            isTrending ? styles.trendingInnerTrending : null,
          ]}
        >
          <View style={styles.trendingContent}>
            <Text style={styles.title}>{name}</Text>
            <View style={styles.trendingFooter}>
              <LiveIndicator size="sm" showText={true} />
              <View style={styles.usersCountRow}>
                <Users width={14} height={14} color="#D4AF37" />
                <Text style={styles.usersCountText}>{userCount}</Text>
              </View>
            </View>

            {/* Category pill at the bottom */}
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{category || "Other"}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function CategoryCard({
  name,
  Icon,
  hasLiveHotspots,
  onClick,
}: {
  name: string;
  Icon: any;
  hasLiveHotspots: boolean;
  onClick: () => void;
}) {
  const pulse = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (hasLiveHotspots) {
      const loop = Animated.loop(
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
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [hasLiveHotspots, pulse]);

  return (
    <TouchableOpacity
      onPress={onClick}
      style={styles.categoryCard}
      activeOpacity={0.9}
    >
      <View style={styles.categoryInner}>
        <View style={styles.categoryIconContainer}>
          <Icon width={24} height={24} color="#D4AF37" />
        </View>
        <Text style={styles.categoryName}>{name}</Text>
      </View>

      {hasLiveHotspots && (
        <Animated.View
          style={[styles.liveDot, { transform: [{ scale: pulse as any }] }]}
        />
      )}
    </TouchableOpacity>
  );
}

export function HotspotsMainPage({
  onCategoryClick,
  onHotspotClick,
}: HotspotsMainPageProps) {
  // Dynamic trending hotspots - fetch real hotspots within 12.4mi of the user and enrich with active user counts
  const [trendingHotspots, setTrendingHotspots] = useState<any[]>([]);
  const [loadingHotspots, setLoadingHotspots] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const toRad = (value: number) => (value * Math.PI) / 180;

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 3959; // Earth's radius in mi
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyHotspots = async () => {
    setLoadingHotspots(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted");
        setLoadingHotspots(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      setUserLocation({ latitude: lat, longitude: lon });

      // Fetch hotspots and filter to 12.4mi radius
      const { data: hotspots, error } = await supabase
        .from("hotspots")
        .select("*")
        .limit(500);
      if (error) throw error;
      if (!hotspots || hotspots.length === 0) {
        setTrendingHotspots([]);
        setLoadingHotspots(false);
        return;
      }

      const hotspotsWithDistance = hotspots
        .map((h: any) => ({
          ...h,
          distanceMi: calculateDistance(lat, lon, h.latitude, h.longitude),
        }))
        .filter((h: any) => h.distanceMi <= 6.2);

      const hotspotIds = hotspotsWithDistance.map((h: any) => h.id);
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: activeUsersData } = await supabase
        .from("hotspot_active_users")
        .select("hotspot_id,user_id")
        .in("hotspot_id", hotspotIds)
        .gte("last_seen", thirtyMinAgo);

      const counts: Record<string, number> = {};
      (activeUsersData || []).forEach((u: any) => {
        counts[u.hotspot_id] = (counts[u.hotspot_id] || 0) + 1;
      });

      const withCounts = hotspotsWithDistance.map((h: any) => ({
        id: h.id,
        name: h.name,
        userCount: counts[h.id] || 0,
        imageUrl: h.image_url || null,
        category: h.type || "Other",
        isTrending: (counts[h.id] || 0) > 0,
        distanceMi: h.distanceMi,
      }));

      withCounts.sort((a: any, b: any) => {
        if (b.userCount === a.userCount) return a.distanceMi - b.distanceMi;
        return b.userCount - a.userCount;
      });

      setTrendingHotspots(withCounts.slice(0, 8));
    } catch (err) {
      console.error("Error fetching hotspots:", err);
    } finally {
      setLoadingHotspots(false);
    }
  };

  useEffect(() => {
    fetchNearbyHotspots();
  }, []);

  const categories = [
    { name: "Cafés", icon: Coffee, hasLive: true },
    { name: "Bars & Nightlife", icon: Wine, hasLive: true },
    { name: "Restaurants", icon: Utensils, hasLive: true },
    { name: "Gyms", icon: Dumbbell, hasLive: false },
    { name: "Campus", icon: GraduationCap, hasLive: true },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.containerContent}
      refreshControl={
        <RefreshControl
          refreshing={loadingHotspots}
          onRefresh={fetchNearbyHotspots}
          tintColor="#D4AF37"
          colors={["#D4AF37"]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hotspots</Text>
      </View>

      {/* Trending Section */}
      <View style={styles.trendingSection}>
        <View style={styles.trendingHeader}>
          <Text style={styles.trendingHeaderText}>Trending Right Now</Text>
        </View>
        {loadingHotspots ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator size="small" color="#D4AF37" />
          </View>
        ) : trendingHotspots.length === 0 ? (
          <Text style={{ color: "#9CA3AF", marginLeft: 24 }}>
            No nearby hotspots within 12.4mi
          </Text>
        ) : (
          <ScrollView
            horizontal
            contentContainerStyle={styles.trendingScrollContent}
            showsHorizontalScrollIndicator={false}
          >
            {trendingHotspots.map((hotspot) => (
              <TrendingHotspotCard
                key={hotspot.id}
                name={hotspot.name}
                userCount={hotspot.userCount}
                imageUrl={hotspot.imageUrl}
                category={hotspot.category}
                isTrending={hotspot.isTrending}
                onClick={() => onHotspotClick(hotspot.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Categories Grid */}
      <View style={styles.categoriesContainer}>
        <Text style={styles.categoriesTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <CategoryCard
              key={category.name}
              name={category.name}
              Icon={category.icon}
              hasLiveHotspots={category.hasLive}
              onClick={() => onCategoryClick(category.name)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0A0A0A",
  },
  containerContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  trendingSection: {
    marginBottom: 24,
  },
  trendingHeader: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  trendingHeaderText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  trendingScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: "row",
  },
  trendingCard: {
    width: 256,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  trendingImage: {
    height: 140,
    width: "100%",
  },
  cardContent: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
  },
  trendingBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#FACC15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },
  categoriesContainer: {
    paddingHorizontal: 24,
  },
  categoriesTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    // gap is not supported in RN; use margins on items
  },
  trendingCardAnimated: {
    marginRight: 12,
    width: 256,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  trendingInner: {
    position: "relative",
  },
  trendingInnerTrending: {
    borderColor: "#D4AF37",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  trendingContent: {
    padding: 12,
  },
  trendingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  usersCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  usersCountText: {
    color: "#D4AF37",
    marginLeft: 6,
    fontWeight: "700",
  },
  liveIndicatorPlaceholder: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#34D399",
  },
  categoryPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#2C2C2E",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryPillText: {
    color: "#D4AF37",
    fontWeight: "700",
    fontSize: 12,
  },
  categoryInner: {
    flexDirection: "column",
    alignItems: "center",
  },
  liveDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4AF37",
  },
  categoryCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 24,
    width: "48%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    alignItems: "center",
  },
  categoryIconContainer: {
    backgroundColor: "#2C2C2E",
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  liveText: {
    color: "#DC2626",
    fontSize: 12,
  },
});

// Keep default export compatible with existing imports in App.tsx
import { useNavigation } from "@react-navigation/native";

export default function Rewards({ session }: { session?: Session | null }) {
  const navigation = useNavigation<any>();

  const handleCategoryClick = (category: string) => {
    // Navigate into the Home stack's Category screen
    navigation.navigate("Home", {
      screen: "Category",
      params: { categoryName: category },
    });
  };

  const handleHotspotClick = async (hotspotId: string | number) => {
    try {
      const { data: hotspot, error } = await supabase
        .from("hotspots")
        .select("*")
        .eq("id", hotspotId)
        .single();
      if (error) throw error;
      navigation.navigate("Home", {
        screen: "HotspotDetail",
        params: { hotspot },
      });
    } catch (err) {
      console.warn("Failed to load hotspot details:", err);
      navigation.navigate("Home", {
        screen: "HotspotDetail",
        params: { hotspot: { id: hotspotId } },
      });
    }
  };

  return (
    <HotspotsMainPage
      onCategoryClick={handleCategoryClick}
      onHotspotClick={handleHotspotClick}
    />
  );
}
