import { redirect } from "next/navigation";

// Phase 2 — /profile is the canonical legacy alias. The previous content was
// a mock placeholder that displayed fake "Alex Rivera" data. Replaced with a
// permanent redirect to /account so the existing nav link routes to the real
// Member account page instead of fake data. The /account layout enforces the
// Member auth gate downstream.
export default function ProfileAlias() {
  redirect("/account");
}
