import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { Mail, X } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { createUserProfile } from "../../lib/onboardingUtils";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${Linking.createURL("")}auth/callback`,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          `${Linking.createURL("")}auth/callback`,
        );

        if (result.type === "success" && result.url) {
          // Extract the URL params
          const url = new URL(result.url);
          const accessToken = url.searchParams.get("access_token");
          const refreshToken = url.searchParams.get("refresh_token");

          // Also check hash params (Supabase sometimes uses hash)
          if (result.url.includes("#")) {
            const hashParams = new URLSearchParams(result.url.split("#")[1]);
            const hashAccessToken = hashParams.get("access_token");
            const hashRefreshToken = hashParams.get("refresh_token");

            if (hashAccessToken && hashRefreshToken) {
              await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
              });
              onContinue();
              return;
            }
          }

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            onContinue();
          }
        }
      }
    } catch (error: any) {
      console.error("Google sign in error:", error);
      Alert.alert("Error", error.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    setIsSignUp(false);
    setShowEmailModal(true);
  };

  const handleEmailSignUp = () => {
    setIsSignUp(true);
    setShowEmailModal(true);
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (isSignUp) {
      if (!confirmPassword) {
        Alert.alert("Error", "Please confirm your password");
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }
      if (password.length < 8) {
        Alert.alert("Error", "Password must be at least 8 characters");
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        if (data.user) {
          // Create user profile
          try {
            await createUserProfile(data.user.id, email.trim());
          } catch (e) {
            console.warn("createUserProfile failed:", e);
          }

          setShowEmailModal(false);
          onContinue();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        setShowEmailModal(false);
        onContinue();
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || `Failed to ${isSignUp ? "sign up" : "sign in"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section - Takes up most of the screen */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            {/* Logo Image */}
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              Connect seamlessly, share instantly
            </Text>
          </View>
        </View>

        {/* CTA Section - Smaller and at bottom */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Sign up or log in</Text>

          {/* Social Login Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              style={styles.googleButton}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEmailSignUp}
              style={styles.emailButton}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Mail width={20} height={20} color="#FFFFFF" />
              <Text style={styles.emailButtonText}>Continue with Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleEmailSignIn}
              style={styles.textButton}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.textButtonText}>
                Already have an account?{" "}
                <Text style={styles.textButtonBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Email Auth Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowEmailModal(false)}
            style={styles.modalBackdrop}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowEmailModal(false)}
                style={styles.closeButton}
              >
                <X width={24} height={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalForm}
              contentContainerStyle={styles.modalFormContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#6B7280"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  autoComplete="off"
                  textContentType="oneTimeCode"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    isSignUp
                      ? "Create password (min 8 characters)"
                      : "Enter your password"
                  }
                  placeholderTextColor="#6B7280"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                  autoComplete="off"
                  textContentType="oneTimeCode"
                  autoCorrect={false}
                />
              </View>

              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#6B7280"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                    autoComplete="off"
                    textContentType="oneTimeCode"
                    autoCorrect={false}
                  />
                </View>
              )}

              <TouchableOpacity
                onPress={handleEmailAuth}
                style={[
                  styles.modalButton,
                  loading && styles.modalButtonDisabled,
                ]}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSignUp(!isSignUp)}
                style={styles.switchAuthButton}
                disabled={loading}
              >
                <Text style={styles.switchAuthText}>
                  {isSignUp
                    ? "Already have an account? "
                    : "Don't have an account? "}
                  <Text style={styles.switchAuthBold}>
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  logoSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoImage: {
    maxWidth: 300,
    maxHeight: 300,
    marginBottom: 24,
  },
  tagline: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "300",
    textAlign: "center",
    maxWidth: 280,
  },
  ctaSection: {
    paddingBottom: 16,
  },
  ctaTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  buttonContainer: {
    maxWidth: 320,
    alignSelf: "center",
    width: "100%",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285F4",
  },
  googleButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "500",
  },
  emailButton: {
    backgroundColor: "#2C2C2E",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A3A3C",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 10,
  },
  textButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  textButtonText: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  textButtonBold: {
    color: "#D4AF37",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: "75%",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2E",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    flex: 1,
  },
  modalFormContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#3A3A3C",
  },
  modalButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  switchAuthButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  switchAuthText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  switchAuthBold: {
    color: "#D4AF37",
    fontWeight: "600",
  },
});
