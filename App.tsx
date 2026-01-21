import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";
import Card from "./components/Account";
import { getUserProfile } from "./lib/onboardingUtils";
import { Session } from "@supabase/supabase-js";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "@gluestack-ui/config";
import { SafeAreaView, View, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Rewards from "./components/Rewards";
import Home from "./components/Home";
import HotspotDetailScreen from "./components/HotspotDetailScreen";
import CategoryPageScreen from "./components/CategoryPage";
import { PortalProvider } from "@gorhom/portal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaProvider } from "react-native-safe-area-context";  
import { StatusBar } from "expo-status-bar";
import { RewardsScreen } from "./components/RewardsScreen";
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
      }
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
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Stack.Screen
          name="Category"
          component={CategoryPageScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  function CustomTabBar({ state, descriptors, navigation }) {
    const insets = useSafeAreaInsets();

    return (
      <View
        style={{
          flexDirection: "row",
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: "#0B0B0B",
          borderTopWidth: 1,
          borderTopColor: "#1F1F1F",
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

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

          let iconName: any = "circle";
          if (route.name === "Home") iconName = "map-location-dot";
          if (route.name === "Card") iconName = "id-card";
          if (route.name === "Rewards") iconName = "gem";
          if (route.name === "Leaderboard") iconName = "star";

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome6
                name={iconName}
                size={24}
                color={isFocused ? "#FFFFFF" : "#7A7A7A"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function MainTabs() {
    return (
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <CustomTabBar {...props} />}
        >
          <Tab.Screen name="Home" component={HomeStack} />
          <Tab.Screen name="Card">
            {() => <Card session={session!} />}
          </Tab.Screen>
          <Tab.Screen name="Rewards">
            {() => <RewardsScreen session={session!} />}
          </Tab.Screen>
          <Tab.Screen name="Leaderboard" component={Rewards} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PortalProvider>
        <GluestackUIProvider config={config}>
          <SafeAreaProvider>
          
          <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            {session?.user ? (
              showOnboarding ? (
                <Onboarding
                  userId={session.user.id}
                  email={session.user.email || ""}
                  onComplete={() => setShowOnboarding(false)}
                />
              ) : (
                <MainTabs />
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
