import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";
import Card from "./components/Account";
import WalletScreen from "./components/wallet/WalletScreen";
import { BusinessDashboard } from "./components/business";
import { getUserProfile } from "./lib/onboardingUtils";
import { Session } from "@supabase/supabase-js";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "@gluestack-ui/config";
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { MapPin, Wallet, Radio, Gem, User } from "lucide-react-native";
import Rewards from "./components/Rewards";
import Home from "./components/Home";
import HotspotDetailScreen from "./components/HotspotDetailScreen";
import CategoryPageScreen from "./components/CategoryPage";
import { LiveHotspotPage } from "./components/livehotspot/LiveHotspotPage";
import { LiveHotspotsHub } from "./components/livehotspot/LiveHotspotsHub";
import { PortalProvider } from "@gorhom/portal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { RewardsScreen } from "./components/RewardsScreen";
import RedeemedOffersScreen from "./components/RedeemedOffersScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setShowOnboarding(false);
      return;
    }

    let mounted = true;
    setProfileLoading(true);

    getUserProfile(session.user.id)
      .then((profile) => {
        if (!mounted) return;
        setShowOnboarding(!profile || profile.onboarding_completed !== true);
      })
      .catch(() => {
        if (mounted) setShowOnboarding(true);
      })
      .finally(() => {
        if (mounted) setProfileLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session]);

  if (loading) {
    return (
      <GluestackUIProvider config={config}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} />
      </GluestackUIProvider>
    );
  }

  function HomeStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HomeMain" component={Home} />
        <Stack.Screen
          name="HotspotDetail"
          component={HotspotDetailScreen}
          options={{
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            headerShown: false,
            gestureEnabled: true,
            cardStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="Category"
          component={CategoryPageScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RedeemedOffers"
          component={RedeemedOffersScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  function HotspotStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="HotspotHub" component={LiveHotspotPage} />
      </Stack.Navigator>
    );
  }

  function CustomTabBar({ state, descriptors, navigation }: any) {
    const insets = useSafeAreaInsets();

    const tabs = [
      { name: "Wallet", Icon: Wallet, route: "Card" },
      { name: "Discover", Icon: MapPin, route: "Home" },
      { name: "Live Hotspot", Icon: Radio, route: "Hotspot" },
      { name: "Rewards", Icon: Gem, route: "Rewards" },
      { name: "Profile", Icon: User, route: "Profile" },
    ];

    return (
      <View style={{ backgroundColor: "#0A0A0A" }}>
        <View
          style={{
            backgroundColor: "#111827",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "visible",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-around",
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 16 + insets.bottom,
            }}
          >
            {state.routes.map((route: any, index: number) => {
              const isFocused = state.index === index;
              const isCenter = index === 2;
              const tabInfo = tabs[index];
              const IconComponent = tabInfo.Icon;

              const onPress = () => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              if (isCenter) {
                return (
                  <TouchableOpacity
                    key={route.key}
                    onPress={onPress}
                    activeOpacity={0.9}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: -32,
                    }}
                  >
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isFocused ? (
                        <View
                          style={{
                            position: "absolute",
                            top: -30,
                            left: -30,
                            width: 140,
                            height: 140,
                          }}
                        >
                          <WebView
                            source={{
                              html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                              <style>
                                * {
                                  margin: 0;
                                  padding: 0;
                                  box-sizing: border-box;
                                }
                                body {
                                  width: 140px;
                                  height: 140px;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  background: transparent;
                                  overflow: visible;
                                }
                                .button-container {
                                  position: relative;
                                  width: 140px;
                                  height: 140px;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                }
                                .ring {
                                  position: absolute;
                                  width: 80px;
                                  height: 80px;
                                  border-radius: 50%;
                                  background: #3B82F6;
                                  opacity: 0;
                                }
                                .ring-outer {
                                  animation: bubble-outer 3s ease-in-out infinite;
                                }
                                .ring-middle {
                                  animation: bubble-middle 2s ease-in-out infinite 0.5s;
                                }
                                .ring-inner {
                                  animation: bubble-inner 1.5s ease-in-out infinite 1s;
                                }
                                @keyframes bubble-outer {
                                  0% {
                                    transform: scale(1);
                                    opacity: 0.6;
                                  }
                                  100% {
                                    transform: scale(1.6);
                                    opacity: 0;
                                  }
                                }
                                @keyframes bubble-middle {
                                  0% {
                                    transform: scale(1);
                                    opacity: 0.7;
                                  }
                                  100% {
                                    transform: scale(1.5);
                                    opacity: 0;
                                  }
                                }
                                @keyframes bubble-inner {
                                  0% {
                                    transform: scale(1);
                                    opacity: 0.8;
                                  }
                                  100% {
                                    transform: scale(1.4);
                                    opacity: 0;
                                  }
                                }
                                @keyframes breathe {
                                  0%, 100% {
                                    transform: scale(1);
                                  }
                                  50% {
                                    transform: scale(1.05);
                                  }
                                }
                                .main-button {
                                  position: absolute;
                                  width: 80px;
                                  height: 80px;
                                  border-radius: 50%;
                                  background: linear-gradient(135deg, #3B82F6, #2563EB);
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                                  animation: breathe 2.5s ease-in-out infinite;
                                }
                                .icon {
                                  width: 36px;
                                  height: 36px;
                                  color: white;
                                }
                              </style>
                            </head>
                            <body>
                              <div class="button-container">
                                <div class="ring ring-outer"></div>
                                <div class="ring ring-middle"></div>
                                <div class="ring ring-inner"></div>
                                <div class="main-button">
                                  <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                  </svg>
                                </div>
                              </div>
                            </body>
                            </html>
                          `,
                            }}
                            style={{
                              width: 140,
                              height: 140,
                              backgroundColor: "transparent",
                            }}
                            scrollEnabled={false}
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            pointerEvents="none"
                          />
                        </View>
                      ) : (
                        <View
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: "#374151",
                            alignItems: "center",
                            justifyContent: "center",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.5,
                            shadowRadius: 8,
                            elevation: 8,
                            alignSelf: "center",
                            marginTop: 8,
                          }}
                        >
                          <IconComponent
                            size={28}
                            color="#FFFFFF"
                            strokeWidth={2}
                          />
                        </View>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        marginTop: 4,
                        fontWeight: "500",
                        color: isFocused ? "#60A5FA" : "#9CA3AF",
                      }}
                    >
                      {tabInfo.name}
                    </Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  activeOpacity={0.7}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 60,
                  }}
                >
                  <IconComponent
                    size={24}
                    color={isFocused ? "#60A5FA" : "#D1D5DB"}
                    strokeWidth={isFocused ? 2.5 : 2}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      fontWeight: "500",
                      color: isFocused ? "#60A5FA" : "#9CA3AF",
                    }}
                  >
                    {tabInfo.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  function MainTabs() {
    return (
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tab.Screen name="Card">{() => <WalletScreen />}</Tab.Screen>
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Hotspot" component={HotspotStack} />
        <Tab.Screen name="Rewards">{() => <RewardsScreen />}</Tab.Screen>
        <Tab.Screen name="Profile">
          {() => <Card session={session!} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  function RootNavigator() {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainApp" component={MainTabs} />
          <RootStack.Screen
            name="BusinessDashboard"
            component={BusinessDashboard}
            options={{
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
            }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PortalProvider>
        <GluestackUIProvider config={config}>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
              {session?.user ? (
                showOnboarding ? (
                  <Onboarding
                    userId={session.user.id}
                    email={session.user.email || ""}
                    onComplete={() => setShowOnboarding(false)}
                  />
                ) : (
                  <RootNavigator />
                )
              ) : (
                <Auth />
              )}
            </SafeAreaView>
          </SafeAreaProvider>
        </GluestackUIProvider>
      </PortalProvider>
    </GestureHandlerRootView>
  );
}
