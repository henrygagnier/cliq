import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function MapPreviewScreen({ onContinue }) {
  const insets = useSafeAreaInsets();
  const [mapLoaded, setMapLoaded] = useState(false);

  const hotspotNodes = [
    { topPercent: 20, leftPercent: 30, users: 5 },
    { topPercent: 45, leftPercent: 60, users: 12 },
    { topPercent: 65, leftPercent: 25, users: 3 },
    { topPercent: 30, leftPercent: 70, users: 8 },
    { topPercent: 75, leftPercent: 55, users: 15 },
    { topPercent: 55, leftPercent: 40, users: 6 },
  ];

  const generateMapHTML = () => {
    // Times Square coordinates for demo
    const lat = 40.758;
    const lng = -73.9855;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          html, body { 
            height: 100%; 
            width: 100%; 
            overflow: hidden; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          
          #map { 
            height: 100vh; 
            width: 100vw; 
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          }

          .leaflet-control-attribution {
            display: none;
          }

          .leaflet-container {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
          }

          .modern-marker {
            cursor: default !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .marker-button {
            border: none;
            background: transparent;
            padding: 0;
            cursor: default;
            position: relative;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        
        <script>
          try {
            var map = L.map('map', {
              zoomControl: false,
              dragging: false,
              touchZoom: false,
              scrollWheelZoom: false,
              doubleClickZoom: false,
              boxZoom: false,
              keyboard: false,
              tap: false,
              zoomAnimation: true,
              fadeAnimation: true,
              preferCanvas: true
            }).setView([${lat}, ${lng}], 15);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              attribution: '',
              maxZoom: 19,
              minZoom: 3,
              subdomains: 'abcd'
            }).addTo(map);
            
            var hotspots = ${JSON.stringify(hotspotNodes)};
            
            hotspots.forEach(function(node) {
              var mapSize = 100;
              var latOffset = (node.topPercent - 50) / mapSize * 0.02;
              var lngOffset = (node.leftPercent - 50) / mapSize * 0.02;
              
              var markerLat = ${lat} + latOffset;
              var markerLng = ${lng} + lngOffset;
              
              var userCount = node.users || 0;
              var markerSize = 44 + (userCount > 0 ? Math.min(userCount * 2, 24) : 0);
              
              var markerHTML = \`
                <button class="marker-button" style="position: relative; width: \${markerSize}px; height: \${markerSize}px;">
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: \${markerSize}px;
                    height: \${markerSize}px;
                    background: linear-gradient(135deg, #475569 0%, #1e293b 100%);
                    border-radius: 50%;
                    border: 1px solid rgba(71, 85, 105, 0.5);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">
                    <div style="
                      position: absolute;
                      top: -6px;
                      right: -6px;
                      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                      color: white;
                      font-weight: 600;
                      font-size: 11px;
                      padding: 2px 6px;
                      border-radius: 9999px;
                      box-shadow: 0 8px 32px rgba(245,158,11,0.4);
                      min-width: 24px;
                      text-align: center;
                    ">\${userCount}</div>
                    
                    <svg width="\${markerSize * 0.45}" height="\${markerSize * 0.45}" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                </button>
              \`;

              var icon = L.divIcon({
                html: markerHTML,
                className: 'modern-marker',
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize / 2, markerSize / 2]
              });
              
              L.marker([markerLat, markerLng], {
                icon: icon,
                interactive: false
              }).addTo(map);
            });
            
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapLoaded' }));
            }
            
          } catch (error) {
            console.error('Error initializing map:', error);
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
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
        {/* Map Preview Container */}
        <View style={styles.mapContainer}>
          <WebView
            source={{ html: generateMapHTML() }}
            style={styles.webview}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            originWhitelist={["*"]}
          />

          {!mapLoaded && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
        </View>

        {/* Caption */}
        <View style={styles.caption}>
          <Text style={styles.captionTitle}>
            This is your world on Cliqcard
          </Text>
          <Text style={styles.captionDescription}>
            Explore hotspots, connect with people, and experience real-time
            activity wherever you go
          </Text>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <TouchableOpacity
        onPress={onContinue}
        style={styles.continueButton}
        activeOpacity={0.8}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
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
  },
  content: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 400,
    width: "100%",
  },
  mapContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 32,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e293b",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  caption: {
    alignItems: "center",
  },
  captionTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#f5f5f0",
    textAlign: "center",
    marginBottom: 8,
  },
  captionDescription: {
    color: "#a0a0a0",
    lineHeight: 24,
    textAlign: "center",
    fontSize: 16,
    marginBottom: 76,
  },
  continueButton: {
    width: "100%",
    maxWidth: 400,
    paddingVertical: 16,
    backgroundColor: "#f59e0b",
    borderRadius: 9999,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: "absolute",
    bottom: 32
  },
  continueButtonText: {
    color: "#000000",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 18,
  },
});
