"use client";

// Phase 4 — Member private My List page.
//
// Auth + Member gate runs through /api/members/my-list (401 → /login,
// 403 → /signup with redirect=/my-list). The page never reads Member data
// directly from Supabase; everything goes through the server route.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, X } from "lucide-react";
import type { TitleSummary } from "@/lib/title-summaries";
import type { FollowedWorldSummary } from "@/lib/worlds";
import { PosterArt } from "@/components/artwork/Artwork";
import { PageTitle } from "@/components/util/PageTitle";

type Stage =
  | { kind: "loading" }
  | { kind: "auth_required" }
  | { kind: "member_required" }
  | { kind: "ready"; titles: TitleSummary[] }
  | { kind: "error"; message: string };

export default function MyListPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [removing, setRemoving] = useState<string | null>(null);
  // Phase 10I.2 — private "Following" list (Worlds the viewer follows).
  // null = not yet loaded / not shown. Private to the viewer; no counts.
  const [following, setFollowing] = useState<FollowedWorldSummary[] | null>(null);
  const [unfollowing, setUnfollowing] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/members/my-list", { cache: "no-store" });
      if (res.status === 401) { setStage({ kind: "auth_required" }); return; }
      if (res.status === 403) { setStage({ kind: "member_required" }); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load your list.");
      setStage({ kind: "ready", titles: (data.titles ?? []) as TitleSummary[] });
      // The member is confirmed by the my-list gate; load their follows too.
      loadFollowing();
    } catch (e: any) {
      setStage({ kind: "error", message: e?.message || "Could not load your list." });
    }
  }

  async function loadFollowing() {
    try {
      const res = await fetch("/api/members/following", { cache: "no-store" });
      if (!res.ok) { setFollowing([]); return; }
      const data = await res.json();
      setFollowing(Array.isArray(data?.following) ? (data.following as FollowedWorldSummary[]) : []);
    } catch {
      setFollowing([]);
    }
  }

  async function handleUnfollow(worldId: string) {
    setUnfollowing(worldId);
    try {
      const res = await fetch("/api/members/following", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ worldId }),
      });
      if (!res.ok) throw new Error("Could not unfollow.");
      setFollowing((f) => (f ? f.filter((w) => w.worldId !== worldId) : f));
    } catch {
      await loadFollowing();
    } finally {
      setUnfollowing(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRemove(titleId: string) {
    setRemoving(titleId);
    try {
      const res = await fetch("/api/members/my-list", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ titleId }),
      });
      if (!res.ok) throw new Error("Could not remove.");
      // Optimistic: refilter locally to avoid a flash.
      setStage((s) =>
        s.kind === "ready"
          ? { kind: "ready", titles: s.titles.filter((t) => t.titleId !== titleId) }
          : s
      );
    } catch {
      // No public toast surface — fall back to a re-fetch so the UI is honest.
      await load();
    } finally {
      setRemoving(null);
    }
  }

  if (stage.kind === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-24">
        <p className="text-white/45 text-sm">Loading your list…</p>
      </div>
    );
  }

  if (stage.kind === "auth_required") {
    const redirectTo = encodeURIComponent("/my-list");
    return (
      <GateScreen
        heading="Sign in to view My List."
        body="My List is part of your Member account. Sign in or create one to continue."
        primary={{ label: "Sign in", href: `/login?redirect=${redirectTo}` }}
        secondary={{ label: "Create Member account", href: `/signup?redirect=${redirectTo}` }}
      />
    );
  }

  if (stage.kind === "member_required") {
    const redirectTo = encodeURIComponent("/my-list");
    return (
      <GateScreen
        heading="Member account required."
        body="My List is part of your Member account."
        primary={{ label: "Create Member account", href: `/signup?redirect=${redirectTo}` }}
        secondary={{ label: "Browse Catalog",       href: "/browse" }}
      />
    );
  }

  if (stage.kind === "error") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-24">
        <p className="text-white/55 text-sm">{stage.message}</p>
      </div>
    );
  }

  // ready
  const titles = stage.titles;
  return (
    <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-28 pb-20">
      <PageTitle title="My List" />
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] mb-1" style={{ color: "rgba(245,197,24,0.85)" }}>
            Member Account
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">My List</h1>
        </div>
        <Link href="/account" className="hidden md:inline text-xs text-white/45 hover:text-white/80 transition">
          Account
        </Link>
      </div>

      {titles.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="grid gap-x-4 gap-y-8"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          }}
        >
          {titles.map((t) => (
            <SavedTitleCard
              key={t.titleId}
              title={t}
              onRemove={() => handleRemove(t.titleId)}
              removing={removing === t.titleId}
            />
          ))}
        </div>
      )}

      {/* Phase 10I.2 — private "Following" section. Worlds the viewer
          follows, hidden entirely when empty. Private to the viewer:
          no public counts, no follower totals, no social graph. */}
      {following && following.length > 0 && (
        <section className="mt-16">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">Following</h2>
            <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Worlds you follow. Private to you — no public counts.
            </p>
          </div>
          <div
            className="grid gap-x-4 gap-y-8"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
          >
            {following.map((w) => (
              <FollowingCard
                key={w.worldId}
                world={w}
                onUnfollow={() => handleUnfollow(w.worldId)}
                pending={unfollowing === w.worldId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SavedTitleCard({
  title, onRemove, removing,
}: {
  title: TitleSummary;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div className="group relative">
      <Link href={`/title/${title.slug}`} className="block">
        <div className="relative overflow-hidden rounded-xl bg-surface-elevated aspect-[2/3]">
          <PosterArt
            src={title.posterUrl}
            alt={title.title}
            title={title.title}
            className="transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="180px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-2 left-2 right-2 flex gap-2">
              <button
                onClick={(e) => { e.preventDefault(); window.location.href = `/watch/${title.slug}`; }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black text-xs font-semibold py-2 rounded-lg hover:bg-white/90 transition"
              >
                <Play size={12} fill="currentColor" />
                Play
              </button>
              <button
                onClick={(e) => { e.preventDefault(); onRemove(); }}
                disabled={removing}
                aria-label="Remove from My List"
                className="p-2 rounded-lg text-white"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  opacity: removing ? 0.5 : 1,
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 px-0.5">
          <p className="text-sm font-medium text-white/90 truncate leading-tight group-hover:text-white transition">
            {title.title}
          </p>
          {title.creatorName && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(240,112,48,0.8)" }}>
              By {title.creatorName}
            </p>
          )}
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
            {[
              title.year > 0 ? String(title.year) : null,
              title.genres[0] || null,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Link>
    </div>
  );
}

// Phase 10I.2 — a followed World, rendered as its primary title card with
// an unfollow control. Mirrors SavedTitleCard's layout; the action removes
// the private follow (member_world_follows), never deletes anything public.
function FollowingCard({
  world, onUnfollow, pending,
}: {
  world: FollowedWorldSummary;
  onUnfollow: () => void;
  pending: boolean;
}) {
  return (
    <div className="group relative">
      <Link href={`/title/${world.slug}`} className="block">
        <div className="relative overflow-hidden rounded-xl bg-surface-elevated aspect-[2/3]">
          <PosterArt
            src={world.posterUrl}
            alt={world.title}
            title={world.title}
            className="transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="180px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-2 left-2 right-2 flex gap-2">
              <button
                onClick={(e) => { e.preventDefault(); window.location.href = `/watch/${world.slug}`; }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black text-xs font-semibold py-2 rounded-lg hover:bg-white/90 transition"
              >
                <Play size={12} fill="currentColor" />
                Play
              </button>
              <button
                onClick={(e) => { e.preventDefault(); onUnfollow(); }}
                disabled={pending}
                aria-label="Unfollow updates"
                className="p-2 rounded-lg text-white"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  opacity: pending ? 0.5 : 1,
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 px-0.5">
          <p className="text-sm font-medium text-white/90 truncate leading-tight group-hover:text-white transition">
            {world.title}
          </p>
          {world.creatorName && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(240,112,48,0.8)" }}>
              By {world.creatorName}
            </p>
          )}
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(245,197,24,0.7)" }}>
            Following
          </p>
        </div>
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-2xl px-8 py-14 text-center"
      style={{
        background: "rgba(20,16,16,0.55)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <h2 className="text-white text-2xl md:text-3xl font-semibold tracking-tight mb-2">
        Nothing saved yet.
      </h2>
      <p className="text-white/55 text-sm md:text-base mb-6">
        Save titles to find them here.
      </p>
      <Link
        href="/browse"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
      >
        Browse Catalog
      </Link>
    </div>
  );
}

function GateScreen({
  heading, body, primary, secondary,
}: {
  heading: string;
  body: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 pt-24">
      <div className="max-w-md w-full text-left flex flex-col gap-4">
        <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">{heading}</h1>
        <p className="text-white/65 text-sm md:text-base">{body}</p>
        <div className="flex flex-wrap gap-3 mt-2">
          <Link href={primary.href} className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition">
            {primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className="px-5 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/10 transition">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
