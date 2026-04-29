"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function UploadSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-16">
      <motion.div
        className="text-center max-w-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Check mark */}
        <div
          className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #e53e2a, #f5c518)" }}
        >
          <Check size={32} className="text-black" strokeWidth={2.5} />
        </div>

        <h1 className="text-display font-bold text-4xl text-white mb-4 tracking-tight">
          Submission received.
        </h1>
        <p className="text-ink-muted text-base leading-relaxed mb-2">
          Our team will review your project assets and follow up with next steps.
        </p>
        <p className="text-ink-faint text-sm">
          In the meantime, keep building.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href="/creators"
            className="px-6 py-3 glass rounded-xl text-sm font-medium text-ink-muted hover:text-white transition-all"
          >
            Back to Creators
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl text-black font-semibold text-sm transition-all active:scale-95"
            style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
          >
            Back to ShangoMaji
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
