import React, { useState, useEffect, useRef } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Box, VStack, HStack, Text, Pressable } from "@gluestack-ui/themed";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { HotspotsMainPage } from "./Rewards";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HotspotMap() {
  const [loading, setLoading] = useState<boolean>(true);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [rawHotspots, setRawHotspots] = useState<any[]>([]);
  const filterTimeoutRef = useRef<any>(null);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(15);
  const webViewRef = useRef<any>(null);
  const mapLoaded = useRef(false);
  const lastSyncTime = useRef(0);
  const syncInProgress = useRef(false);
  const nextAllowedSyncTime = useRef(0); // cool-down timestamp to avoid hammering OSM when errors occur
  const navigation = useNavigation<any>();
  const [showFeedModal, setShowFeedModal] = useState(false);

  // Get user location on mount
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setUserLocation({ lat: 40.758, lng: -73.9855 });
          setLoading(false);
          return;
        }

        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        setLoading(false);
      } catch (error) {
        console.error("Error getting location:", error);
        setUserLocation({ lat: 40.758, lng: -73.9855 });
        setLoading(false);
      }
    })();
  }, []);

  // Calculate distance between two coordinates
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

  const toRad = (value: number) => {
    return (value * Math.PI) / 180;
  };

  const formatDistance = (distanceMi: number) => {
    if (distanceMi < 1) {
      return `${Math.round(distanceMi * 5280)}ft`;
    }
    return `${distanceMi.toFixed(1)}mi`;
  };

  const getBoundingBox = (lat: number, lng: number, radiusMi: number) => {
    const latDelta = radiusMi / 69;
    const lonDelta = radiusMi / (69 * Math.max(Math.cos(toRad(lat)), 0.2));
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLon: lng - lonDelta,
      maxLon: lng + lonDelta,
    };
  };

  // Determine radius and minimum distance between markers based on zoom level
  const getRadiusAndMinDistance = (zoom: number) => {
    let radius: number, minDistance: number;

    // Super granular zoom levels with smooth transitions
    if (zoom >= 18) {
      radius = 0.3;
      minDistance = 0.0075; // ~15m apart
    } else if (zoom >= 17.75) {
      radius = 0.35;
      minDistance = 0.009; // ~18m apart
    } else if (zoom >= 17.5) {
      radius = 0.4;
      minDistance = 0.011; // ~22m apart
    } else if (zoom >= 17.25) {
      radius = 0.45;
      minDistance = 0.0125; // ~25m apart
    } else if (zoom >= 17) {
      radius = 0.5;
      minDistance = 0.015; // ~30m apart
    } else if (zoom >= 16.75) {
      radius = 0.6;
      minDistance = 0.02; // ~40m apart
    } else if (zoom >= 16.5) {
      radius = 0.7;
      minDistance = 0.025; // ~50m apart
    } else if (zoom >= 16.25) {
      radius = 0.85;
      minDistance = 0.0275; // ~55m apart
    } else if (zoom >= 16) {
      radius = 1.0;
      minDistance = 0.03; // ~60m apart
    } else if (zoom >= 15.75) {
      radius = 1.2;
      minDistance = 0.04; // ~80m apart
    } else if (zoom >= 15.5) {
      radius = 1.4;
      minDistance = 0.045; // ~90m apart
    } else if (zoom >= 15.25) {
      radius = 1.7;
      minDistance = 0.05; // ~100m apart
    } else if (zoom >= 15) {
      radius = 2.0;
      minDistance = 0.06; // ~120m apart
    } else if (zoom >= 14.75) {
      radius = 2.3;
      minDistance = 0.075; // ~150m apart
    } else if (zoom >= 14.5) {
      radius = 2.6;
      minDistance = 0.09; // ~180m apart
    } else if (zoom >= 14.25) {
      radius = 2.8;
      minDistance = 0.1; // ~200m apart
    } else if (zoom >= 14) {
      radius = 3.0;
      minDistance = 0.11; // ~220m apart
    } else {
      radius = 4.0;
      minDistance = 0.15; // ~300m apart
    }

    return { radius, minDistance };
  };

  // Filter hotspots by minimum distance between markers
  const filterHotspotsByDistance = (hotspots: any[], minDistance: number) => {
    const filtered: any[] = [];

    for (const hotspot of hotspots) {
      let tooClose = false;

      for (const existing of filtered) {
        const distance = calculateDistance(
          hotspot.lat,
          hotspot.lng,
          existing.lat,
          existing.lng,
        );

        if (distance < minDistance) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        filtered.push(hotspot);
      }
    }

    return filtered;
  };

  // Fetch hotspots from Supabase
  const fetchHotspotsFromSupabase = async (
    lat: number,
    lng: number,
    zoom: number,
  ) => {
    if (zoom < 15) {
      setHotspots([]);
      return;
    }

    try {
      const { radius, minDistance } = getRadiusAndMinDistance(zoom);
      const { minLat, maxLat, minLon, maxLon } = getBoundingBox(
        lat,
        lng,
        radius,
      );

      const { data, error } = await supabase
        .from("hotspots")
        .select("id,name,type,latitude,longitude")
        .gte("latitude", minLat)
        .lte("latitude", maxLat)
        .gte("longitude", minLon)
        .lte("longitude", maxLon)
        .limit(180);

      if (error) throw error;

      const hotspotsWithDistance = (data || [])
        .map((hotspot) => {
          const distanceFromUser = calculateDistance(
            userLocation ? userLocation.lat : lat,
            userLocation ? userLocation.lng : lng,
            hotspot.latitude,
            hotspot.longitude,
          );

          const distanceFromCenter = calculateDistance(
            lat,
            lng,
            hotspot.latitude,
            hotspot.longitude,
          );

          return {
            ...hotspot,
            lat: hotspot.latitude,
            lng: hotspot.longitude,
            distanceMi: distanceFromUser,
            distance: formatDistance(distanceFromUser),
            _distanceFromCenter: distanceFromCenter,
          };
        })
        .filter((hotspot) => hotspot._distanceFromCenter <= radius)
        .sort((a, b) => a.distanceMi - b.distanceMi);

      setRawHotspots(hotspotsWithDistance);
      if (!hotspots || hotspots.length === 0) {
        setHotspots(hotspotsWithDistance.slice(0, 60));
      }
    } catch (error) {
      console.error("Error fetching hotspots:", error);
    }
  };

  // Sync with OpenStreetMap (safer: timeout, retries, backoff, and cooldown on 429/504)
  const syncWithOSM = async (lat: number, lng: number, zoom: number) => {
    if (zoom < 15) {
      return;
    }

    const now = Date.now();
    // Respect global cooldown if previously rate-limited or errored
    if (now < nextAllowedSyncTime.current) {
      console.log(
        "Skipping OSM sync - in cooldown until",
        new Date(nextAllowedSyncTime.current).toISOString(),
      );
      return;
    }

    if (syncInProgress.current) {
      console.log("Skipping OSM sync - another sync in progress");
      return;
    }

    // Throttle quick successive moves
    if (now - lastSyncTime.current < 1000) {
      console.log("Skipping OSM sync - too soon since last sync");
      return;
    }

    syncInProgress.current = true;
    lastSyncTime.current = now;

    try {
      const radius = zoom >= 16 ? 300 : zoom >= 15 ? 500 : 800;

      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="cafe"](around:${radius},${lat},${lng});
          node["amenity"="bar"](around:${radius},${lat},${lng});
          node["amenity"="pub"](around:${radius},${lat},${lng});
          node["leisure"="fitness_centre"](around:${radius},${lat},${lng});
          node["amenity"="coworking_space"](around:${radius},${lat},${lng});
          node["amenity"="college"](around:${radius},${lat},${lng});
          node["amenity"="university"](around:${radius},${lat},${lng});
          node["amenity"="library"](around:${radius},${lat},${lng});
          way["amenity"="library"](around:${radius},${lat},${lng});
        );
        out center;
      `;

      const maxRetries = 2;
      let attempt = 0;
      const baseDelay = 2000; // ms

      while (attempt <= maxRetries) {
        attempt++;

        // Build a request with timeout using AbortController
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        let response: any = null;
        try {
          response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
            headers: { "Content-Type": "text/plain" },
            signal: controller.signal,
          });
        } catch (fetchErr: any) {
          if (fetchErr.name === "AbortError") {
            console.log("OSM request timed out (abort)");
          } else {
            console.log("Network error contacting OSM:", fetchErr);
          }
        } finally {
          clearTimeout(timeout);
        }

        // No response due to network/timeout
        if (!response) {
          if (attempt <= maxRetries) {
            const wait =
              baseDelay * Math.pow(2, attempt - 1) +
              Math.floor(Math.random() * 1000);
            console.log(
              `No response from OSM (attempt ${attempt}), retrying in ${wait}ms`,
            );
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }

          // Give a cooldown if we exhausted retries
          const cooldown = 10000 + Math.floor(Math.random() * 5000);
          nextAllowedSyncTime.current = Date.now() + cooldown;
          console.log(
            `OSM sync failed with no response; cooling down for ${cooldown}ms`,
          );
          syncInProgress.current = false;
          return;
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get("Retry-After");
          const retryAfter = retryAfterHeader
            ? parseInt(retryAfterHeader, 10)
            : 60;
          const cooldown =
            (isNaN(retryAfter) ? 60 : retryAfter) * 1000 +
            Math.floor(Math.random() * 2000);
          nextAllowedSyncTime.current = Date.now() + cooldown;
          console.log(
            `Rate limited by OSM (429). Cooling down for ${Math.round(
              cooldown / 1000,
            )}s`,
          );
          syncInProgress.current = false;
          return;
        }

        if (!response.ok) {
          // Server error like 504
          if (response.status >= 500) {
            if (attempt <= maxRetries) {
              const wait =
                baseDelay * Math.pow(2, attempt - 1) +
                Math.floor(Math.random() * 1000);
              console.log(
                `OSM server error ${response.status}, retrying attempt ${attempt} in ${wait}ms`,
              );
              await new Promise((r) => setTimeout(r, wait));
              continue;
            }

            const cooldown = 10000 + Math.floor(Math.random() * 5000);
            nextAllowedSyncTime.current = Date.now() + cooldown;
            console.log(
              `OSM server error ${response.status}; giving up and cooling down for ${cooldown}ms`,
            );
            syncInProgress.current = false;
            return;
          }

          // Other non-ok statuses we treat as errors
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Success path
        try {
          const data = await response.json();

          for (const element of data.elements) {
            if (!element.tags || !element.tags.name) continue;

            const lat = element.lat || element.center?.lat;
            const lon = element.lon || element.center?.lon;
            if (!lat || !lon) continue;

            let address = null;
            if (
              element.tags["addr:street"] &&
              element.tags["addr:housenumber"]
            ) {
              address = `${element.tags["addr:housenumber"]} ${element.tags["addr:street"]}`;
              if (element.tags["addr:city"]) {
                address += `, ${element.tags["addr:city"]}`;
              }
              if (element.tags["addr:postcode"]) {
                address += ` ${element.tags["addr:postcode"]}`;
              }
            }

            const hotspot = {
              name: element.tags.name,
              type: element.tags.amenity || element.tags.leisure || "location",
              latitude: lat,
              longitude: lon,
              address: address,
              osm_id: `${element.type}/${element.id}`,
            };

            const { data: existing } = await supabase
              .from("hotspots")
              .select("id")
              .eq("osm_id", hotspot.osm_id)
              .single();

            if (!existing) {
              await supabase.from("hotspots").insert([hotspot]);
            }
          }

          console.log("OSM sync completed successfully");
          await fetchHotspotsFromSupabase(lat, lng, zoom);
        } catch (err) {
          console.error("Error processing OSM response:", err);
        }

        break; // exit retry loop on success
      }
    } catch (error) {
      console.error("Error syncing with OSM:", error);
    } finally {
      syncInProgress.current = false;
    }
  };

  // Debounced clutter filter
  useEffect(() => {
    if (zoomLevel < 14) {
      setHotspots([]);
      setRawHotspots([]);
      return;
    }

    if (!rawHotspots || rawHotspots.length === 0) return;

    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      const { minDistance } = getRadiusAndMinDistance(zoomLevel);
      const filtered = filterHotspotsByDistance(rawHotspots, minDistance);
      setHotspots(filtered);
      filterTimeoutRef.current = null;
      console.log("Clutter filter applied, hotspots:", filtered.length);
    }, 10);

    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = null;
      }
    };
  }, [rawHotspots, zoomLevel]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("Message from WebView:", data.type);

      if (data.type === "mapMove") {
        setZoomLevel(data.zoom);
        fetchHotspotsFromSupabase(data.center.lat, data.center.lng, data.zoom);
        syncWithOSM(data.center.lat, data.center.lng, data.zoom);
      } else if (data.type === "markerClick") {
        try {
          navigation.navigate("HotspotDetail", {
            hotspot: data.hotspot,
          });
        } catch (navErr) {
          console.error("Navigation error:", navErr);
        }
      } else if (data.type === "mapInitialized") {
        console.log("Map initialized successfully");
        setMapInitialized(true);
      }
    } catch (e) {
      console.log("Error parsing message:", e, "Data:", event.nativeEvent.data);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      cafe: "#8b5cf6",
      bar: "#f59e0b",
      pub: "#f59e0b",
      fitness_centre: "#ef4444",
      coworking_space: "#3b82f6",
      college: "#10b981",
      university: "#10b981",
      library: "#10b981",
    };
    return colors[type] || "#6b7280";
  };

  const generateMapHTML = () => {
    if (!userLocation) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .loading { 
              color: #94a3b8; 
              font-size: 16px; 
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="loading">Loading map...</div>
        </body>
        </html>
      `;
    }

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
          
          .leaflet-tooltip {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            font-weight: 600;
            padding: 0 !important;
          }
            .leaflet-control-attribution {
            display:none;
  opacity: 0.3 !important;
  font-size: 8px !important;
  background: transparent !important;
}
          
          .leaflet-tooltip-top:before {
            display: none !important;
          }
          
          .modern-tooltip {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          
          .modern-marker {
            cursor: pointer !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .modern-marker:hover {
            transform: scale(1.15);
            z-index: 1000 !important;
          }


          .marker-button {
            border: none;
            background: transparent;
            padding: 0;
            cursor: pointer;
            position: relative;
          }

          .marker-inner { position: relative; }

          .marker-pulse {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            opacity: 0.45;
            pointer-events: none;
            animation: pulse 2.5s ease-in-out infinite;
          }

          .marker-core {
            position: relative;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }

          .marker-button:hover .marker-core {
            transform: scale(1.05);
            box-shadow: 0 12px 32px rgba(37, 99, 235, 0.3);
          }
          
          .marker-button.selected .marker-core {
            background: #2563EB !important;
          }

          .marker-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            color: white;
            font-weight: 700;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 999px;
            min-width: 24px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          }

          .marker-tooltip {
            position: absolute;
            top: calc(100% + 12px);
            left: 50%;
            transform: translateX(-50%) translateY(6px);
            background: rgba(15,23,42,0.95);
            color: #e2e8f0;
            padding: 8px 12px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            opacity: 0;
            transition: opacity 0.2s ease, transform 0.2s ease;
            white-space: nowrap;
            border: 1px solid rgba(148,163,184,0.12);
            pointer-events: none;
          }

          .marker-button:hover .marker-tooltip {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
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
          
          .zoom-message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
            padding: 24px 32px;
            border-radius: 20px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.5);
            z-index: 1000;
            display: none;
            text-align: center;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(148, 163, 184, 0.2);
          }
          
          .zoom-message.show { 
            display: block; 
            animation: fadeIn 0.4s ease;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          
          .hotspot-marker {
            cursor: pointer !important;
            transition: all 0.3s ease;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
          }
          
          .hotspot-marker:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 12px 24px rgba(0,0,0,0.5));
          }
          
          .user-marker {
            filter: drop-shadow(0 8px 24px rgba(59,130,246,0.6));
          }
          
          .zoom-controls {
            position: absolute;
            top: 24px;
            right: 24px;
            z-index: 1000;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            border: 1px solid rgba(148, 163, 184, 0.2);
            backdrop-filter: blur(20px);
          }
          
          .zoom-btn {
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            font-size: 24px;
            font-weight: 300;
            color: #e2e8f0;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .zoom-btn:hover {
            background: rgba(148, 163, 184, 0.1);
            color: #f59e0b;
          }
          
          .zoom-btn:first-child {
            border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          }

          .leaflet-container {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        
        <div id="zoom-message">
        </div>
        
        <div class="zoom-controls">
          <button class="zoom-btn" onclick="map.zoomIn()">+</button>
          <button class="zoom-btn" onclick="map.zoomOut()">−</button>
        </div>
        
        <script>
          console.log('Initializing map...');
          
          // GLOBAL SYNC TIMESTAMP - All markers sync to this
          var PULSE_DURATION = 2500;
          var ANIMATION_START = Date.now();
          
          function getGlobalAnimationDelay() {
            var elapsed = Date.now() - ANIMATION_START;
            var phase = elapsed % PULSE_DURATION;
            return (-phase) + 'ms';
          }
          
          try {
            var map = L.map('map', {
              zoomControl: false,
              zoomSnap: 0.1,
              inertia: true,
              fadeAnimation: true,
              zoomAnimation: true,
              preferCanvas: true
            }).setView([${userLocation.lat}, ${userLocation.lng}], 15);
            
            console.log('Map created, setting up tile layer...');
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              attribution: '',
              maxZoom: 19,
              minZoom: 3,
              subdomains: 'abcd'
            }).addTo(map);
            
            console.log('Tile layer added');
            
            // User location marker
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
                    box-shadow:
                      0 8px 24px rgba(59,130,246,0.6),
                      0 0 0 1px rgba(0,0,0,0.1);
                  "></div>
                </div>
              \`,
              className: 'user-marker',
              iconSize: [40, 40],
              iconAnchor: [20, 20]
            });
            
            L.marker([${userLocation.lat}, ${userLocation.lng}], {
              icon: userIcon
            }).addTo(map);
            
            console.log('User marker added');
            
            var hotspotMarkers = L.layerGroup().addTo(map);
            var hotspotMarkerMap = {};
            
            var pendingHotspots = null;
            var isZooming = false;
            var zoomMessage = document.getElementById('zoom-message');
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapInitialized'
            }));
            
            console.log('Map initialization complete, sending message...');
            
            function checkZoomLevel() {
              var zoom = map.getZoom();
              
              if (zoom < 14) {
                zoomMessage.classList.add('show');
              } else {
                zoomMessage.classList.remove('show');
              }
            }
            
            checkZoomLevel();
            
            var moveTimeout;
            map.on('moveend', function() {
              clearTimeout(moveTimeout);
              moveTimeout = setTimeout(function() {
                var center = map.getCenter();
                var zoom = map.getZoom();
                checkZoomLevel();
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapMove',
                  center: { lat: center.lat, lng: center.lng },
                  zoom: zoom
                }));
              }, 300);
            });
            
            map.on('zoomend', function() {
              isZooming = false;
              checkZoomLevel();
              if (pendingHotspots) {
                window.updateHotspots(pendingHotspots);
                pendingHotspots = null;
              }
            });
            
            map.on('zoomstart', function() {
              isZooming = true;
              zoomMessage.classList.remove('show');
            });
            
            window.updateHotspots = function(hotspots) {
              console.log('Updating hotspots:', hotspots.length);
              
              // Get the global synced animation delay
              var globalDelay = getGlobalAnimationDelay();
              
              try {
                if (isZooming) {
                  pendingHotspots = hotspots;
                  console.log('Deferring hotspot update until zoomend');
                  return;
                }

                var incomingIds = new Set();
                
                hotspots.forEach(function(spot) {
                  if (!spot || !spot.lat || !spot.lng) return;

                  var id = spot.id || spot.osm_id || (spot.lat + '_' + spot.lng);
                  incomingIds.add(id);

                  if (hotspotMarkerMap[id]) {
                    var existing = hotspotMarkerMap[id].marker;
                    existing.setLatLng([spot.lat, spot.lng]);
                    try {
                      var el = existing.getElement();
                      if (el) {
                        var pulse = el.querySelector('.marker-pulse');
                        var core = el.querySelector('.marker-core');
                        var badge = el.querySelector('.marker-badge');

                        var userCount = spot.users || 0;
                        var markerSize = 44 + (userCount > 0 ? Math.min(userCount * 2, 24) : 0);
                        var pulseSize = markerSize + 16;

                        if (pulse) {
                          pulse.style.width = pulseSize + 'px';
                          pulse.style.height = pulseSize + 'px';
                          pulse.style.animationDelay = globalDelay;
                        }
                        if (core) {
                          core.style.width = markerSize + 'px';
                          core.style.height = markerSize + 'px';
                        }
                        if (badge) {
                          badge.textContent = userCount;
                        }

                        var icon = existing._icon;
                        if (icon) {
                          icon.style.width = markerSize + 'px';
                          icon.style.height = markerSize + 'px';
                        }
                      }
                    } catch (err) {
                      console.log('Error updating marker element:', err);
                    }

                    return;
                  }
                  
                  var color = getTypeColor(spot.type);
                  var userCount = spot.users || 0;
                  
                  var markerSize = 44 + (userCount > 0 ? Math.min(userCount * 2, 24) : 0);
                  var pulseSize = markerSize + 16;
                  
                  // Get emoji based on category/type
                  var categoryEmojis = {
                    cafe: '☕',
                    bar: '🍸',
                    pub: '🍺',
                    fitness_centre: '💪',
                    coworking_space: '💼',
                    college: '🎓',
                    university: '🎓',
                    library: '📚',
                    restaurant: '.🍔',
                  };
                  
                  var emoji = categoryEmojis[spot.type] || '📍';
                  var isActive = userCount > 50;
                  
                  var markerHTML = \`
                    <button class="marker-button" style="position: relative; width: \${markerSize}px; height: \${markerSize}px;">
                      \${isActive ? \`
                        <div class="marker-pulse" style="
                          position: absolute;
                          top: 50%;
                          left: 50%;
                          transform: translate(-50%, -50%);
                          width: \${pulseSize}px;
                          height: \${pulseSize}px;
                          border-radius: 50%;
                          background: #F97316;
                          opacity: 0.4;
                          animation: pulse 2s ease-in-out infinite;
                          animation-delay: \${globalDelay};
                        "></div>
                      \` : ''}
                      
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
                        \${emoji}
                        
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

                      <div class="marker-tooltip">
                        <div style="font-weight:600; font-size:13px; color: #cbd5e1; letter-spacing: 0.025em;">\${spot.name}</div>
                        <div style="font-size:11px; color: #94a3b8; margin-top:2px;">\${spot.distance || 'Nearby'}</div>
                      </div>

                    </button>
                  \`;

                  var icon = L.divIcon({
                    html: markerHTML,
                    className: 'modern-marker',
                    iconSize: [markerSize, markerSize],
                    iconAnchor: [markerSize / 2, markerSize / 2]
                  });
                  
                  var marker = L.marker([spot.lat, spot.lng], {
                    icon: icon,
                    riseOnHover: true
                  });

                  marker.on('add', function() {
                    try {
                      var el = marker.getElement && marker.getElement();
                      if (el) {
                        el.dataset.hotspotId = id;
                        var btn = el.querySelector('.marker-button');
                        if (btn) {
                          btn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', hotspot: spot }));
                          });
                        }
                      }
                    } catch (err) {
                      console.log('Error setting up marker:', err);
                    }
                  });

                  marker.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'markerClick',
                      hotspot: spot
                    }));
                  });
                  
                  marker.addTo(hotspotMarkers);
                  hotspotMarkerMap[id] = { marker: marker };
                });
                
                // Remove old markers
                Object.keys(hotspotMarkerMap).forEach(function(key) {
                  if (!incomingIds.has(key)) {
                    try {
                      hotspotMarkerMap[key].marker.removeFrom(hotspotMarkers);
                    } catch (err) {}
                    delete hotspotMarkerMap[key];
                  }
                });

                console.log('Hotspots updated successfully');
              } catch (error) {
                console.error('Error updating hotspots:', error);
              }
            };
            
            function getTypeColor(type) {
              var colors = {
                cafe: '#8b5cf6',
                bar: '#f59e0b',
                pub: '#f59e0b',
                fitness_centre: '#ef4444',
                coworking_space: '#3b82f6',
                college: '#10b981',
                university: '#10b981',
                library: '#10b981',
              };
              return colors[type] || '#6b7280';
            }
            
            window.debugMap = map;
            console.log('Map ready, all functions initialized');
            
          } catch (error) {
            console.error('Error initializing map:', error);
            document.body.innerHTML = '<div style="padding: 20px; color: #ef4444;">Error loading map: ' + error.message + '</div>';
          }
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    if (webViewRef.current && mapInitialized && hotspots.length > 0) {
      console.log("Injecting hotspots into WebView:", hotspots.length);
      const updateScript = `
        try {
          if (window.updateHotspots) {
            window.updateHotspots(${JSON.stringify(hotspots)});
            console.log('Hotspots injected successfully');
          } else {
            console.log('updateHotspots function not available yet');
          }
        } catch (error) {
          console.error('Error injecting hotspots:', error);
        }
        true;
      `;
      webViewRef.current.injectJavaScript(updateScript);
    }
  }, [hotspots, mapInitialized]);

  const handleRecenter = () => {
    if (userLocation && webViewRef.current) {
      console.log("Recentering to:", userLocation);
      const recenterScript = `
        try {
          if (map && typeof map.setView === 'function') {
            map.setView([${userLocation.lat}, ${userLocation.lng}], 15, {
              animate: true,
              duration: 1
            });
            console.log('Recentered successfully');
          } else {
            console.log('Map not available');
          }
        } catch (error) {
          console.error('Error recentering:', error);
        }
        true;
      `;
      webViewRef.current.injectJavaScript(recenterScript);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Getting your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        key={userLocation ? "map-loaded" : "map-loading"}
        style={styles.map}
        source={{ html: generateMapHTML() }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowFileAccess={true}
        scalesPageToFit={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("WebView error: ", nativeEvent);
        }}
        onLoadEnd={() => {
          console.log("WebView loaded");
          mapLoaded.current = true;
        }}
      />

      <TouchableOpacity
        style={styles.recenterButton}
        onPress={handleRecenter}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["rgba(30, 41, 59, 0.98)", "rgba(15, 23, 42, 0.98)"]}
          style={styles.recenterGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome6 name="location-arrow" size={20} color="#f59e0b" />
        </LinearGradient>
      </TouchableOpacity>

      {zoomLevel < 14 && (
        <View style={styles.zoomPrompt}>
          <LinearGradient
            colors={["rgba(30, 41, 59, 0.98)", "rgba(15, 23, 42, 0.98)"]}
            style={styles.zoomPromptGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <FontAwesome6
              name="magnifying-glass-plus"
              size={18}
              color="#94a3b8"
            />
            <Text style={styles.zoomPromptText}>
              Zoom in to discover hotspots
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Discover Hotspots Button */}
      {!showFeedModal && (
        <TouchableOpacity
          style={styles.discoverButton}
          onPress={() => setShowFeedModal(true)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["rgba(26, 27, 32, 0.95)", "rgba(26, 27, 32, 0.95)"]}
            style={styles.discoverButtonGradient}
          >
            <View style={styles.discoverHandle} />
            <Text style={styles.discoverButtonText}>Discover Hotspots</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Feed Modal */}
      <Modal
        visible={showFeedModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFeedModal(false)}
      >
        <View style={styles.feedModal}>
          <View style={styles.feedModalHeader}>
            <TouchableOpacity
              onPress={() => setShowFeedModal(false)}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <View style={styles.closeButtonCircle}>
                <FontAwesome6 name="chevron-down" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
          <HotspotsMainPage
            onCategoryClick={(category) => {
              setShowFeedModal(false);
              navigation.navigate("Category", { categoryName: category });
            }}
            onHotspotClick={async (hotspotId) => {
              try {
                const { data: hotspot, error } = await supabase
                  .from("hotspots")
                  .select("*")
                  .eq("id", hotspotId)
                  .single();
                if (error) throw error;
                setShowFeedModal(false);
                navigation.navigate("HotspotDetail", { hotspot });
              } catch (err) {
                console.warn("Failed to load hotspot details:", err);
                setShowFeedModal(false);
                navigation.navigate("HotspotDetail", {
                  hotspot: { id: hotspotId },
                });
              }
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  loadingText: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  map: {
    flex: 1,
  },
  recenterButton: {
    position: "absolute",
    top: 24,
    left: 24,
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  recenterGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 16,
  },
  zoomPrompt: {
    position: "absolute",
    top: 88,
    left: 20,
    right: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
  zoomPromptGradient: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 16,
  },
  zoomPromptText: {
    fontSize: 14,
    color: "#f1f5f9",
    fontWeight: "700",
    marginLeft: 10,
  },
  discoverButton: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 20,
  },
  discoverButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(82, 82, 91, 0.6)",
    alignItems: "center",
  },
  discoverHandle: {
    width: 48,
    height: 4,
    backgroundColor: "rgba(82, 82, 91, 0.8)",
    borderRadius: 2,
    marginBottom: 8,
  },
  discoverButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBackdrop: {
    flex: 1,
  },
  feedModal: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  feedModalContent: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  feedModalHeader: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: "#0A0A0A",
    zIndex: 10,
    alignItems: "flex-end",
  },
  closeButton: {
    alignSelf: "flex-end",
  },
  closeButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(60, 60, 67, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHandle: {
    width: 48,
    height: 4,
    backgroundColor: "rgba(82, 82, 91, 0.8)",
    borderRadius: 2,
  },
  feedModalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  feedModalScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
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
