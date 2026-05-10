"use client";

import { useEffect, useState, useRef } from "react";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase-browser";
import { ReadinessChip } from "../components";

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
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [unpublishError, setUnpublishError]         = useState("");

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const filledCount = COMPLETION_FIELDS.filter((f) => {
    const v = form[f.key];
    return typeof v === "string" && v.trim() !== "";
  }).length;
  const completionPct = Math.round((filledCount / COMPLETION_FIELDS.length) * 100);
  const missingFields = COMPLETION_FIELDS.filter((f) => {
    const v = form[f.key];
    return typeof v === "string" && v.trim() === "";
  });

  const cleanHandle = form.handle.replace(/^@+/, "").trim().toLowerCase();
  const handleValid = !!cleanHandle && HANDLE_RE.test(cleanHandle);
  const canPublish  =
    !placeholderQuarantined && !forceUnpublished && handleValid && !!form.displayName.trim();

  const publishDisabledReason = placeholderQuarantined
    ? "Profile is under review."
    : forceUnpublished
    ? "Profile has been unpublished by ShangoMaji."
    : !handleValid
    ? "Set a valid handle (3–32 lowercase letters, digits, or hyphens)."
    : !form.displayName.trim()
    ? "Set a display name before publishing."
    : undefined;

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

  async function uploadAsset(file: File, kind: "avatar" | "banner") {
    const setter = kind === "avatar" ? setUploadingAvatar : setUploadingBanner;
    const targetKey: keyof ProfileForm = kind === "avatar" ? "avatarUrl" : "bannerUrl";
    setter(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("asset_type", kind);
      const res = await fetch("/api/creators/upload/asset", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setForm((prev) => ({ ...prev, [targetKey]: data.url }));
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setter(false);
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
    <>
      {/* ── Unpublish confirmation modal — fixed-position overlay,
            unaffected by parent layout. ── */}
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

      {/* Phase 7.3 Layer 2D — Creator Identity Control Room.
          The host WorkspaceShell caps content to ~1000px. Same legitimate
          100vw breakout used on New Work, applied here so the identity
          workspace can use the full ~1440px desktop canvas. */}
      <div
        style={{
          width: "100vw",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
        }}
      >
        <div className="w-full mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-14 pb-32">

          {/* ─────────────── ADMIN ALERTS ─────────────── */}
          {placeholderQuarantined && (
            <div
              className="mb-5 rounded-xl px-4 py-3 text-[13px] leading-relaxed"
              style={{
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.25)",
                color: "rgba(252,165,165,0.9)",
              }}
            >
              This profile has been placed under review and cannot be edited or
              published from the workspace. Contact ShangoMaji support if you believe
              this is in error.
            </div>
          )}

          {forceUnpublished && (
            <div
              className="mb-5 rounded-xl px-4 py-3 text-[13px] leading-relaxed"
              style={{
                background: "rgba(245,197,24,0.08)",
                border: "1px solid rgba(245,197,24,0.3)",
                color: "rgba(245,197,24,0.9)",
              }}
            >
              <p className="font-semibold m-0">
                Your public profile has been unpublished by ShangoMaji.
              </p>
              {forceUnpublishedReason && (
                <p className="m-0 mt-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                  Reason: {forceUnpublishedReason}
                </p>
              )}
              <p className="m-0 mt-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                You can continue to edit profile fields, but republishing requires
                admin review.
              </p>
            </div>
          )}

          {/* ─────────────── IDENTITY HERO ───────────────
              Banner as a wide visual identity element, avatar overlapping
              the banner, display name as the strongest text on the page,
              handle directly under it, public URL on the third line, and
              the publish/preview/unpublish actions on the right.
              No stranded "publish strip" — everything lives here. */}
          <header className="pt-2">
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"
              style={{ aspectRatio: "5 / 1.45", minHeight: 180 }}
            >
              {form.bannerUrl ? (
                <img
                  src={form.bannerUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-sm text-white/30">
                  Add a banner image to your public profile.
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
            </div>

            {/* Identity row — overlaps banner via negative top margin */}
            <div className="relative -mt-12 xl:-mt-16 px-2 xl:px-6">
              <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 xl:gap-8">
                <div className="flex items-end gap-5 min-w-0">
                  <div
                    className="w-24 h-24 xl:w-[128px] xl:h-[128px] rounded-full overflow-hidden shrink-0 grid place-items-center"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "4px solid #0a0707",
                      boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
                    }}
                  >
                    {form.avatarUrl ? (
                      <img
                        src={form.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl xl:text-4xl text-white/25">👤</span>
                    )}
                  </div>
                  <div className="pb-1.5 xl:pb-3 min-w-0">
                    <h1
                      className="text-white font-bold tracking-tight leading-tight truncate text-2xl sm:text-3xl xl:text-[40px]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {form.displayName || "Your Name"}
                    </h1>
                    {cleanHandle ? (
                      <p className="mt-1 text-sm xl:text-base text-white/55 truncate">
                        @{cleanHandle}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-white/30 italic">
                        Set up your handle to claim your URL
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:gap-3 xl:pb-3 shrink-0">
                  <ReadinessChip
                    tone={isPublished ? "emerald" : "neutral"}
                    label={isPublished ? "Published" : "Unpublished"}
                  />
                  {isPublished && cleanHandle && (
                    <a
                      href={`/creators/${cleanHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 13,
                        padding: "8px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.18)",
                        color: "rgba(255,255,255,0.85)",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        whiteSpace: "nowrap",
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
                        fontSize: 13,
                        padding: "8px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "transparent",
                        color: "rgba(255,255,255,0.78)",
                        cursor: publishBusy ? "not-allowed" : "pointer",
                        opacity: publishBusy ? 0.6 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {publishBusy ? "Working…" : "Unpublish"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTogglePublish(true)}
                      disabled={publishBusy || !canPublish}
                      title={!canPublish ? publishDisabledReason : undefined}
                      style={{
                        fontSize: 13,
                        padding: "9px 18px",
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                        color: "black",
                        fontWeight: 700,
                        cursor: publishBusy || !canPublish ? "not-allowed" : "pointer",
                        opacity: publishBusy || !canPublish ? 0.55 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {publishBusy ? "Publishing…" : "Publish Public Profile"}
                    </button>
                  )}
                </div>
              </div>

              {cleanHandle && (
                <p
                  className="mt-3 text-[11px] text-white/40 tracking-wider"
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                >
                  shangomaji.com/creators/{cleanHandle}
                </p>
              )}
            </div>
          </header>

          {/* ─────────────── TWO-COLUMN WORKSPACE ───────────────
              xl+ : 64% editor / 32% rail / 4% gutter.
              < xl: single column flow.
              DOM source order = mobile order: Hero → Rail → Editor.
              On xl, the rail is grid-placed into col 2 row 1 and the
              editor into col 1 row 1. The rail also stays sticky on
              desktop so completion guidance stays visible while editing. */}
          <div className="mt-14 xl:mt-20 grid gap-y-10 xl:grid-cols-[64%_32%] xl:gap-x-[4%] xl:items-start">

            {/* ── SUPPORT RAIL ── DOM-first so it appears below the hero
                on mobile; placed into the right column on xl+. */}
            <aside className="xl:col-start-2 xl:row-start-1 xl:sticky xl:top-32 space-y-6 min-w-0">
              <section>
                <header className="pb-4 border-b border-white/12 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-ink-muted">
                    Profile completion
                  </p>
                  <div className="flex items-baseline justify-between gap-4">
                    <h2
                      className="text-white text-[18px] leading-tight font-semibold tracking-tight"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {completionPct}% complete
                    </h2>
                    <span className="text-xs text-white/45">
                      {filledCount} / {COMPLETION_FIELDS.length}
                    </span>
                  </div>
                </header>

                <div className="pt-4 space-y-4">
                  <div
                    className="w-full h-[6px] rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${completionPct}%`,
                        background:
                          completionPct === 100
                            ? "rgba(52,211,153,0.7)"
                            : "linear-gradient(90deg, rgba(240,112,48,0.75), rgba(245,197,24,0.75))",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  {missingFields.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                        Still to add
                      </p>
                      <ul className="space-y-1.5">
                        {missingFields.map((f) => (
                          <li
                            key={f.key}
                            className="flex items-center gap-2 text-[13px] text-white/65"
                          >
                            <span
                              aria-hidden
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ background: "rgba(245,197,24,0.7)" }}
                            />
                            <span className="capitalize">{f.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-[13px] text-emerald-300/85">
                      All identity fields are filled in.
                    </p>
                  )}

                  {!isPublished && cleanHandle && !canPublish && publishDisabledReason && (
                    <p className="text-[12px] text-amber-300/80 leading-relaxed pt-1">
                      {publishDisabledReason}
                    </p>
                  )}
                </div>
              </section>
            </aside>

            {/* ── PROFILE EDITOR CANVAS ── */}
            <div className="xl:col-start-1 xl:row-start-1 space-y-12 min-w-0">

              {/* I · Identity */}
              <section>
                <header className="pb-5 border-b border-white/12 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-ink-muted">
                    Section I
                  </p>
                  <h2
                    className="text-white text-[22px] leading-tight font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Identity
                  </h2>
                </header>

                <div className="pt-7 space-y-7">
                  {/* Account email — read only */}
                  <Field label="Account Email">
                    <input value={email} readOnly style={{ ...inputStyle, opacity: 0.55, cursor: "not-allowed" }} />
                  </Field>

                  {/* Asset uploads — Profile Photo / Banner side-by-side at xl */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-7">
                    <Field label="Profile Photo" hint="JPG, PNG, or WebP.">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-full overflow-hidden shrink-0 grid place-items-center"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        >
                          {form.avatarUrl ? (
                            <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl text-white/25">👤</span>
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
                          {uploadingAvatar
                            ? "Uploading…"
                            : form.avatarUrl
                            ? "Replace photo"
                            : "Add photo"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            disabled={uploadingAvatar}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              await uploadAsset(file, "avatar");
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </Field>

                    <Field label="Banner Image" hint="Wide image used at the top of your public profile.">
                      <div className="space-y-3">
                        <div
                          className="w-full h-20 rounded-lg overflow-hidden"
                          style={{
                            backgroundImage: form.bannerUrl ? `url(${form.bannerUrl})` : "none",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            background: form.bannerUrl ? undefined : "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {!form.bannerUrl && (
                            <span className="text-xs text-white/25">No banner added</span>
                          )}
                        </div>
                        <label
                          style={{
                            cursor: uploadingBanner ? "not-allowed" : "pointer",
                            fontSize: 13,
                            color: uploadingBanner ? "rgba(255,255,255,0.3)" : "rgba(240,112,48,0.85)",
                            borderBottom: "1px solid currentColor",
                            paddingBottom: 1,
                            display: "inline-block",
                          }}
                        >
                          {uploadingBanner
                            ? "Uploading…"
                            : form.bannerUrl
                            ? "Replace banner"
                            : "Add banner"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            disabled={uploadingBanner}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              await uploadAsset(file, "banner");
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </Field>
                  </div>

                  {/* Display name + Handle side-by-side at sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-7">
                    <Field label="Display Name">
                      <input
                        value={form.displayName}
                        onChange={(e) => handleChange("displayName", e.target.value)}
                        placeholder="Your name or studio name"
                        style={inputStyle}
                      />
                    </Field>

                    <Field
                      label="Handle / Username"
                      hint="3–32 lowercase letters, digits, or hyphens."
                    >
                      <input
                        value={form.handle}
                        onChange={(e) => handleChange("handle", e.target.value)}
                        placeholder="stormstudio"
                        style={inputStyle}
                      />
                    </Field>
                  </div>

                  <Field label="Bio" hint={`Up to ${BIO_MAX} characters.`}>
                    <textarea
                      value={form.bio}
                      onChange={(e) => handleChange("bio", e.target.value.slice(0, BIO_MAX))}
                      placeholder="Tell your story in a few sentences."
                      style={{ ...inputStyle, height: 140, resize: "vertical" }}
                    />
                    <p
                      style={{
                        fontSize: 11,
                        color: form.bio.length >= BIO_MAX ? "#ff6b6b" : "rgba(255,255,255,0.3)",
                        marginTop: 6,
                        textAlign: "right",
                      }}
                    >
                      {form.bio.length}/{BIO_MAX}
                    </p>
                  </Field>
                </div>
              </section>

              {/* II · Web Presence */}
              <section>
                <header className="pb-5 border-b border-white/12 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-ink-muted">
                    Section II
                  </p>
                  <h2
                    className="text-white text-[22px] leading-tight font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Web Presence
                  </h2>
                </header>

                <div className="pt-7 space-y-7">
                  <Field label="Website">
                    <input
                      value={form.website}
                      onChange={(e) => handleChange("website", e.target.value)}
                      placeholder="https://yourdomain.com"
                      style={inputStyle}
                    />
                  </Field>

                  <div>
                    <p className="block text-sm font-medium text-white">
                      External Links
                    </p>
                    <p className="text-xs text-ink-faint mt-1.5 mb-3">
                      Up to {MAX_EXTERNAL_LINKS}. Each link must be a valid URL. Empty rows are dropped on save.
                    </p>
                    <div className="space-y-2.5">
                      {form.externalLinks.map((l, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-[200px_1fr_auto] gap-2 items-center"
                        >
                          <input
                            value={l.label}
                            onChange={(e) => setLinkAt(idx, { label: e.target.value })}
                            placeholder="Label (optional)"
                            style={inputStyle}
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
                              padding: "10px 14px",
                              borderRadius: 8,
                              background: "transparent",
                              border: "1px solid rgba(255,255,255,0.14)",
                              color: "rgba(255,255,255,0.55)",
                              fontSize: 13,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
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
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Save Bar — preserved.
            Single source of truth for the save action; appears only when
            there are unsaved changes or a transient status to surface.
            Spans the viewport so it's reachable from any scroll position. */}
      {(isDirty || savedMessage || error) && (
        <div style={stickyBarStyle}>
          <div className="w-full mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-14">
            <div className="flex items-center justify-between gap-4 h-[56px] sm:h-[64px]">
              <span
                style={{
                  fontSize: 13,
                  color: savedMessage
                    ? "rgba(52,211,153,0.9)"
                    : error
                    ? "#ff6b6b"
                    : "rgba(255,255,255,0.55)",
                }}
              >
                {savedMessage || error || "Unsaved changes"}
              </span>
              {isDirty && (
                <button onClick={handleSave} disabled={saving} style={saveButtonStyle}>
                  {saving ? "Saving…" : "Save Profile"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Field primitive ── */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={fieldLabelStyle}>{label}</label>
      {hint && <p style={fieldHintStyle}>{hint}</p>}
      {children}
    </div>
  );
}

/* ── Style constants ── */

const inputStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontSize: 14,
};

const fieldLabelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "rgba(255,255,255,0.92)",
  marginBottom: 6,
};

const fieldHintStyle: CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.4)",
  margin: "0 0 8px",
};

const stickyBarStyle: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  background: "rgba(13,9,8,0.94)",
  borderTop: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  zIndex: 50,
};

const saveButtonStyle: CSSProperties = {
  padding: "10px 24px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "black",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
