"use client";

import { motion } from "framer-motion";
import { User, Settings, LogOut, Edit3 } from "lucide-react";
import { ProfileSection } from "@/components/profile/ProfileSection";
import {
  getContinueWatching,
  getMyList,
  getWatchHistory,
} from "@/data/mockData";

// Mock user data — swap with real auth session
const MOCK_USER = {
  name: "Alex Rivera",
  email: "alex.rivera@example.com",
  plan: "Premium",
  memberSince: "March 2022",
  avatar: null as string | null,
};

export default function ProfilePage() {
  const continueWatching = getContinueWatching();
  const myList = getMyList();
  const watchHistory = getWatchHistory();

  return (
    <div className="min-h-screen pt-16 pb-20">
      {/* ── Profile Header ── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* Background ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-brand-orange/5 blur-[80px]" />
        </div>

        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-16">
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-brand-gradient p-[2px]">
                <div className="w-full h-full rounded-2xl bg-surface-raised flex items-center justify-center">
                  <User size={36} className="text-ink-muted" />
                </div>
              </div>
              <button className="absolute -bottom-2 -right-2 p-1.5 bg-surface-elevated border border-white/10 rounded-lg text-ink-muted hover:text-white transition-colors">
                <Edit3 size={12} />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-display font-bold text-3xl md:text-4xl text-white tracking-tight">
                {MOCK_USER.name}
              </h1>
              <p className="text-ink-muted text-sm mt-1">{MOCK_USER.email}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full text-black"
                  style={{
                    background:
                      "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                  }}
                >
                  {MOCK_USER.plan}
                </span>
                <span className="text-ink-faint text-xs">
                  Member since {MOCK_USER.memberSince}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-ink-muted hover:text-white text-sm transition-all duration-200">
                <Settings size={15} />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button className="p-2.5 glass rounded-xl text-ink-muted hover:text-brand-red transition-all duration-200">
                <LogOut size={15} />
              </button>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            className="flex gap-8 mt-10 pt-8 border-t border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            {[
              { label: "Watching", value: continueWatching.length },
              { label: "My List", value: myList.length },
              { label: "Watched", value: watchHistory.length },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-white font-semibold text-2xl">{value}</p>
                <p className="text-ink-faint text-xs uppercase tracking-widest mt-0.5">
                  {label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="mt-12">
        <ProfileSection
          label="Continue Watching"
          titles={continueWatching}
          variant="landscape"
          showProgress
          emptyMessage="You haven't started anything yet. Start watching!"
        />

        <ProfileSection
          label="My List"
          titles={myList}
          variant="poster"
          emptyMessage="Add titles to your list to watch them later."
        />

        <ProfileSection
          label="Watch History"
          titles={watchHistory}
          variant="poster"
          emptyMessage="Your watch history will appear here."
        />
      </div>

      {/* ── Plan card ── */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 mt-6">
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-white/8 p-8 bg-surface-raised"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {/* Ambient */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-brand-orange/5 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-semibold text-lg">
                {MOCK_USER.plan} Plan
              </h3>
              <p className="text-ink-muted text-sm mt-1">
                Unlimited 4K streaming · Downloads · No ads
              </p>
            </div>
            <button
              className="flex-shrink-0 px-6 py-3 rounded-xl text-black font-semibold text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
              }}
            >
              Manage Plan
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
