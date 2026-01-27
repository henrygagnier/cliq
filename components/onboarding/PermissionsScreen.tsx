import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { MapPin, Check } from "lucide-react-native";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";

interface PermissionsScreenProps {
  onAllow: () => void;
}

export function PermissionsScreen({ onAllow }: PermissionsScreenProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleFinish = async () => {
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

  const generateMapHTML = () => {
    const lat = 40.758;
    const lng = -73.9855;
    
    // GLOBAL SYNC TIMESTAMP - All markers sync to this
    const PULSE_DURATION = 2500;
    const ANIMATION_START = Date.now();
    const globalAnimationDelay = (-ANIMATION_START % PULSE_DURATION);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; width: 100%; overflow: hidden; }
          #map { height: 100vh; width: 100vw; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
          .leaflet-control-attribution { display: none; }
          .leaflet-container { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important; }
          
          .modern-marker {
            cursor: default !important;
            transition: all 0.3s ease;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
          }
          
          .user-marker {
            filter: drop-shadow(0 8px 24px rgba(59,130,246,0.6));
          }
          
          @keyframes userPulse {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0.5;
            }
            70% {
              transform: translate(-50%, -50%) scale(1.3);
              opacity: 0;
            }
            100% {
              opacity: 0;
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0.45;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.3);
              opacity: 0;
            }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: false, dragging: false, touchZoom: false,
            scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false,
            keyboard: false, tap: false
          }).setView([${lat}, ${lng}], 14);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19, minZoom: 3, subdomains: 'abcd'
          }).addTo(map);
          
          // User marker
          var userIcon = L.divIcon({
            html: \`
              <div style="
                position: relative;
                width: 40px;
                height: 40px;
              ">
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  width: 40px;
                  height: 40px;
                  background: rgba(59,130,246,0.3);
                  border-radius: 50%;
                  transform: translate(-50%, -50%);
                  animation: userPulse 2.5s ease-out infinite;
                "></div>
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  width: 16px;
                  height: 16px;
                  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
                  border-radius: 50%;
                  transform: translate(-50%, -50%);
                  border: 3px solid white;
                  box-shadow: 0 8px 24px rgba(59,130,246,0.6), 0 0 0 1px rgba(0,0,0,0.1);
                "></div>
              </div>
            \`,
            className: 'user-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          
          
          
          // Sample hotspot markers with placeholder values
          var hotspots = [
            { lat: ${lat + 0.003}, lng: ${lng + 0.003}, emoji: '☕', name: 'Coffee Shop', users: 12 },
            { lat: ${lat - 0.004}, lng: ${lng + 0.005}, emoji: '🍸', name: 'Bar & Lounge', users: 8 },
            { lat: ${lat + 0.005}, lng: ${lng - 0.004}, emoji: '🎮', name: 'Gaming Hub', users: 5 }
          ];
          
          hotspots.forEach(function(spot) {
            var userCount = spot.users || 0;
            var markerSize = 54;
            
            var markerHTML = \`
              <button class="marker-button" style="position: relative; width: \${markerSize}px; height: \${markerSize}px; background: transparent; border: none; cursor: default;">
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: \${markerSize}px;
                  height: \${markerSize}px;
                  background: #3B82F6;
                  border-radius: 50%;
                  border: 2px solid rgba(255, 255, 255, 0.2);
                  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: \${markerSize * 0.5}px;
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                ">
                  \${spot.emoji}
                  
                  <div style="
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: #22C55E;
                    border: 2px solid #16A34A;
                    color: white;
                    font-weight: 700;
                    font-size: 12px;
                    padding: 0 6px;
                    border-radius: 9999px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                    min-width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">\${userCount}</div>
                </div>
              </button>
            \`;
            
            var markerIcon = L.divIcon({
              html: markerHTML,
              className: 'modern-marker',
              iconSize: [markerSize, markerSize],
              iconAnchor: [markerSize / 2, markerSize / 2]
            });
            
            L.marker([spot.lat, spot.lng], { icon: markerIcon, interactive: false }).addTo(map);
          });
          
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapLoaded' }));
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "mapLoaded") {
        setMapLoaded(true);
      }
    } catch (e) {
      console.log("Error parsing message:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Map Illustration */}
        <View style={styles.illustration}>
          <View style={styles.mapContainer}>
            <WebView
              source={{ html: generateMapHTML() }}
              onMessage={handleMessage}
              style={styles.webview}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              androidHardwareAccelerationDisabled={false}
              androidLayerType="hardware"
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>Enable location access and join</Text>
          <Text style={styles.subtitle}>
            Location enables you to discover and connect with people nearby.
            Your privacy is important to us and you can control this anytime.
          </Text>
        </View>

        {/* Button */}
        <TouchableOpacity
          onPress={handleFinish}
          style={styles.finishButton}
          activeOpacity={0.8}
        >
          <Check width={20} height={20} color="#000000" />
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "space-between",
    alignItems: "center",
  },
  illustration: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mapContainer: {
    width: 256,
    height: 256,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  textContent: {
    alignItems: "center",
    paddingVertical: 32,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  finishButton: {
    backgroundColor: "#D4AF37",
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  finishButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
