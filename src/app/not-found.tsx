"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <p className="brand-text text-display font-bold text-[120px] md:text-[160px] leading-none tracking-tight select-none">
          404
        </p>
        <h1 className="text-white text-2xl font-semibold mt-2 mb-3">
          Lost in the credits?
        </h1>
        <p className="text-ink-muted text-sm mb-8 leading-relaxed">
          The title you're looking for doesn't exist, was removed, or is
          unavailable in your region.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 bg-white text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all text-sm"
          >
            <Home size={15} />
            Go Home
          </Link>
          <Link
            href="/search"
            className="flex items-center gap-2 glass text-white font-medium px-5 py-2.5 rounded-xl hover:bg-white/10 transition-all text-sm"
          >
            <Search size={15} />
            Search
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
