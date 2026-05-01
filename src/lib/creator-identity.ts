// Creator identity validators — shared between the application form (client),
// the apply API (server), and downstream consumers (license prefill, profile
// hydration). Client-side use is for UX only; the apply route re-runs every
// validator before insert. Reject anything that does not pass.

const NAME_PLACEHOLDERS = new Set([
  "test", "tester", "testing",
  "none", "n/a", "na",
  "asdf", "qwerty",
  "fake", "anonymous", "anon",
  "first", "last", "firstname", "lastname",
  "name", "fullname", "full name",
  "user", "creator", "applicant",
  "x", "xx", "xxx",
]);

const CITY_PLACEHOLDERS = new Set([
  "test", "none", "n/a", "na", "asdf", "qwerty",
  "fake", "anywhere", "everywhere", "earth", "world",
  "internet", "online", "web", "cyberspace",
  "city", "town", "village", "somewhere", "nowhere",
]);

const REGION_PLACEHOLDERS = CITY_PLACEHOLDERS;

// Allowed characters in a name part: letters (incl. accented), space inside a
// part is not allowed (parts are split on whitespace by callers when needed),
// hyphen, apostrophe, period (e.g. "St."). Constructed via `new RegExp` so the
// unicode flag works regardless of the inferred TS regex-flag target.
const NAME_PART_REGEX = new RegExp("^[\\p{L}][\\p{L}'.\\-’]*$", "u");

// Allowed characters for a city / region: letters (incl. accented), spaces,
// hyphens, apostrophes, periods, commas. Numeric-only is rejected.
const LOCATION_REGEX  = new RegExp("^[\\p{L}][\\p{L} '.\\-’,]*$", "u");

export type FieldError = { field: string; message: string };

function clean(s: unknown): string {
  return typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "";
}

export function validateNamePart(
  raw: unknown,
  fieldLabel: "first_name" | "last_name"
): { ok: true; value: string } | { ok: false; error: FieldError } {
  const value = clean(raw);
  const human = fieldLabel === "first_name" ? "first" : "last";

  if (value.length < 2) {
    return {
      ok: false,
      error: {
        field:   fieldLabel,
        message: `Enter your real legal ${human} name (at least 2 characters).`,
      },
    };
  }

  if (NAME_PLACEHOLDERS.has(value.toLowerCase())) {
    return {
      ok: false,
      error: {
        field:   fieldLabel,
        message: `Enter your real legal ${human} name.`,
      },
    };
  }

  // A name *part* should not itself contain whitespace. ("Mary Anne" is valid
  // for first_name as a single field — we accept internal whitespace only if
  // every space-separated chunk passes the part regex.)
  for (const chunk of value.split(" ")) {
    if (!NAME_PART_REGEX.test(chunk)) {
      return {
        ok: false,
        error: {
          field:   fieldLabel,
          message: `${human === "first" ? "First" : "Last"} name uses unsupported characters.`,
        },
      };
    }
  }

  return { ok: true, value };
}

export function validateCity(
  raw: unknown
): { ok: true; value: string } | { ok: false; error: FieldError } {
  const value = clean(raw);

  if (value.length < 2) {
    return {
      ok: false,
      error: { field: "city", message: "City is required (at least 2 characters)." },
    };
  }

  if (/^\d+$/.test(value)) {
    return {
      ok: false,
      error: { field: "city", message: "City cannot be numeric only." },
    };
  }

  if (CITY_PLACEHOLDERS.has(value.toLowerCase())) {
    return {
      ok: false,
      error: { field: "city", message: "Enter a real city." },
    };
  }

  if (!LOCATION_REGEX.test(value)) {
    return {
      ok: false,
      error: { field: "city", message: "City uses unsupported characters." },
    };
  }

  return { ok: true, value };
}

export function validateRegion(
  raw: unknown
): { ok: true; value: string } | { ok: false; error: FieldError } {
  const value = clean(raw);

  if (value.length < 2) {
    return {
      ok: false,
      error: {
        field:   "region",
        message: "State, province, or region is required.",
      },
    };
  }

  if (REGION_PLACEHOLDERS.has(value.toLowerCase())) {
    return {
      ok: false,
      error: { field: "region", message: "Enter a real state, province, or region." },
    };
  }

  if (!LOCATION_REGEX.test(value)) {
    return {
      ok: false,
      error: {
        field:   "region",
        message: "State, province, or region uses unsupported characters.",
      },
    };
  }

  return { ok: true, value };
}

export function validateCountry(
  raw: unknown
): { ok: true; value: string } | { ok: false; error: FieldError } {
  const value = clean(raw);

  if (!value) {
    return {
      ok: false,
      error: { field: "country", message: "Country is required." },
    };
  }

  if (!COUNTRY_NAME_SET.has(value)) {
    return {
      ok: false,
      error: {
        field:   "country",
        message: "Select a country from the list.",
      },
    };
  }

  return { ok: true, value };
}

// Compose the legacy `name` field from structured first+last so old
// downstream consumers (license prefill fallback, public catalog credit,
// admin list) keep working. Both inputs assumed already validated/clean.
export function composeFullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

// Compose the legacy `origin` field from structured city + region + country.
// Used so the existing single-field consumers continue to render a useful
// human string without a schema-conditional read.
export function composeOrigin(city: string, region: string, country: string): string {
  return [city, region, country].map((s) => s.trim()).filter(Boolean).join(", ");
}

// ── Country list ─────────────────────────────────────────────────────────
//
// Controlled list. We render this in the form as a <select>. Server validates
// against the same set. Names match common English usage; we are intentionally
// not handling every alternate spelling — pick from the list or it's invalid.
//
// This is not exhaustive (no UN dependencies, no contested territories) — it
// covers the practical creator population. If a real creator's country is
// missing, add it here in a follow-up; do not loosen validation.

export const COUNTRY_LIST: readonly string[] = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Brazzaville)",
  "Congo (Kinshasa)",
  "Costa Rica",
  "Côte d'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hong Kong",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Trinidad and Tobago",
  "Tunisia",
  "Türkiye",
  "Turkmenistan",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
] as const;

export const COUNTRY_NAME_SET: ReadonlySet<string> = new Set(COUNTRY_LIST);
