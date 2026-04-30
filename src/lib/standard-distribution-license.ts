// Standard Distribution License v1 — single source of truth.
// Any change to wording must bump SDL_VERSION. Existing executed rows
// reference the version that was in effect at the moment they signed.

export const SDL_VERSION = "SDL-v1";
export const SDL_TITLE   = "Standard Distribution License v1";

export type AckKey =
  | "ip_ownership_ack"
  | "distribution_grant_ack"
  | "no_unilateral_removal_ack"
  | "catalog_control_ack"
  | "rofn_ack"
  | "downstream_ack"
  | "authority_ack";

export type SDLSection = {
  heading: string;
  body: string;
};

export type SDLAck = {
  key: AckKey;
  label: string;
};

export const SDL_TERM_YEARS = [1, 2, 3, 5] as const;
export type SDLTermYears = typeof SDL_TERM_YEARS[number];

export function isValidTermYears(n: unknown): n is SDLTermYears {
  return typeof n === "number" && (SDL_TERM_YEARS as readonly number[]).includes(n);
}

export const SDL_SECTIONS: SDLSection[] = [
  {
    heading: "1. Ownership",
    body:
      "You retain full ownership of the work covered by this license. " +
      "Nothing in this agreement transfers copyright or any underlying rights to ShangoMaji.",
  },
  {
    heading: "2. Distribution Rights Granted",
    body:
      "You grant ShangoMaji the right to distribute, present, and promote this work " +
      "for the term you select below. The grant is non-transferable outside ShangoMaji's " +
      "operational control and exists solely for the purpose of catalog distribution.",
  },
  {
    heading: "3. Term",
    body:
      "The term is one of 1, 2, 3, or 5 years. You select the term at execution; " +
      "ShangoMaji does not select it for you. There is no default term.",
  },
  {
    heading: "4. Term Start",
    body:
      "The term begins on the date ShangoMaji activates distribution of this work, " +
      "not on the date you sign. Until activation, no term is running. " +
      "Once activated, the term end date is fixed.",
  },
  {
    heading: "5. No Unilateral Removal",
    body:
      "Once distribution is active, you may not unilaterally remove the work from the " +
      "ShangoMaji catalog during the active term. Removal requires a formal request and " +
      "editorial review. This protects the catalog, the audience, and other creators.",
  },
  {
    heading: "6. Catalog Control",
    body:
      "ShangoMaji controls catalog placement, visibility, presentation, scheduling, " +
      "moderation, and curatorial framing of the work for the duration of the term. " +
      "Editorial decisions made in the interest of the catalog are final.",
  },
  {
    heading: "7. First Conversation / Right of First Negotiation",
    body:
      "If outside interest in this work emerges during the term — distribution, licensing, " +
      "adaptation, or related opportunities — ShangoMaji expects the first conversation. " +
      "This is a mutual relationship and outside engagements should not bypass it.",
  },
  {
    heading: "8. Downstream Opportunity Participation",
    body:
      "Downstream opportunities that arise from or are materially enabled by ShangoMaji's " +
      "distribution of this work involve ShangoMaji as a participating party. Specific " +
      "structures will be communicated clearly before they take effect.",
  },
  {
    heading: "9. Authority and Warranty",
    body:
      "You confirm that you hold, or are authorized to grant, all rights necessary to " +
      "execute this license for this work, and that doing so does not infringe any " +
      "third party's rights.",
  },
];

// The seven on-screen acknowledgments. Each one maps directly to a boolean
// column on creator_licenses. All seven must be true for an executed license.
//
// Note on coverage: SDL section 4 ("the term begins at activation") is bundled
// into ack #2 here — the wording explicitly states the activation-start. This
// keeps the database surface at exactly seven ack columns without losing
// semantic coverage of any section.
export const SDL_ACKS: SDLAck[] = [
  {
    key:   "ip_ownership_ack",
    label: "I retain ownership of this work.",
  },
  {
    key:   "distribution_grant_ack",
    label:
      "I grant ShangoMaji time-bound distribution rights for the selected term, " +
      "and I understand the term begins when distribution is activated.",
  },
  {
    key:   "no_unilateral_removal_ack",
    label: "I understand this work cannot be removed unilaterally during the active term.",
  },
  {
    key:   "catalog_control_ack",
    label: "I understand ShangoMaji controls catalog placement, visibility, and presentation.",
  },
  {
    key:   "rofn_ack",
    label:
      "I agree to ShangoMaji's first-conversation / right-of-first-negotiation expectation " +
      "for outside opportunities related to this work.",
  },
  {
    key:   "downstream_ack",
    label:
      "I agree that downstream opportunities materially enabled by ShangoMaji's distribution " +
      "of this work involve ShangoMaji participation.",
  },
  {
    key:   "authority_ack",
    label: "I confirm I have authority to execute this license for this work.",
  },
];
