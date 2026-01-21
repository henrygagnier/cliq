import React, { useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import SignIn from "./SignIn";
import SignUp from "./SignUp";

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  const [screen, setScreen] = useState<"signin" | "signup">("signin");

  return screen === "signin" ? (
    <SignIn onNavigateToSignUp={() => setScreen("signup")} />
  ) : (
    <SignUp onNavigateToSignIn={() => setScreen("signin")} />
  );
}
