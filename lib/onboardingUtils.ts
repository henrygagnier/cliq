import { supabase } from "./supabase";

/**
 * Fetch user profile and onboarding status
 */
export async function getUserProfile(userId: string) {
  try {
    // Use maybeSingle to avoid an error when no rows are returned
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }

    // data will be null when no row exists for the user
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.onboarding_completed ?? false;
}

/**
 * Update user profile with onboarding data
 */
export async function updateUserProfile(
  userId: string,
  updates: Record<string, any>
) {
  try {
    const { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("Error updating profile:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected error:", error);
    return false;
  }
}

/**
 * Create initial user profile (called after signup)
 */
export async function createUserProfile(
  userId: string,
  email: string,
  data?: Partial<{
    full_name: string;
    role: string;
    interests: string[];
    goals: string[];
  }>
) {
  try {
    // Use upsert so this is idempotent if called multiple times
    const { error } = await supabase.from("user_profiles").upsert({
      id: userId,
      email,
      full_name: data?.full_name || "",
      role: data?.role || "",
      interests: data?.interests || [],
      goals: data?.goals || [],
      onboarding_completed: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating profile:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected error:", error);
    return false;
  }
}

/**
 * Get recommendations based on user interests and goals
 */
export function getRecommendations(
  interests: string[],
  goals: string[]
): string[] {
  const recommendations: string[] = [];

  // Technology + Learn -> Recommend courses
  if (interests.includes("technology") && goals.includes("learn")) {
    recommendations.push("Check out our tech courses");
  }

  // Business + Grow -> Recommend mentors
  if (interests.includes("business") && goals.includes("grow")) {
    recommendations.push("Connect with business mentors");
  }

  // Any interest + Network -> Recommend community
  if (goals.includes("network")) {
    recommendations.push("Join our community");
  }

  // Design + Collaborate -> Recommend projects
  if (interests.includes("design") && goals.includes("collaborate")) {
    recommendations.push("Explore design collaborations");
  }

  return recommendations;
}

/**
 * Format user profile data for display
 */
export function formatUserProfile(profile: any): string {
  const parts: string[] = [];

  if (profile.full_name) {
    parts.push(profile.full_name);
  }

  if (profile.role) {
    parts.push(`(${profile.role})`);
  }

  if (profile.interests?.length > 0) {
    parts.push(`Interested in: ${profile.interests.join(", ")}`);
  }

  if (profile.goals?.length > 0) {
    parts.push(`Goals: ${profile.goals.join(", ")}`);
  }

  return parts.join(" · ");
}
