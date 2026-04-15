"use client";

import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase-browser";

type ProfileForm = {
  displayName: string;
  handle: string;
  bio: string;
  website: string;
  avatarUrl: string;
  bannerUrl: string;
};

const defaultProfile: ProfileForm = {
  displayName: "",
  handle: "",
  bio: "",
  website: "",
  avatarUrl: "",
  bannerUrl: "",
};

const BIO_MAX = 160;

const COMPLETION_FIELDS: { key: keyof ProfileForm; label: string }[] = [
  { key: "displayName", label: "display name" },
  { key: "handle", label: "handle" },
  { key: "bio", label: "bio" },
  { key: "website", label: "website" },
  { key: "avatarUrl", label: "profile photo" },
  { key: "bannerUrl", label: "banner image" },
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

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  // Completion
  const filledCount = COMPLETION_FIELDS.filter((f) => form[f.key].trim() !== "").length;
  const completionPct = Math.round((filledCount / COMPLETION_FIELDS.length) * 100);
  const firstMissing = COMPLETION_FIELDS.find((f) => form[f.key].trim() === "");

  const cleanHandle = form.handle.replace(/^@+/, "").trim();

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
        const loaded: ProfileForm = {
          displayName: data.profile.display_name || "",
          handle: data.profile.handle || "",
          bio: data.profile.bio_short || "",
          website: data.profile.website || "",
          avatarUrl: data.profile.avatar_url || "",
          bannerUrl: data.profile.banner_url || "",
        };
        setForm(loaded);
        setInitialForm(loaded);
      } else {
        setForm(defaultProfile);
        setInitialForm(defaultProfile);
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
          display_name: form.displayName,
          handle: form.handle.replace(/^@+/, "").trim(),
          bio_short: form.bio,
          website,
          avatar_url: form.avatarUrl || null,
          banner_url: form.bannerUrl || null,
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

  if (loading) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, paddingBottom: 100 }}>

        {/* ── Live Strip ── */}
        {cleanHandle && (
          <a
            href={`/creators/${cleanHandle}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              marginBottom: 24,
              borderRadius: 10,
              background: "rgba(240,112,48,0.06)",
              border: "1px solid rgba(240,112,48,0.12)",
              textDecoration: "none",
              fontSize: 13,
              color: "rgba(240,112,48,0.7)",
            }}
          >
            <span>Live at shangomaji.com/creators/{cleanHandle}</span>
            <span>→</span>
          </a>
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
                <a
                  href={`/creators/${cleanHandle}`}
                  style={primaryButtonStyle}
                >
                  Preview as Visitor
                </a>
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

          {cleanHandle && (
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
                  {uploadingAvatar ? "Uploading…" : "Upload photo"}
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
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>No banner uploaded</span>
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
                {uploadingBanner ? "Uploading…" : "Upload banner"}
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
