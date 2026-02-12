// Example: How to integrate Business Dashboard into your App.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BusinessDashboard } from './components/business';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Add this function to check if user is a business owner
const useBusinessOwnerCheck = (session: any) => {
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setIsBusinessOwner(false);
      setLoading(false);
      return;
    }

    const checkBusinessProfile = async () => {
      try {
        const { data } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        setIsBusinessOwner(!!data);
      } catch (error) {
        setIsBusinessOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkBusinessProfile();
  }, [session]);

  return { isBusinessOwner, loading };
};

// ==========================================
// OPTION 1: Add Business Dashboard to Profile Stack
// ==========================================

// Modify your existing ProfileStack or create a new one:
function ProfileStack({ session }: { session: any }) {
  const Stack = createNativeStackNavigator();
  const { isBusinessOwner } = useBusinessOwnerCheck(session);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain">
        {() => <Card session={session} />}
      </Stack.Screen>
      
      {/* Add Business Dashboard as a screen in the profile stack */}
      {isBusinessOwner && (
        <Stack.Screen 
          name="BusinessDashboard" 
          component={BusinessDashboard}
        />
      )}
    </Stack.Navigator>
  );
}

// Then in your Card/Account component, add a button to navigate:
// In components/Account.tsx:
/*
import { useNavigation } from '@react-navigation/native';

// Inside your Account component:
const navigation = useNavigation();
const { isBusinessOwner } = useBusinessOwnerCheck(session);

// Add this button in your profile UI:
{isBusinessOwner && (
  <TouchableOpacity 
    onPress={() => navigation.navigate('BusinessDashboard')}
    className="bg-gradient-to-r from-cyan-500 to-blue-500 p-4 rounded-xl"
  >
    <Text className="text-white font-bold text-center">
      Go to Business Dashboard
    </Text>
  </TouchableOpacity>
)}
*/

// ==========================================
// OPTION 2: Replace Profile Tab with Business Dashboard for Business Owners
// ==========================================

// Modify your MainTabs function in App.tsx:
function MainTabsWithBusiness() {
  const { isBusinessOwner } = useBusinessOwnerCheck(session);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tab.Screen name="Card">{() => <WalletScreen />}</Tab.Screen>
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Hotspot" component={HotspotStack} />
        <Tab.Screen name="Rewards">
          {() => <RewardsScreen />}
        </Tab.Screen>
        
        {/* Conditionally show Business Dashboard or Profile */}
        <Tab.Screen name="Profile">
          {() => 
            isBusinessOwner ? (
              <BusinessDashboard />
            ) : (
              <Card session={session!} />
            )
          }
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ==========================================
// OPTION 3: Add Business Dashboard as a 6th Tab (for business owners only)
// ==========================================

// Modify your CustomTabBar to conditionally show business tab:
function CustomTabBarWithBusiness({ state, descriptors, navigation }: any) {
  const { isBusinessOwner } = useBusinessOwnerCheck(session);
  
  const tabs = [
    { name: "Wallet", Icon: Wallet, route: "Card" },
    { name: "Discover", Icon: MapPin, route: "Home" },
    { name: "Live Hotspot", Icon: Radio, route: "Hotspot" },
    { name: "Rewards", Icon: Gem, route: "Rewards" },
    { name: "Profile", Icon: User, route: "Profile" },
    // Add business tab only for business owners
    ...(isBusinessOwner ? [{ name: "Business", Icon: Briefcase, route: "Business" }] : []),
  ];

  // Rest of CustomTabBar code...
}

// Then add Business screen to MainTabs:
function MainTabsWithBusinessTab() {
  const { isBusinessOwner } = useBusinessOwnerCheck(session);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBarWithBusiness {...props} />}
      >
        <Tab.Screen name="Card">{() => <WalletScreen />}</Tab.Screen>
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Hotspot" component={HotspotStack} />
        <Tab.Screen name="Rewards">{() => <RewardsScreen />}</Tab.Screen>
        <Tab.Screen name="Profile">{() => <Card session={session!} />}</Tab.Screen>
        
        {/* Add Business tab */}
        {isBusinessOwner && (
          <Tab.Screen name="Business">
            {() => <BusinessDashboard />}
          </Tab.Screen>
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ==========================================
// OPTION 4: Modal Presentation (Recommended for simplicity)
// ==========================================

// Add BusinessDashboard as a modal in your root navigator:
// In your App.tsx, add a root stack navigator:

const RootStack = createNativeStackNavigator();

function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {/* Your main tabs */}
      <RootStack.Screen name="MainApp" component={MainTabs} />
      
      {/* Business Dashboard as a modal */}
      <RootStack.Screen 
        name="BusinessDashboard" 
        component={BusinessDashboard}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </RootStack.Navigator>
  );
}

// Then navigate from anywhere in your app:
// navigation.navigate('BusinessDashboard');

// ==========================================
// COMPLETE EXAMPLE: Modified App.tsx
// ==========================================

/*
import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";
import Card from "./components/Account";
import WalletScreen from "./components/wallet/WalletScreen";
import { BusinessDashboard } from "./components/business";
import { getUserProfile } from "./lib/onboardingUtils";
import { Session } from "@supabase/supabase-js";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Briefcase } from "lucide-react-native"; // Add this import
// ... rest of imports

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  
  // ... existing useEffect hooks

  // Add business owner check
  useEffect(() => {
    if (!session?.user) {
      setIsBusinessOwner(false);
      return;
    }

    const checkBusinessProfile = async () => {
      try {
        const { data } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        setIsBusinessOwner(!!data);
      } catch (error) {
        setIsBusinessOwner(false);
      }
    };

    checkBusinessProfile();
  }, [session]);

  // ... existing functions (HomeStack, HotspotStack, CustomTabBar)

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
          {() => <Card session={session!} isBusinessOwner={isBusinessOwner} />}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  function RootNavigator() {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainApp" component={MainTabs} />
        <RootStack.Screen 
          name="BusinessDashboard" 
          component={BusinessDashboard}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
      </RootStack.Navigator>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PortalProvider>
        <GluestackUIProvider config={config}>
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }}>
              {session?.user ? (
                showOnboarding ? (
                  <Onboarding
                    userId={session.user.id}
                    email={session.user.email || ""}
                    onComplete={() => setShowOnboarding(false)}
                  />
                ) : (
                  <NavigationContainer>
                    <RootNavigator />
                  </NavigationContainer>
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
*/

// ==========================================
// In components/Account.tsx, add a button:
// ==========================================

/*
import { useNavigation } from '@react-navigation/native';
import { Briefcase } from 'lucide-react-native';

export default function Card({ session, isBusinessOwner }: any) {
  const navigation = useNavigation();

  return (
    <View>
      // ... existing profile UI

      {isBusinessOwner && (
        <TouchableOpacity 
          onPress={() => navigation.navigate('BusinessDashboard')}
          className="mx-6 mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 p-4 rounded-xl flex-row items-center justify-center"
          activeOpacity={0.8}
        >
          <Briefcase size={20} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white font-bold text-center">
            Business Dashboard
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
*/

export { useBusinessOwnerCheck };
