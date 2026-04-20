// Minimum platform participation terms for creator onboarding.
// Version bump required whenever wording changes materially.
// The accepted_version column in creator_onboarding records which version
// was in force at the moment the creator clicked Accept.

export const ONBOARDING_TERMS_VERSION = "v1";

export type TermsSection = {
  heading: string;
  body: string;
};

export const ONBOARDING_INTRO =
  "You've been accepted into ShangoMaji. Before you can publish, read the platform terms below and confirm.";

export const ONBOARDING_TERMS: TermsSection[] = [
  {
    heading: "What ShangoMaji is",
    body:
      "ShangoMaji is a curated, creator-first distribution platform for culture-driven stories. It is not an open upload free-for-all. Every title on the platform is personally reviewed and activated for distribution by the editorial team.",
  },
  {
    heading: "What you keep",
    body:
      "You retain ownership of the content you create. Your work is your work. Acceptance of these terms does not transfer copyright or underlying rights to ShangoMaji.",
  },
  {
    heading: "What ShangoMaji controls",
    body:
      "While your title is active on the platform, ShangoMaji controls its distribution position, curation and editorial surfacing, moderation, and decisions made in the interest of platform integrity. Editorial decisions are final.",
  },
  {
    heading: "Removal is not casual",
    body:
      "Once a title is live, it cannot be instantly deleted. Removal requires a formal request and editorial review. This protects the platform, the audience, and other creators who depend on a stable catalog.",
  },
  {
    heading: "First-conversation expectation",
    body:
      "If outside interest in your title emerges — distribution, licensing, adaptation, or commercial partnerships — ShangoMaji expects the first conversation. This is a platform relationship, not a one-sided hosting arrangement.",
  },
  {
    heading: "Future distribution structure",
    body:
      "Monetization and distribution structure on the platform may be platform-mediated and will be communicated clearly as it is rolled out. Participation in future platform-mediated structures is part of being an active ShangoMaji creator.",
  },
  {
    heading: "Participation rules",
    body:
      "Creators are expected to act in good faith toward the platform, the audience, and other creators. Conduct that undermines platform integrity is grounds for review and, if necessary, removal of privileges.",
  },
];
