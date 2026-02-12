import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Text } from "@gluestack-ui/themed";
import { ArrowLeft, Wine, Users, MapPin } from "lucide-react-native";
import { LiveIndicator } from "./LiveIndicator";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";

interface HotspotItem {
  id: string;
  name: string;
  distance: string;
  userCount: number;
  vibe: string;
  isActive: boolean;
}

interface CategoryPageProps {
  categoryName: string;
  onBack: () => void;
  onHotspotClick: (hotspotId: string | number) => void;
}

function HotspotListCard({
  id,
  name,
  distance,
  userCount,
  vibe,
  isActive,
  onClick,
}: HotspotItem & { onClick: () => void }) {
  return (
    <TouchableOpacity
      style={[
        styles.listCard,
        isActive ? styles.listCardActive : styles.listCardInactive,
      ]}
      onPress={onClick}
      activeOpacity={0.95}
    >
      <View style={styles.listTop}>
        <View style={styles.listTopLeft}>
          <Text style={styles.listTitle}>{name}</Text>
          <View style={styles.metaRow}>
            <MapPin width={14} height={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{distance}</Text>
          </View>
        </View>

        {isActive ? <LiveIndicator size="sm" /> : null}
      </View>

      <View style={styles.listBottom}>
        <View style={styles.leftBottomGroup}>
          <View style={styles.usersRow}>
            <Users
              width={14}
              height={14}
              color={isActive ? "#D4AF37" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.userCountText,
                isActive ? styles.userCountActive : null,
              ]}
            >
              {userCount}
            </Text>
          </View>

          <Text style={styles.bullet}>•</Text>
          <Text style={styles.metaText}>{vibe}</Text>
        </View>

        {isActive ? (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => {
              /* placeholder join */
            }}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function CategoryPage({
  categoryName,
  onBack,
  onHotspotClick,
}: CategoryPageProps) {
  const [sortBy, setSortBy] = useState<"active" | "closest" | "trending">(
    "active",
  );

  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [loadingHotspots, setLoadingHotspots] = useState<boolean>(true);

  const mapCategoryName = (name: string) => {
    const key = name.toLowerCase();
    if (key.includes("caf")) return ["cafe"];
    if (key.includes("bar") || key.includes("night"))
      return ["bar", "pub", "nightclub"];
    if (key.includes("rest")) return ["restaurant"];
    if (key.includes("gym")) return ["fitness_centre", "gym"];
    if (key.includes("campus")) return ["college", "university"];
    if (key.includes("shop")) return ["shop", "retail"];
    if (key.includes("music")) return ["music_venue", "nightclub"];
    return [];
  };

  const toRad = (value: number) => (value * Math.PI) / 180;
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371;
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

  useEffect(() => {
    const fetchCategoryHotspots = async () => {
      setLoadingHotspots(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setHotspots([]);
          setLoadingHotspots(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;

        const types = mapCategoryName(categoryName);
        const radiusMi = 12.4;
        const latDelta = radiusMi / 69; // ~69 miles per degree latitude
        const lonDelta = radiusMi / (69 * Math.max(Math.cos(toRad(lat)), 0.2));
        const minLat = lat - latDelta;
        const maxLat = lat + latDelta;
        const minLon = lon - lonDelta;
        const maxLon = lon + lonDelta;

        let query = supabase
          .from("hotspots")
          .select("id,name,type,latitude,longitude")
          .gte("latitude", minLat)
          .lte("latitude", maxLat)
          .gte("longitude", minLon)
          .lte("longitude", maxLon)
          .limit(150);

        if (types.length > 0) {
          query = query.in("type", types);
        }

        const { data: filteredHotspots, error } = await query;
        if (error) throw error;

        const hotspotsWithDistance = (filteredHotspots || [])
          .map((h: any) => ({
            ...h,
            distanceMi: calculateDistance(lat, lon, h.latitude, h.longitude),
          }))
          .filter((h: any) => h.distanceMi <= radiusMi);

        const ids = hotspotsWithDistance.map((h: any) => h.id);
        const thirtyMinAgo = new Date(
          Date.now() - 30 * 60 * 1000,
        ).toISOString();
        const { data: activeData } = await supabase
          .from("hotspot_active_users")
          .select("hotspot_id, count:user_id")
          .in("hotspot_id", ids)
          .gte("last_seen", thirtyMinAgo)
          .group("hotspot_id");

        const counts: Record<string, number> = {};
        (activeData || []).forEach((row: any) => {
          counts[row.hotspot_id] = row.count || 0;
        });

        const result = hotspotsWithDistance.map((h: any) => ({
          id: h.id,
          name: h.name,
          distance:
            h.distanceMi < 1
              ? `${Math.round(h.distanceMi * 5280)}ft away`
              : `${h.distanceMi.toFixed(1)}mi away`,
          userCount: counts[h.id] || 0,
          vibe: h.type || "location",
          isActive: (counts[h.id] || 0) > 0,
        }));

        setHotspots(result);
      } catch (err) {
        console.error("Error fetching category hotspots:", err);
        setHotspots([]);
      } finally {
        setLoadingHotspots(false);
      }
    };

    fetchCategoryHotspots();
  }, [categoryName]);

  const sorted = useMemo(() => {
    const copy = hotspots.slice();
    if (sortBy === "active") {
      copy.sort((a, b) => {
        if (a.isActive === b.isActive) return b.userCount - a.userCount;
        return a.isActive ? -1 : 1;
      });
    } else if (sortBy === "closest") {
      const parse = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 99;
      copy.sort((a, b) => parse(a.distance) - parse(b.distance));
    } else if (sortBy === "trending") {
      copy.sort((a, b) => b.userCount - a.userCount);
    }
    return copy;
  }, [hotspots, sortBy]);

  const anim = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const containerStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  } as any;

  return (
    <Animated.View style={[styles.pageContainer, containerStyle]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft width={18} height={18} color="#D4AF37" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <View style={styles.catIconBox}>
            <Wine width={18} height={18} color="#D4AF37" />
          </View>
          <Text style={styles.title}>{categoryName}</Text>
        </View>
      </View>

      <View style={styles.filterBarContainer}>
        <View style={styles.filterBar}>
          {(["active", "closest", "trending"] as const).map((option) => (
            <TouchableOpacity
              activeOpacity={0.7}
              key={option}
              onPress={() => setSortBy(option)}
              style={[
                styles.filterOption,
                sortBy === option ? styles.filterOptionActive : null,
              ]}
            >
              <Text
                style={
                  sortBy === option
                    ? styles.filterOptionTextActive
                    : styles.filterOptionText
                }
              >
                {option === "active" && "Most Active"}
                {option === "closest" && "Closest"}
                {option === "trending" && "Trending"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ gap: 12, minHeight: 200 }}>
          {loadingHotspots ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <ActivityIndicator color="#D4AF37" size="large" />
            </View>
          ) : sorted.length === 0 ? (
            <Text style={{ color: "#9CA3AF" }}>
              No hotspots found in this category nearby.
            </Text>
          ) : (
            sorted.map((hotspot) => (
              <HotspotListCard
                key={hotspot.id}
                {...hotspot}
                onClick={() => onHotspotClick(hotspot.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  backText: {
    color: "#D4AF37",
    fontWeight: "600",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  catIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  filterBarContainer: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  filterBar: {
    flexDirection: "row",
    backgroundColor: "#1C1C1E",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    padding: 6,
  },
  filterOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  filterOptionActive: {
    backgroundColor: "#D4AF37",
  },
  filterOptionText: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "600",
  },
  filterOptionTextActive: {
    color: "#000",
    fontSize: 13.5,
    fontWeight: "700",
  },
  listContainer: {
    paddingHorizontal: 24,
    marginTop: 6,
  },
  listCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
  },
  listCardActive: {
    borderWidth: 1,
    borderColor: "#D4AF37",
    shadowColor: "#D4AF37",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  listCardInactive: {
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  listTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  listTopLeft: {
    flex: 1,
    overflow: "hidden",
  },
  listTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    numberOfLines: 1,
    ellipsizeMode: "tail",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    color: "#9CA3AF",
    marginLeft: 6,
    numberOfLines: 1,
  },
  listBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftBottomGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  usersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userCountText: {
    color: "#D4AF37",
    fontWeight: "800",
    marginLeft: 6,
  },
  userCountActive: {
    color: "#D4AF37",
  },
  bullet: {
    color: "#9CA3AF",
    marginHorizontal: 8,
  },
  joinButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  joinButtonText: {
    color: "#000",
    fontWeight: "700",
  },
});

// Default screen wrapper for React Navigation
export default function CategoryPageScreen({ route, navigation }: any) {
  const categoryName = route?.params?.categoryName ?? "Category";

  const handleHotspotClick = async (hotspot: HotspotItem | string | number) => {
    const id = typeof hotspot === "object" ? (hotspot as any).id : hotspot;
    try {
      const { data: hotspotRecord, error } = await supabase
        .from("hotspots")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      navigation.navigate("HotspotDetail", { hotspot: hotspotRecord });
    } catch (err) {
      console.warn("Failed to load hotspot details:", err);
      navigation.navigate("HotspotDetail", { hotspot: { id } });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <CategoryPage
        categoryName={categoryName}
        onBack={() => navigation.goBack()}
        onHotspotClick={handleHotspotClick}
      />
    </View>
  );
}
