"use client";

import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase-browser";

type ExternalLink = { label: string; url: string };

type ProfileForm = {
  displayName: string;
  handle: string;
  bio: string;
  website: string;
  avatarUrl: string;
  bannerUrl: string;
  externalLinks: ExternalLink[];
};

const defaultProfile: ProfileForm = {
  displayName: "",
  handle: "",
  bio: "",
  website: "",
  avatarUrl: "",
  bannerUrl: "",
  externalLinks: [],
};

const BIO_MAX             = 160;
const MAX_EXTERNAL_LINKS  = 3;
const HANDLE_RE           = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

const COMPLETION_FIELDS: { key: keyof ProfileForm; label: string }[] = [
  { key: "displayName", label: "display name" },
  { key: "handle",      label: "handle" },
  { key: "bio",         label: "bio" },
  { key: "website",     label: "website" },
  { key: "avatarUrl",   label: "profile photo" },
  { key: "bannerUrl",   label: "banner image" },
];

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<ProfileForm>(defaultProfile);
  const [initialForm, setInitialForm] = useState<ProfileForm>(defaultProfile);
  const [savedMessage, setSavedMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  // Phase 1 — Public Profile control state.
  const [isPublished, setIsPublished]                   = useState(false);
  const [forceUnpublished, setForceUnpublished]         = useState(false);
  const [forceUnpublishedReason, setForceUnpublishedReason] = useState<string>("");
  const [placeholderQuarantined, setPlaceholderQuarantined] = useState(false);
  const [publishBusy, setPublishBusy]                   = useState(false);

  // Phase 1 publish-safety patch — confirmation modal state for unpublish.
  // Publishing remains one-click; unpublishing requires explicit confirmation
  // because it removes the profile from the public roster and 404s the
  // public page.
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [unpublishError, setUnpublishError]         = useState("");

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  // Completion — string fields only; external_links contributes via website
  const filledCount = COMPLETION_FIELDS.filter((f) => {
    const v = form[f.key];
    return typeof v === "string" && v.trim() !== "";
  }).length;
  const completionPct = Math.round((filledCount / COMPLETION_FIELDS.length) * 100);
  const firstMissing = COMPLETION_FIELDS.find((f) => {
    const v = form[f.key];
    return typeof v === "string" && v.trim() === "";
  });

  const cleanHandle = form.handle.replace(/^@+/, "").trim().toLowerCase();
  const handleValid = !!cleanHandle && HANDLE_RE.test(cleanHandle);
  const canPublish  =
    !placeholderQuarantined && !forceUnpublished && handleValid && !!form.displayName.trim();

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
        await loadProfile();
      }
    }
    init();
  }, []);

  function handleChange(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function loadProfile() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/creators/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load profile");
      if (data.profile) {
        const externalLinks: ExternalLink[] = Array.isArray(data.profile.external_links)
          ? (data.profile.external_links as ExternalLink[]).slice(0, MAX_EXTERNAL_LINKS)
          : [];
        const loaded: ProfileForm = {
          displayName:   data.profile.display_name || "",
          handle:        data.profile.handle || "",
          bio:           data.profile.bio_short || "",
          website:       data.profile.website || "",
          avatarUrl:     data.profile.avatar_url || "",
          bannerUrl:     data.profile.banner_url || "",
          externalLinks,
        };
        setForm(loaded);
        setInitialForm(loaded);
        setIsPublished(!!data.profile.is_published_publicly);
        setForceUnpublished(!!data.profile.force_unpublished);
        setForceUnpublishedReason(data.profile.force_unpublished_reason || "");
        setPlaceholderQuarantined(!!data.profile.placeholder_quarantined);
      } else {
        setForm(defaultProfile);
        setInitialForm(defaultProfile);
        setIsPublished(false);
        setForceUnpublished(false);
        setForceUnpublishedReason("");
        setPlaceholderQuarantined(false);
      }
    } catch (err: any) {
      setError(err.message || "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSavedMessage("");
    if (savedTimer.current) clearTimeout(savedTimer.current);

    try {
      const rawWebsite = form.website.trim();
      const website =
        rawWebsite && !rawWebsite.match(/^https?:\/\//)
          ? `https://${rawWebsite}`
          : rawWebsite;

      const res = await fetch("/api/creators/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name:   form.displayName,
          handle:         form.handle.replace(/^@+/, "").trim().toLowerCase(),
          bio_short:      form.bio,
          website,
          avatar_url:     form.avatarUrl || null,
          banner_url:     form.bannerUrl || null,
          external_links: form.externalLinks
            .filter((l) => l.url.trim() !== "")
            .slice(0, MAX_EXTERNAL_LINKS),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setInitialForm({ ...form });
      setSavedMessage("Profile saved.");
      savedTimer.current = setTimeout(() => setSavedMessage(""), 2500);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Publish / Unpublish — sends only the publish flag. Save the rest of the
  // form first via Save Profile, then publish; the API rejects publishing if
  // a handle isn't set or the row has been force-unpublished by an admin.
  // Republish does NOT require profile edits — the existing display name,
  // handle, bio, avatar, and banner are preserved as-is on the row.
  //
  // Throws on failure so callers (the unpublish modal in particular) can
  // surface the message in their own error slot instead of the global save bar.
  async function handleTogglePublish(next: boolean) {
    setPublishBusy(true);
    setError("");
    setSavedMessage("");
    try {
      const res  = await fetch("/api/creators/profile", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_published_publicly: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Publish update failed");
      setIsPublished(next);
      // Re-fetch the canonical profile so admin-only fields (force_unpublished,
      // placeholder_quarantined) and audit columns stay in sync with the DB
      // immediately after publish/unpublish, instead of waiting for the next
      // page navigation.
      await loadProfile();
      setSavedMessage(next ? "Profile published." : "Profile unpublished.");
      savedTimer.current = setTimeout(() => setSavedMessage(""), 2500);
    } catch (err: any) {
      const msg = err?.message || "Publish update failed";
      setError(msg);
      throw err;
    } finally {
      setPublishBusy(false);
    }
  }

  // Unpublish — confirmation-gated wrapper. The publish strip's "Unpublish"
  // button opens this modal; the modal calls handleTogglePublish(false) only
  // after the creator confirms.
  async function handleConfirmUnpublish() {
    setUnpublishError("");
    try {
      await handleTogglePublish(false);
      setShowUnpublishModal(false);
    } catch (err: any) {
      setUnpublishError(err?.message || "Unpublish failed");
    }
  }

  function setLinkAt(idx: number, patch: Partial<ExternalLink>) {
    setForm((prev) => {
      const links = [...prev.externalLinks];
      while (links.length <= idx) links.push({ label: "", url: "" });
      links[idx] = { ...links[idx], ...patch };
      return { ...prev, externalLinks: links.slice(0, MAX_EXTERNAL_LINKS) };
    });
  }
  function removeLinkAt(idx: number) {
    setForm((prev) => ({
      ...prev,
      externalLinks: prev.externalLinks.filter((_, i) => i !== idx),
    }));
  }
  function addLink() {
    setForm((prev) =>
      prev.externalLinks.length >= MAX_EXTERNAL_LINKS
        ? prev
        : { ...prev, externalLinks: [...prev.externalLinks, { label: "", url: "" }] }
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, paddingBottom: 100 }}>

        {/* ── Unpublish confirmation modal ── */}
        {showUnpublishModal && (
          <div
            onClick={() => {
              if (publishBusy) return;
              setShowUnpublishModal(false);
              setUnpublishError("");
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 80,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 460,
                padding: "28px 24px 22px",
                borderRadius: 16,
                background: "#141010",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "rgba(245,197,24,0.85)",
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                Public Profile
              </p>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "white" }}>
                Unpublish this profile?
              </h3>

              <p style={{ margin: "12px 0 0", fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
                Unpublishing hides this profile from the public creator roster and
                makes the public profile page unavailable.
              </p>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
                Your profile data is preserved. You can republish at any time
                without re-entering anything.
              </p>

              {unpublishError && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.25)",
                    borderRadius: 10,
                    color: "rgba(252,165,165,0.9)",
                    fontSize: 13,
                  }}
                >
                  {unpublishError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button
                  onClick={() => {
                    if (publishBusy) return;
                    setShowUnpublishModal(false);
                    setUnpublishError("");
                  }}
                  disabled={publishBusy}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 13,
                    cursor: publishBusy ? "not-allowed" : "pointer",
                    opacity: publishBusy ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUnpublish}
                  disabled={publishBusy}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid rgba(245,197,24,0.4)",
                    background: "rgba(245,197,24,0.08)",
                    color: "rgba(245,197,24,0.95)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: publishBusy ? "not-allowed" : "pointer",
                    opacity: publishBusy ? 0.6 : 1,
                  }}
                >
                  {publishBusy ? "Unpublishing…" : "Unpublish Profile"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Quarantine banner — admin-imposed hold ── */}
        {placeholderQuarantined && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: 16,
              borderRadius: 10,
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.25)",
              color: "rgba(252,165,165,0.9)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            This profile has been placed under review and cannot be edited or
            published from the workspace. Contact ShangoMaji support if you believe
            this is in error.
          </div>
        )}

        {/* ── Force-unpublished banner — admin trust/safety override ── */}
        {forceUnpublished && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: 16,
              borderRadius: 10,
              background: "rgba(245,197,24,0.08)",
              border: "1px solid rgba(245,197,24,0.3)",
              color: "rgba(245,197,24,0.9)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              Your public profile has been unpublished by ShangoMaji.
            </p>
            {forceUnpublishedReason && (
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.55)" }}>
                Reason: {forceUnpublishedReason}
              </p>
            )}
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.45)" }}>
              You can continue to edit profile fields, but republishing requires
              admin review.
            </p>
          </div>
        )}

        {/* ── Publish strip ── */}
        {cleanHandle && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              marginBottom: 24,
              borderRadius: 10,
              background: isPublished
                ? "rgba(52,211,153,0.06)"
                : "rgba(255,255,255,0.03)",
              border: isPublished
                ? "1px solid rgba(52,211,153,0.25)"
                : "1px solid rgba(255,255,255,0.08)",
              fontSize: 13,
              color: isPublished
                ? "rgba(52,211,153,0.9)"
                : "rgba(255,255,255,0.55)",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>
                {isPublished ? "Published" : "Not published yet"}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                {isPublished
                  ? `Live at shangomaji.com/creators/${cleanHandle}`
                  : "Save your profile, then publish to make it reachable at /creators/{handle}."}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isPublished && (
                <a
                  href={`/creators/${cleanHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.85)",
                    textDecoration: "none",
                  }}
                >
                  Preview Public Profile
                </a>
              )}
              {isPublished ? (
                <button
                  onClick={() => {
                    if (publishBusy || placeholderQuarantined) return;
                    setUnpublishError("");
                    setShowUnpublishModal(true);
                  }}
                  disabled={publishBusy || placeholderQuarantined}
                  style={{
                    fontSize: 12,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.75)",
                    cursor: publishBusy ? "not-allowed" : "pointer",
                    opacity: publishBusy ? 0.6 : 1,
                  }}
                >
                  {publishBusy ? "Working…" : "Unpublish"}
                </button>
              ) : (
                <button
                  onClick={() => handleTogglePublish(true)}
                  disabled={publishBusy || !canPublish}
                  title={
                    !canPublish
                      ? placeholderQuarantined
                        ? "Profile is under review."
                        : forceUnpublished
                        ? "Profile has been unpublished by ShangoMaji."
                        : !handleValid
                        ? "Set a valid handle (3–32 lowercase letters, digits, or hyphens)."
                        : !form.displayName.trim()
                        ? "Set a display name before publishing."
                        : undefined
                      : undefined
                  }
                  style={{
                    fontSize: 12,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                    color: "black",
                    fontWeight: 600,
                    cursor: publishBusy || !canPublish ? "not-allowed" : "pointer",
                    opacity: publishBusy || !canPublish ? 0.55 : 1,
                  }}
                >
                  {publishBusy ? "Publishing…" : "Publish Public Profile"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Identity Hero ── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
            {/* Avatar display */}
            <div style={heroAvatarStyle}>
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 36, opacity: 0.25 }}>👤</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 32, margin: 0, lineHeight: 1.2 }}>
                {form.displayName || "Your Name"}
              </h1>
              {cleanHandle ? (
                <p style={{ margin: "4px 0 0", fontSize: 15, color: "rgba(255,255,255,0.45)" }}>
                  @{cleanHandle}
                </p>
              ) : (
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
                  Set up your handle below
                </p>
              )}
            </div>
          </div>

          {/* CTA row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {cleanHandle ? (
              <>
                {isPublished ? (
                  <a
                    href={`/creators/${cleanHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={primaryButtonStyle}
                  >
                    Preview Public Profile
                  </a>
                ) : (
                  <span
                    style={{
                      ...primaryButtonStyle,
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "not-allowed",
                    }}
                  >
                    Not Yet Published
                  </span>
                )}
                <span style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: "0.01em",
                  userSelect: "all",
                  pointerEvents: "none",
                }}>
                  shangomaji.com/creators/{cleanHandle}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
                Complete your handle to activate your public profile
              </span>
            )}
          </div>

          {cleanHandle && isPublished && (
            <p style={{ margin: "12px 0 0", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,112,48,0.6)" }}>
              Live on ShangoMaji
            </p>
          )}
        </section>

        {/* ── Status Strip ── */}
        <section style={statusStripStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            {/* Progress bar */}
            <div style={progressTrackStyle}>
              <div
                style={{
                  height: "100%",
                  width: `${completionPct}%`,
                  borderRadius: 3,
                  background: completionPct === 100
                    ? "rgba(52,211,153,0.7)"
                    : "linear-gradient(90deg, rgba(240,112,48,0.7), rgba(245,197,24,0.7))",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
              Profile {completionPct}% complete
            </span>
          </div>
          {firstMissing && completionPct < 100 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Add a {firstMissing.label} to complete your profile
            </span>
          )}
        </section>

        {/* ── Edit Area: Identity ── */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={sectionHeadingStyle}>Identity</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Email (read-only) */}
            <div>
              <label style={labelStyle}>Account Email</label>
              <input value={email} readOnly style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
            </div>

            {/* Avatar upload */}
            <div>
              <label style={labelStyle}>Profile Photo</label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={editAvatarStyle}>
                  {form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 22, opacity: 0.25 }}>👤</span>
                  )}
                </div>
                <label
                  style={{
                    cursor: uploadingAvatar ? "not-allowed" : "pointer",
                    fontSize: 13,
                    color: uploadingAvatar ? "rgba(255,255,255,0.3)" : "rgba(240,112,48,0.85)",
                    borderBottom: "1px solid currentColor",
                    paddingBottom: 1,
                  }}
                >
                  {uploadingAvatar ? "Adding…" : "Add photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    disabled={uploadingAvatar}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingAvatar(true);
                      setError("");
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        fd.append("asset_type", "avatar");
                        const res = await fetch("/api/creators/upload/asset", { method: "POST", body: fd });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data?.error || "Upload failed");
                        setForm((prev) => ({ ...prev, avatarUrl: data.url }));
                      } catch (err: any) {
                        setError(err.message || "Upload failed");
                      } finally {
                        setUploadingAvatar(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Banner upload */}
            <div>
              <label style={labelStyle}>Banner Image</label>
              <div style={{
                width: "100%",
                height: 120,
                borderRadius: 12,
                backgroundImage: form.bannerUrl ? `url(${form.bannerUrl})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: form.bannerUrl ? undefined : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {!form.bannerUrl && (
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>No banner added</span>
                )}
              </div>
              <label
                style={{
                  cursor: uploadingBanner ? "not-allowed" : "pointer",
                  fontSize: 13,
                  color: uploadingBanner ? "rgba(255,255,255,0.3)" : "rgba(240,112,48,0.85)",
                  borderBottom: "1px solid currentColor",
                  paddingBottom: 1,
                  marginTop: 8,
                  display: "inline-block",
                }}
              >
                {uploadingBanner ? "Adding…" : "Add banner"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  disabled={uploadingBanner}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingBanner(true);
                    setError("");
                    try {
                      const fd = new FormData();
                      fd.append("file", file);
                      fd.append("asset_type", "banner");
                      const res = await fetch("/api/creators/upload/asset", { method: "POST", body: fd });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data?.error || "Upload failed");
                      setForm((prev) => ({ ...prev, bannerUrl: data.url }));
                    } catch (err: any) {
                      setError(err.message || "Upload failed");
                    } finally {
                      setUploadingBanner(false);
                    }
                  }}
                />
              </label>
            </div>

            {/* Display Name */}
            <div>
              <label style={labelStyle}>Display Name</label>
              <input
                value={form.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                placeholder="Your name or studio name"
                style={inputStyle}
              />
            </div>

            {/* Handle */}
            <div>
              <label style={labelStyle}>Handle / Username</label>
              <input
                value={form.handle}
                onChange={(e) => handleChange("handle", e.target.value)}
                placeholder="@stormstudio"
                style={inputStyle}
              />
            </div>

            {/* Bio */}
            <div>
              <label style={labelStyle}>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => handleChange("bio", e.target.value.slice(0, BIO_MAX))}
                placeholder="Tell your story in a few sentences."
                style={{ ...inputStyle, height: 120, resize: "vertical" }}
              />
              <p
                style={{
                  fontSize: 11,
                  color: form.bio.length >= BIO_MAX ? "#ff6b6b" : "rgba(255,255,255,0.25)",
                  marginTop: 4,
                  textAlign: "right",
                }}
              >
                {form.bio.length}/{BIO_MAX}
              </p>
            </div>
          </div>
        </section>

        {/* ── Edit Area: Links ── */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={sectionHeadingStyle}>Links</h2>
          <div>
            <label style={labelStyle}>Website</label>
            <input
              value={form.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://yourdomain.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: 24 }}>
            <label style={labelStyle}>External Links (up to {MAX_EXTERNAL_LINKS})</label>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 12px" }}>
              Optional. Each link must be a valid URL. Empty rows are dropped on save.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {form.externalLinks.map((l, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={l.label}
                    onChange={(e) => setLinkAt(idx, { label: e.target.value })}
                    placeholder="Label (optional)"
                    style={{ ...inputStyle, maxWidth: 200 }}
                  />
                  <input
                    value={l.url}
                    onChange={(e) => setLinkAt(idx, { url: e.target.value })}
                    placeholder="https://example.com"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => removeLinkAt(idx)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {form.externalLinks.length < MAX_EXTERNAL_LINKS && (
                <button
                  type="button"
                  onClick={addLink}
                  style={{
                    alignSelf: "flex-start",
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px dashed rgba(255,255,255,0.18)",
                    color: "rgba(240,112,48,0.85)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  + Add link
                </button>
              )}
            </div>
          </div>
        </section>

      {/* ── Sticky Save Bar ── */}
      {(isDirty || savedMessage || error) && (
        <div style={stickyBarStyle}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span style={{ fontSize: 13, color: savedMessage ? "rgba(52,211,153,0.9)" : error ? "#ff6b6b" : "rgba(255,255,255,0.5)" }}>
              {savedMessage || error || "Unsaved changes"}
            </span>
            {isDirty && (
              <button onClick={handleSave} disabled={saving} style={saveButtonStyle}>
                {saving ? "Saving…" : "Save Profile"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Style constants ── */


const heroAvatarStyle: CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.06)",
  border: "2px solid rgba(255,255,255,0.12)",
  overflow: "hidden",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 22px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "black",
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
  cursor: "pointer",
};

const statusStripStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  padding: "14px 20px",
  marginBottom: 40,
  borderRadius: 12,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  flexWrap: "wrap",
};

const progressTrackStyle: CSSProperties = {
  width: 80,
  height: 6,
  borderRadius: 3,
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
  flexShrink: 0,
};

const sectionHeadingStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.35)",
  marginBottom: 20,
  paddingBottom: 10,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
  marginBottom: 8,
};

const inputStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const editAvatarStyle: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.15)",
  overflow: "hidden",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};


const stickyBarStyle: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  padding: "14px 24px",
  background: "rgba(12,12,15,0.95)",
  borderTop: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(12px)",
  zIndex: 50,
};

const saveButtonStyle: CSSProperties = {
  padding: "10px 28px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "black",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
