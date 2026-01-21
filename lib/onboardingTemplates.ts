/**
 * Onboarding Question Templates
 *
 * Use these templates to create custom onboarding flows for different scenarios
 */

export const defaultOnboardingQuestions = [
  {
    id: "fullName",
    title: "What's your name?",
    subtitle: "Help us personalize your experience",
    icon: "user",
    type: "text" as const,
    placeholder: "Enter your full name",
  },
  {
    id: "role",
    title: "What's your role?",
    subtitle: "Tell us what you do",
    icon: "briefcase",
    type: "single" as const,
    options: [
      { label: "Student", value: "student", icon: "graduation-cap" },
      {
        label: "Professional",
        value: "professional",
        icon: "briefcase",
      },
      { label: "Entrepreneur", value: "entrepreneur", icon: "rocket" },
      { label: "Other", value: "other", icon: "question-circle" },
    ],
  },
  {
    id: "interests",
    title: "What are your interests?",
    subtitle: "Select topics you care about",
    icon: "heart",
    type: "multiselect" as const,
    options: [
      { label: "Technology", value: "technology", icon: "laptop" },
      { label: "Business", value: "business", icon: "chart-line" },
      { label: "Design", value: "design", icon: "paint-brush" },
      { label: "Marketing", value: "marketing", icon: "bullhorn" },
      { label: "Education", value: "education", icon: "book" },
      { label: "Health", value: "health", icon: "heart" },
    ],
  },
  {
    id: "goals",
    title: "What are your goals?",
    subtitle: "What do you want to achieve?",
    icon: "bullseye",
    type: "multiselect" as const,
    options: [
      { label: "Learn", value: "learn", icon: "lightbulb" },
      { label: "Network", value: "network", icon: "users" },
      { label: "Collaborate", value: "collaborate", icon: "handshake" },
      { label: "Grow", value: "grow", icon: "chart-line" },
    ],
  },
];

export const techOnboardingQuestions = [
  {
    id: "fullName",
    title: "What's your name?",
    subtitle: "We'd love to know!",
    icon: "person-circle-outline",
    type: "text" as const,
    placeholder: "Enter your name",
  },
  {
    id: "experience",
    title: "What's your tech experience?",
    subtitle: "Help us match your level",
    icon: "code-outline",
    type: "single" as const,
    options: [
      { label: "Beginner", value: "beginner", icon: "bulb-outline" },
      {
        label: "Intermediate",
        value: "intermediate",
        icon: "trending-up-outline",
      },
      { label: "Advanced", value: "advanced", icon: "rocket-outline" },
      { label: "Expert", value: "expert", icon: "star-outline" },
    ],
  },
  {
    id: "specialties",
    title: "What's your specialty?",
    subtitle: "Select all that apply",
    icon: "hammer-outline",
    type: "multiselect" as const,
    options: [
      { label: "Frontend", value: "frontend", icon: "phone-portrait-outline" },
      { label: "Backend", value: "backend", icon: "server-outline" },
      { label: "Full Stack", value: "fullstack", icon: "layers-outline" },
      { label: "DevOps", value: "devops", icon: "git-branch-outline" },
      { label: "Mobile", value: "mobile", icon: "phone-outline" },
      { label: "AI/ML", value: "aiml", icon: "sparkles-outline" },
    ],
  },
];

export const businessOnboardingQuestions = [
  {
    id: "fullName",
    title: "What's your name?",
    subtitle: "Nice to meet you!",
    icon: "person-circle-outline",
    type: "text" as const,
    placeholder: "Your full name",
  },
  {
    id: "companySize",
    title: "What size is your company?",
    subtitle: "This helps us tailor recommendations",
    icon: "business-outline",
    type: "single" as const,
    options: [
      { label: "Solo", value: "solo", icon: "person-outline" },
      { label: "1-10 people", value: "small", icon: "people-outline" },
      { label: "11-50 people", value: "medium", icon: "people-circle-outline" },
      { label: "50+ people", value: "large", icon: "business-outline" },
    ],
  },
  {
    id: "industry",
    title: "What industry are you in?",
    subtitle: "Help us understand your business",
    icon: "briefcase-outline",
    type: "multiselect" as const,
    options: [
      { label: "Tech", value: "tech", icon: "code-outline" },
      { label: "Finance", value: "finance", icon: "cash-outline" },
      { label: "Healthcare", value: "healthcare", icon: "fitness-outline" },
      { label: "Retail", value: "retail", icon: "cart-outline" },
      {
        label: "Manufacturing",
        value: "manufacturing",
        icon: "hammer-outline",
      },
      { label: "Services", value: "services", icon: "briefcase-outline" },
    ],
  },
];

export const creatorsOnboardingQuestions = [
  {
    id: "fullName",
    title: "What's your name?",
    subtitle: "We can't wait to follow your journey!",
    icon: "person-circle-outline",
    type: "text" as const,
    placeholder: "Your creative name",
  },
  {
    id: "creativeField",
    title: "What do you create?",
    subtitle: "Select your primary focus",
    icon: "palette-outline",
    type: "single" as const,
    options: [
      { label: "Visual Art", value: "art", icon: "palette-outline" },
      { label: "Music", value: "music", icon: "musical-notes-outline" },
      { label: "Writing", value: "writing", icon: "document-outline" },
      { label: "Video", value: "video", icon: "videocam-outline" },
      { label: "Photography", value: "photography", icon: "camera-outline" },
      { label: "Other", value: "other", icon: "sparkles-outline" },
    ],
  },
  {
    id: "platforms",
    title: "Where do you share your work?",
    subtitle: "Help us connect you with opportunities",
    icon: "share-social-outline",
    type: "multiselect" as const,
    options: [
      { label: "Instagram", value: "instagram", icon: "logo-instagram" },
      { label: "TikTok", value: "tiktok", icon: "logo-tiktok" },
      { label: "YouTube", value: "youtube", icon: "logo-youtube" },
      { label: "Portfolio", value: "portfolio", icon: "globe-outline" },
      { label: "Twitter", value: "twitter", icon: "logo-twitter" },
      { label: "LinkedIn", value: "linkedin", icon: "logo-linkedin" },
    ],
  },
];
