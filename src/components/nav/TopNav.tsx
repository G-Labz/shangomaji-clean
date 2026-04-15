"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, User, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home",     href: "/" },
  { label: "Browse",   href: "/browse" },
  { label: "Creators", href: "/creators" },
  { label: "My List",  href: "/profile" },
  { label: "Why",      href: "/why" },
{ label: "Creator Studio", href: "/creators/login" }];

export function TopNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled
            ? "rgba(7,6,8,0.97)"
            : "linear-gradient(to bottom, rgba(4,3,5,0.88) 0%, rgba(4,3,5,0.4) 70%, transparent 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: scrolled
            ? "1px solid rgba(229,62,42,0.22)"
            : "1px solid rgba(229,62,42,0.08)",
          boxShadow: scrolled
            ? "0 4px 80px rgba(229,62,42,0.10), 0 1px 0 rgba(245,197,24,0.06)"
            : "0 2px 40px rgba(0,0,0,0.3)",
        }}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Brand gradient top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #e53e2a 20%, #f07030 50%, #f5c518 80%, transparent 100%)",
            opacity: 0.85,
          }} />

        <div className="max-w-[1600px] mx-auto px-6 md:px-10 h-[68px] flex items-center justify-between gap-6">

          {/* Logo + Wordmark lockup */}
          <Link href="/" className="flex-shrink-0 group flex items-center gap-3">
            {/* Logo mark — transparent, blends into nav */}
            <img
              src="/logo.png"
              alt="ShangoMaji"
              className="h-8 w-auto object-contain transition-all duration-300 group-hover:opacity-85"
              style={{
                filter: "drop-shadow(0 0 10px rgba(229,62,42,0.5)) drop-shadow(0 0 3px rgba(245,197,24,0.2))",
              }}
            />
            {/* Wordmark — brand gradient, not white */}
            <span
              className="hidden sm:block font-bold leading-none transition-opacity duration-300 group-hover:opacity-80"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                letterSpacing: "0.16em",
                background: "linear-gradient(90deg, #e8622a 0%, #f07830 40%, #f0a832 75%, #e8c048 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              SHANGOMAJI
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    active ? "text-white" : label === "Why"
                      ? "hover:text-white/80"
                      : "text-white/45 hover:text-white/80"
                  }`}
                  style={label === "Why" && !active ? {
                    background: "linear-gradient(90deg, #f07030, #f5c518)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  } : {}}
                >
                  {label}
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, rgba(229,62,42,0.18), rgba(240,112,48,0.10))",
                        border: "1px solid rgba(229,62,42,0.28)",
                        boxShadow: "0 0 20px rgba(229,62,42,0.12) inset",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Link href="/search"
              className="p-2.5 rounded-lg transition-all duration-200"
              style={{ color: "rgba(255,255,255,0.45)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              aria-label="Search">
              <Search size={18} />
            </Link>

            <div className="hidden md:flex">
              <div
                className="p-2.5"
                style={{ color: "rgba(255,255,255,0.2)", cursor: "default" }}
                aria-hidden="true"
              >
                <Bell size={18} />
              </div>
            </div>

            <Link href="/profile" className="ml-1.5 group" aria-label="Profile">
              <div className="w-8 h-8 rounded-full p-[1.5px] transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #e53e2a, #f07030, #f5c518)",
                  boxShadow: "0 0 16px rgba(229,62,42,0.4)",
                }}>
                <div className="w-full h-full rounded-full flex items-center justify-center"
                  style={{ background: "rgba(10,8,9,0.95)" }}>
                  <User size={14} className="text-white/60 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Link>

            <button
              className="md:hidden p-2.5 rounded-lg text-white/45 hover:text-white transition-colors ml-1"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col pt-20 px-6"
            style={{
              background: "rgba(7,6,8,0.98)",
              backdropFilter: "blur(28px)",
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Mobile menu brand atmosphere */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full"
                style={{ background: "radial-gradient(circle at 80% 20%, rgba(245,197,24,0.08) 0%, transparent 60%)" }} />
              <div className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full"
                style={{ background: "radial-gradient(circle at 20% 80%, rgba(229,62,42,0.10) 0%, transparent 60%)" }} />
            </div>

            <nav className="flex flex-col gap-1.5 mt-4 relative z-10">
              {NAV_LINKS.map(({ label, href }, i) => (
                <motion.div key={href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}>
                  <Link href={href}
                    className="block px-5 py-4 text-2xl font-semibold rounded-2xl transition-all"
                    style={pathname === href ? {
                      color: "white",
                      background: "linear-gradient(135deg, rgba(229,62,42,0.15), rgba(240,112,48,0.08))",
                      border: "1px solid rgba(229,62,42,0.25)",
                      textShadow: "0 0 30px rgba(245,197,24,0.2)",
                    } : {
                      color: "rgba(255,255,255,0.45)",
                    }}>
                    {label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28, duration: 0.3 }}>
                <Link href="/search"
                  className="flex items-center gap-3 px-5 py-4 text-2xl font-semibold rounded-2xl transition-all"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  <Search size={22} />
                  Search
                </Link>
              </motion.div>
            </nav>

            {/* Brand tagline at bottom of mobile menu */}
            <div className="absolute bottom-12 left-6 right-6">
              <div className="brand-divider mb-4" />
              <p className="text-white/20 text-xs uppercase tracking-[0.2em]">Anime's Next Wave</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
