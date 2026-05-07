// Single source of truth for the canonical site origin used in email
// redirect URLs. Prefers NEXT_PUBLIC_SITE_URL (works on server and is
// inlined into client bundles by Next), falls back to window.location.origin
// on the client only. Trailing slash trimmed.
export function getSiteUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return null;
}
