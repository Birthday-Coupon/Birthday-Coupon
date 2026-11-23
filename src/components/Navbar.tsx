"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Chrome, Gift, LogOut, Menu, Store, UserCircle2, Wrench, X } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { he } from "@/lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, logoutUser, notifications } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = currentUser
    ? notifications.filter((n) => n.user_id === currentUser.id && !n.read_at).length
    : 0;

  const isStaff =
    currentUser?.roles.includes("admin") || currentUser?.roles.includes("content_manager");

  const links = [
    { href: "/stores", label: he.nav.stores, icon: Store },
    { href: "/extension", label: "תוסף דפדפן", icon: Chrome },
    { href: "/dashboard", label: he.nav.dashboard, icon: UserCircle2 },
  ];

  const isActive = (href: string) => Boolean(pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-[#e6dcfb]/80 bg-[#f7f3ff]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold text-[#3b226b] hover:opacity-90"
          aria-label={he.brand.name}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9aef5] to-[#f6d469] text-[#3b226b] shadow-sm">
            <Gift className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <span className="text-base leading-none">{he.brand.name}</span>
        </Link>

        <nav aria-label="ניווט ראשי" className="hidden items-center gap-1 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative rounded-full px-3.5 py-2 text-sm transition-colors ${
                isActive(item.href)
                  ? "bg-[#e9dffc] font-semibold text-[#3b226b]"
                  : "font-medium text-[#4e3f69] hover:bg-[#efe7fe] hover:text-[#3b226b]"
              }`}
            >
              {item.label}
              {item.href === "/dashboard" && unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} התראות שלא נקראו`}
                  className="absolute -top-0.5 left-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#f6d469] px-1 text-[10px] font-extrabold text-[#3d2803]"
                >
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
          {isStaff && (
            <Link
              href="/admin"
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${
                isActive("/admin")
                  ? "bg-[#f6d469] text-[#3d2803]"
                  : "bg-[#fef6d8] text-[#4a3204] hover:bg-[#f6d469]"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              {he.nav.admin}
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/benefits/new"
            className="clay-btn-butter inline-flex items-center gap-1.5 px-4 py-2 text-sm font-extrabold"
          >
            <Gift className="h-4 w-4" aria-hidden="true" />
            {he.nav.publish}
          </Link>
          {currentUser ? (
            <button
              type="button"
              onClick={() => void logoutUser()}
              aria-label={he.nav.logout}
              title={he.nav.logout}
              className="rounded-full p-2 text-[#66548a] hover:bg-[#efe7fe] hover:text-[#3b226b]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#4b2e83] hover:bg-[#efe7fe]"
            >
              {he.nav.login}
            </Link>
          )}
        </div>

        {/* Mobile: personal area shortcut + menu */}
        <div className="flex items-center gap-1.5 md:hidden">
          <Link
            href={currentUser ? "/dashboard" : "/auth/login"}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e6dcfb] bg-white text-[#3b226b]"
            aria-label={he.nav.dashboard}
          >
            <UserCircle2 className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f6d469] px-1 text-[10px] font-extrabold text-[#3d2803]">
                {unreadCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "סגירת תפריט" : "פתיחת תפריט"}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e6dcfb] bg-white text-[#3b226b]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#e6dcfb] bg-white px-4 pb-4 pt-3 md:hidden">
          <nav aria-label="תפריט נייד" className="flex flex-col gap-1">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[#3b226b] hover:bg-[#f3ecff]"
                >
                  <Icon className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/benefits/new"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[#3b226b] hover:bg-[#f3ecff]"
            >
              <Gift className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
              {he.nav.publish}
            </Link>
          </nav>
          <div className="mt-3 flex gap-2">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  void logoutUser();
                  setMobileOpen(false);
                }}
                className="flex-1 rounded-full border border-[#e6dcfb] py-2 text-sm font-semibold text-[#4b2e83]"
              >
                {he.nav.logout}
              </button>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-full border border-[#d6c5f7] py-2 text-center text-sm font-semibold text-[#4b2e83]"
              >
                {he.nav.login}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
