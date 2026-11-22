"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Gift,
  Menu,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  X,
  LogOut,
  Wrench,
} from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { he } from "@/lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, mode, users, switchDemoUser, logoutUser, notifications } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = currentUser
    ? notifications.filter((n) => n.user_id === currentUser.id && !n.read_at).length
    : 0;

  const isStaff =
    currentUser?.roles.includes("admin") || currentUser?.roles.includes("content_manager");

  const navLinks = [
    { href: "/", label: he.nav.home },
    { href: "/stores", label: he.nav.stores },
    { href: "/benefits/new", label: he.nav.publish },
    { href: "/suggest-store", label: "הצעת חנות" },
    { href: "/contact", label: "צור קשר" },
    { href: "/safety", label: he.nav.safety },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#e6dcfb]/80 bg-[#f7f3ff]/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-extrabold text-lg text-[#3b226b] hover:opacity-90"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9aef5] to-[#f6d469] text-[#3b226b] shadow-sm">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block">{he.brand.name}</span>
            <span className="block text-[11px] font-medium text-[#66548a]">
              {he.brand.tagline}
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="ניווט ראשי" className="hidden items-center gap-1 md:flex">
          {navLinks.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#e9dffc] text-[#3b226b] font-semibold"
                    : "text-[#4e3f69] hover:bg-[#efe7fe] hover:text-[#3b226b]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {isStaff && (
            <Link
              href="/admin"
              className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                pathname?.startsWith("/admin")
                  ? "bg-[#f6d469] text-[#3d2803]"
                  : "bg-[#fef6d8] text-[#4a3204] hover:bg-[#f6d469]"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              {he.nav.admin}
            </Link>
          )}
        </nav>

        {/* Actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          {mode === "demo" && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#d9c7f8] bg-white/80 px-2.5 py-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#6c46c1]" aria-hidden="true" />
              <label htmlFor="demo-user-select" className="sr-only">
                החלפת משתמש הדגמה
              </label>
              <select
                id="demo-user-select"
                value={currentUser?.id ?? ""}
                onChange={(e) => switchDemoUser(e.target.value || null)}
                className="bg-transparent font-medium text-[#3b226b] outline-none cursor-pointer"
              >
                <option value="">אורח (לא מחובר)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentUser ? (
            <>
              <Link
                href="/dashboard"
                className="relative flex items-center gap-2 rounded-full border border-[#dfd2fb] bg-white px-3.5 py-2 text-sm font-semibold text-[#3b226b] hover:bg-[#f3ecff]"
              >
                <UserCircle2 className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
                <span>{currentUser.display_name}</span>
                {unreadCount > 0 && (
                  <span
                    aria-label={`${unreadCount} התראות שלא נקראו`}
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f6d469] px-1 text-[11px] font-bold text-[#3d2803]"
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => void logoutUser()}
                aria-label={he.nav.logout}
                title={he.nav.logout}
                className="rounded-full p-2 text-[#5a4c73] hover:bg-[#efe7fe] hover:text-[#3b226b]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#4b2e83] hover:bg-[#efe7fe]"
              >
                {he.nav.login}
              </Link>
              <Link
                href="/auth/register"
                className="clay-btn-primary px-4 py-2 text-sm font-semibold"
              >
                {he.nav.register}
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "סגירת תפריט" : "פתיחת תפריט"}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-[#e6dcfb] text-[#3b226b] md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-[#e6dcfb] bg-white px-4 pb-5 pt-3 md:hidden">
          <nav aria-label="תפריט נייד" className="flex flex-col gap-1.5">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#3b226b] hover:bg-[#f3ecff]"
              >
                {item.label}
              </Link>
            ))}
            {isStaff && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl bg-[#fef6d8] px-3 py-2.5 text-sm font-semibold text-[#4a3204]"
              >
                ממשק ניהול
              </Link>
            )}
          </nav>

          <div className="mt-4 flex flex-col gap-2 border-t border-[#efe7fe] pt-4">
            {mode === "demo" && (
              <div className="flex items-center justify-between rounded-xl bg-[#f7f3ff] px-3 py-2 text-xs">
                <span className="font-semibold text-[#5a4c73]">משתמש הדגמה:</span>
                <select
                  value={currentUser?.id ?? ""}
                  onChange={(e) => switchDemoUser(e.target.value || null)}
                  className="bg-transparent font-semibold text-[#3b226b]"
                >
                  <option value="">אורח</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentUser ? (
              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#4b2e83] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Bell className="h-4 w-4" />
                  האזור האישי ({unreadCount})
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void logoutUser();
                    setMobileOpen(false);
                  }}
                  className="rounded-full border border-[#e6dcfb] px-4 py-2.5 text-sm font-semibold text-[#4b2e83]"
                >
                  {he.nav.logout}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-full border border-[#d6c5f7] py-2.5 text-center text-sm font-semibold text-[#4b2e83]"
                >
                  {he.nav.login}
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 clay-btn-primary py-2.5 text-center text-sm font-semibold"
                >
                  {he.nav.register}
                </Link>
              </div>
            )}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#66548a]">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#4b2e83]" />
            ללא שיתוף סיסמאות, קודי אימות או פרטי אשראי.
          </p>
        </div>
      )}
    </header>
  );
}
