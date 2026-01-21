// Cleaned & normalized Sign Up UI
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputField,
  Pressable,
} from "@gluestack-ui/themed";
import { supabase } from "../lib/supabase";
import { createUserProfile } from "../lib/onboardingUtils";
import Onboarding from "./Onboarding";
import { colors } from "../styles/colors";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
} from "@gluestack-ui/themed";
import { CheckIcon } from "@gluestack-ui/themed";

interface SignUpProps {
  onNavigateToSignIn: () => void;
}

export default function SignUp({ onNavigateToSignIn }: SignUpProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);

  const isPasswordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const isFormValid =
    email && isPasswordValid && passwordsMatch && agreedToTerms;

  async function signUpWithEmail() {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!isPasswordValid) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    if (!passwordsMatch) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (!agreedToTerms) {
      Alert.alert("Error", "Please agree to the terms and conditions");
      return;
    }

    setLoading(true);

    const res = await supabase.auth.signUp({ email: email.trim(), password });
    const user = (res as any)?.data?.user;
    const session = (res as any)?.data?.session;
    const error = (res as any)?.error;

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
      setLoading(false);
      return;
    }

    if (user) {
      setNewUserId(user.id);
      if (session) {
        try {
          await createUserProfile(user.id, email.trim());
        } catch (e) {
          console.warn("createUserProfile failed:", e);
        }
      }
      setSignUpSuccess(true);
      setLoading(false);
      return;
    }

    Alert.alert(
      "Verification Required",
      "Please check your inbox for email verification!"
    );
    setLoading(false);
  }

  if (signUpSuccess && newUserId) {
    return (
      <Onboarding
        userId={newUserId}
        email={email}
        onComplete={() => {
          Alert.alert("Success!", "Your profile has been created.", [
            { text: "OK", onPress: onNavigateToSignIn },
          ]);
        }}
      />
    );
  }

  return (
    <Box style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VStack style={styles.content}>
          <Text style={styles.title}>Sign Up</Text>

          <VStack>
            {/* Email */}
            <VStack style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <Input style={styles.inputWrapper}>
                <InputField
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  style={styles.inputField}
                />
              </Input>
            </VStack>

            {/* Password */}
            <VStack style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <HStack style={styles.passwordRow}>
                <Input flex={1} style={styles.inputWrapper}>
                  <InputField
                    placeholder="At least 8 characters"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                    style={styles.inputField}
                  />
                </Input>
                {/*<Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.toggleText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>*/}
              </HStack>
              {password ? (
                <Text
                  style={[
                    styles.validationText,
                    isPasswordValid ? styles.success : styles.error,
                  ]}
                >
                  {isPasswordValid ? "Valid" : "Too short"}
                </Text>
              ) : null}
            </VStack>

            {/* Confirm Password */}
            <VStack style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <HStack style={styles.passwordRow}>
                <Input flex={1} style={styles.inputWrapper}>
                  <InputField
                    placeholder="Confirm password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                    style={styles.inputField}
                  />
                </Input>
                {/*<Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.toggleText}>
                    {showConfirmPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>*/}
              </HStack>
              {confirmPassword ? (
                <Text
                  style={[
                    styles.validationText,
                    passwordsMatch ? styles.success : styles.error,
                  ]}
                >
                  {passwordsMatch ? "Match" : "Don't match"}
                </Text>
              ) : null}
            </VStack>

            {/* Terms */}
            <HStack style={styles.checkboxRow}>
              <Checkbox
                value={agreedToTerms.toString()}
                isChecked={agreedToTerms}
                onChange={() => setAgreedToTerms(!agreedToTerms)}
                size="md"
              >
                <CheckboxIndicator
                  bg={agreedToTerms ? colors.primary[600] : "transparent"}
                  borderColor="#d1d1d1" // ← light outline like inputs
                  borderWidth={1.5}
                  rounded={6} // ← soft, modern corner radius
                  padding={1}
                  style={{
                    width: 22,
                    height: 22,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CheckboxIcon as={CheckIcon} color={colors.white} />
                </CheckboxIndicator>
              </Checkbox>

              <Text style={styles.checkboxLabel}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </HStack>

            {/* Button */}
            <TouchableOpacity
              onPress={signUpWithEmail}
              disabled={!isFormValid || loading}
              style={[
                styles.button,
                (!isFormValid || loading) && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>

            {/* Navigate */}
            <Pressable
              onPress={onNavigateToSignIn}
              disabled={loading}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>
                Already have an account?{" "}
                <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </Pressable>
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40 },
  content: { flex: 1 },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 32,
    textAlign: "center",
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, color: colors.black, marginBottom: 6 },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
  },
  inputField: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: colors.black,
  },
  passwordRow: { alignItems: "center" },
  toggleText: { fontSize: 14, color: colors.gray[400], paddingLeft: 12 },
  validationText: { fontSize: 12, marginTop: 4 },
  success: { color: colors.black },
  error: { color: "#C00" },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  checkbox: { fontSize: 16, marginRight: 8, color: colors.black },
  checkboxLabel: {
    fontSize: 14,
    color: colors.gray[400],
    flex: 1,
    marginLeft: 8,
  },
  button: {
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: colors.gray[600] },
  buttonText: { fontSize: 18, color: colors.white, fontWeight: "600" },
  linkContainer: { marginTop: 20, alignItems: "center" },
  linkText: { fontSize: 16, color: colors.gray[400] },
  linkBold: { fontWeight: "700", color: colors.primary[600] },
});
