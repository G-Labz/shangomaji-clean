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
  "You've been accepted to ShangoMaji. Read the terms below and accept to continue.";

export const ONBOARDING_TERMS: TermsSection[] = [
  {
    heading: "What ShangoMaji is",
    body:
      "ShangoMaji is a curated service for culture-driven stories. It is not an open-upload service. Every title is editorially reviewed before it goes live.",
  },
  {
    heading: "What you keep",
    body:
      "You retain full ownership of the work you create. Accepting these terms does not transfer copyright or any underlying rights to ShangoMaji.",
  },
  {
    heading: "What ShangoMaji controls",
    body:
      "While your title is active on ShangoMaji, we control distribution, curation, editorial placement, and moderation. Decisions made in the interest of editorial integrity are final.",
  },
  {
    heading: "Removal is not casual",
    body:
      "Once a title is live, it cannot be instantly removed. Takedown requires a formal request and editorial review. This protects the catalog, the audience, and the creators who depend on it.",
  },
  {
    heading: "First-conversation expectation",
    body:
      "If outside interest in your title emerges, whether distribution, licensing, or adaptation, ShangoMaji expects the first conversation. This is a mutual relationship.",
  },
  {
    heading: "Future distribution structure",
    body:
      "Revenue and distribution models will evolve. Changes will be communicated clearly before they take effect. Participation in those structures is part of being an active creator on ShangoMaji.",
  },
  {
    heading: "Participation rules",
    body:
      "Creators are expected to act in good faith toward ShangoMaji, the audience, and each other. Conduct that undermines editorial integrity is grounds for review and possible removal.",
  },
];
