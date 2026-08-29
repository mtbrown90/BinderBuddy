"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Wallet, FolderPlus, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/", label: "Dashboard", icon: Wallet },
  { href: "/sets", label: "Sets", icon: LayoutGrid },
  { href: "/collection", label: "Collection", icon: FolderPlus },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="hidden md:flex items-center justify-between border-b border-border px-6 py-4 max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-2 font-semibold text-xl">
          <span className="h-2.5 w-2.5 rounded-full brand-gradient" />
          BinderBuddy
        </div>
        <nav className="flex gap-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  active ? "bg-panel-2 text-ink border border-border" : "text-muted hover:text-ink"
                }`}
              >
                <Icon size={15} /> {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-muted hover:text-bad"
        >
          <LogOut size={15} /> Log out
        </button>
      </header>

      <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="h-2 w-2 rounded-full brand-gradient" />
          BinderBuddy
        </div>
        <button onClick={logout} className="text-muted">
          <LogOut size={18} />
        </button>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-border flex justify-around py-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-[11px] font-medium ${
                active ? "text-teal" : "text-muted"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
