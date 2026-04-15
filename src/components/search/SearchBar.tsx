"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search titles, genres, cast…",
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <motion.div
      className="relative w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Glow ring on focus */}
      <div className="absolute -inset-px rounded-2xl bg-brand-gradient opacity-0 transition-opacity duration-300 peer-focus-within:opacity-100 pointer-events-none" />

      <div className="relative flex items-center bg-surface-raised border border-white/10 rounded-2xl overflow-hidden focus-within:border-transparent focus-within:ring-2 focus-within:ring-brand-orange/50 transition-all duration-300">
        <Search
          size={18}
          className="absolute left-4 text-ink-faint pointer-events-none"
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="peer w-full bg-transparent py-4 pl-11 pr-10 text-white placeholder-ink-faint text-sm outline-none"
          spellCheck={false}
          autoComplete="off"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 p-1.5 text-ink-faint hover:text-white rounded-lg transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
