import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

interface WalletCardProps {
  id: string;
  name: string;
  photo: string;
  location: string;
  metDate: string;
  isActive?: boolean;
  isRecent?: boolean;
  onClick: () => void;
}

export function WalletCard({
  name,
  photo,
  location,
  metDate,
  isActive,
  isRecent,
  onClick,
}: WalletCardProps) {
  return (
    <TouchableOpacity
      onPress={onClick}
      style={[
        styles.container,
        isRecent ? styles.containerRecent : styles.containerOlder,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Profile Photo */}
        <View
          style={[
            styles.photoContainer,
            isRecent ? styles.photoLarge : styles.photoSmall,
          ]}
        >
          <Image source={{ uri: photo }} style={styles.photo} />
          {isActive && (
            <View style={styles.activeIndicatorContainer}>
              <View style={styles.activeIndicator} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text
            style={[
              styles.name,
              isRecent ? styles.nameRecent : styles.nameOlder,
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
          <Text style={styles.metDate}>{metDate}</Text>
        </View>

        {/* Message Icon */}
        <FontAwesome6
          name="message"
          size={20}
          color="rgba(255, 255, 255, 0.3)"
          style={styles.messageIcon}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#161616",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  containerRecent: {
    padding: 16,
  },
  containerOlder: {
    padding: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photoContainer: {
    position: "relative",
    flexShrink: 0,
  },
  photoLarge: {
    width: 64,
    height: 64,
  },
  photoSmall: {
    width: 56,
    height: 56,
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  activeIndicatorContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    backgroundColor: "#D4AF37",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#161616",
    justifyContent: "center",
    alignItems: "center",
  },
  activeIndicator: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#D4AF37",
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: "white",
    fontWeight: "600",
  },
  nameRecent: {
    fontSize: 16,
  },
  nameOlder: {
    fontSize: 14,
  },
  location: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    marginTop: 2,
  },
  metDate: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 12,
    marginTop: 4,
  },
  messageIcon: {
    flexShrink: 0,
  },
});
