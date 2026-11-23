import React from "react";
import Link from "next/link";
import { Gift } from "lucide-react";
import { he } from "@/lib/i18n";

const groups: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "הקהילה",
    links: [
      { href: "/stores", label: "חנויות והטבות" },
      { href: "/benefits/new", label: "פרסום הטבה" },
      { href: "/suggest-store", label: "הצעת חנות" },
      { href: "/contact", label: "צור קשר" },
    ],
  },
  {
    title: "מידע ותקנון",
    links: [
      { href: "/safety", label: "בטיחות בעסקה" },
      { href: "/legality", label: "שער החוקיות" },
      { href: "/takedown", label: "הסרת חנות" },
      { href: "/legal/terms", label: "תנאי שימוש" },
      { href: "/legal/privacy", label: "פרטיות" },
      { href: "/accessibility", label: "נגישות" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-[#e6dcfb] bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 font-extrabold text-[#3b226b]">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#c9aef5] to-[#f6d469]">
              <Gift className="h-4 w-4" aria-hidden="true" />
            </span>
            {he.brand.name}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#66548a]">
            לוח חיבור קהילתי בלבד. אין קשר רשמי לחנויות, ואין העברת סיסמאות, קופונים או פרטי אשראי.
          </p>
          <p className="mt-2 text-[11px] text-[#8a7ca8]">לגילאי 18+ • אזור זמן ישראל</p>
        </div>

        <div className="flex gap-10">
          {groups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-bold text-[#241938]">{group.title}</h2>
              <ul className="mt-2 grid gap-1.5 text-xs text-[#5a4c73]">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-[#4b2e83] hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-[#efe7fe] px-4 py-3 text-center text-[11px] text-[#8a7ca8]">
        © {new Date().getFullYear()} {he.brand.name}
      </div>
    </footer>
  );
}
