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
import { colors } from "../styles/colors";

interface SignInProps {
  onNavigateToSignUp: () => void;
}

export default function SignIn({ onNavigateToSignUp }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert("Sign In Failed", error.message);
    }
    setLoading(false);
  }

  return (
    <Box style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VStack style={styles.content}>
          <Text style={styles.title}>Sign In</Text>

          <VStack style={styles.form}>
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

            <VStack style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <HStack style={styles.passwordRow}>
                <Input flex={1} style={styles.inputWrapper}>
                  <InputField
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    style={styles.inputField}
                  />
                </Input>
                {/*<Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.togglePassword}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>*/}
              </HStack>
            </VStack>

            <TouchableOpacity
              onPress={signInWithEmail}
              disabled={loading}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            <Pressable
              onPress={onNavigateToSignUp}
              disabled={loading}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>
                Don't have an account?{" "}
                <Text style={styles.linkBold}>Sign Up</Text>
              </Text>
            </Pressable>
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 32,
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: colors.black,
    marginBottom: 6,
  },
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
  passwordRow: {
    alignItems: "center",
  },
  togglePassword: {
    fontSize: 14,
    color: colors.gray[400],
    paddingLeft: 12,
  },
  button: {
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: colors.gray[600],
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.white,
  },
  linkContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    fontSize: 16,
    color: colors.gray[400],
  },
  linkBold: {
    fontWeight: "700",
    color: colors.primary[600],
  },
});
