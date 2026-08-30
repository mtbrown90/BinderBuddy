"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/community", label: "Boards" },
  { href: "/community/calendar", label: "Calendar" },
  { href: "/community/trading", label: "Trading" },
  { href: "/community/messages", label: "Messages" },
];

export default function CommunityTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-4">
      {TABS.map(({ href, label }) => {
        const active = href === "/community" ? pathname === "/community" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-semibold rounded-full px-3.5 py-1.5 border ${
              active ? "bg-panel-2 text-ink border-border" : "text-muted border-transparent"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
