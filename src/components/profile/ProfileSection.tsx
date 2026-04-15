"use client";

import { motion } from "framer-motion";
import { ContentRow } from "@/components/home/ContentRow";
import type { Title } from "@/data/mockData";

interface ProfileSectionProps {
  label: string;
  titles: Title[];
  variant?: "poster" | "landscape";
  showProgress?: boolean;
  emptyMessage?: string;
}

export function ProfileSection({
  label,
  titles,
  variant = "poster",
  showProgress = false,
  emptyMessage = "Nothing here yet.",
}: ProfileSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="mb-12"
    >
      {titles.length === 0 ? (
        <div className="px-6 md:px-10">
          <h2 className="text-white font-semibold text-lg tracking-tight mb-4">
            {label}
          </h2>
          <div className="border border-white/5 rounded-2xl p-10 text-center">
            <p className="text-ink-faint text-sm">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <ContentRow
          label={label}
          titles={titles}
          variant={variant}
          showProgress={showProgress}
        />
      )}
    </motion.div>
  );
}
