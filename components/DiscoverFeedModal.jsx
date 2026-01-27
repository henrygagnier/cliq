import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { LinearGradient } from "expo-linear-gradient";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function DiscoverFeedModal({
  hotspots,
  userLocation,
  onClose,
  onHotspotPress,
  calculateDistance,
  formatDistance,
}) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={["#121318", "#0f172a"]}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <View style={styles.modalHandle} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Discover Hotspots</Text>
          </View>

          {/* Hotspots List */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {hotspots.length > 0 ? (
              hotspots.map((hotspot, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.hotspotCard}
                  onPress={() => {
                    handleClose();
                    setTimeout(() => {
                      onHotspotPress(hotspot);
                    }, 250);
                  }}
                >
                  <LinearGradient
                    colors={["rgba(30, 41, 59, 0.9)", "rgba(15, 23, 42, 0.9)"]}
                    style={styles.hotspotCardGradient}
                  >
                    <View style={styles.hotspotCardHeader}>
                      <Text style={styles.hotspotName}>
                        {hotspot.name || "Unnamed Hotspot"}
                      </Text>
                      {userLocation && (
                        <Text style={styles.hotspotDistance}>
                          {formatDistance(
                            calculateDistance(
                              userLocation.lat,
                              userLocation.lng,
                              hotspot.lat,
                              hotspot.lon,
                            ),
                          )}
                        </Text>
                      )}
                    </View>
                    {hotspot.cuisine && (
                      <Text style={styles.hotspotCuisine}>
                        {hotspot.cuisine}
                      </Text>
                    )}
                    <View style={styles.hotspotFooter}>
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>Live</Text>
                      </View>
                      <FontAwesome6
                        name="chevron-right"
                        size={14}
                        color="#94a3b8"
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <FontAwesome6
                  name="map-location-dot"
                  size={48}
                  color="#475569"
                />
                <Text style={styles.emptyStateText}>
                  No hotspots found nearby
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Try zooming in on the map or moving to a different area
                </Text>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    height: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(82, 82, 91, 0.3)",
  },
  closeButton: {
    alignItems: "center",
    marginBottom: 12,
  },
  modalHandle: {
    width: 48,
    height: 4,
    backgroundColor: "rgba(82, 82, 91, 0.8)",
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  hotspotCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  hotspotCardGradient: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  hotspotCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hotspotName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
  },
  hotspotDistance: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f59e0b",
    marginLeft: 8,
  },
  hotspotCuisine: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 12,
  },
  hotspotFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#94a3b8",
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
