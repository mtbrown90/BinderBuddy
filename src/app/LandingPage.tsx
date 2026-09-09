import Link from "next/link";
import {
  LayoutGrid,
  Wallet,
  Store,
  MessagesSquare,
  Sparkles,
  FileDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Logo from "@/components/Logo";

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Every official set, tracked",
    body: "Browse every Pokémon TCG set ever printed and check off what you own, card by card and variation by variation.",
  },
  {
    icon: Wallet,
    title: "Build your own Master Sets",
    body: "Curate a checklist for anything — every Piplup ever printed, every Water-type, every card by one artist. Auto-populate it in one purchase.",
  },
  {
    icon: TrendingUp,
    title: "Live market pricing",
    body: "Every card shows current market value, so you always know what your binder — and your next pickup — is worth.",
  },
  {
    icon: FileDown,
    title: "Printable placeholder PDFs",
    body: "Generate cut-out placeholders for exactly what's missing from a set, ready to slot into empty binder pockets.",
  },
  {
    icon: Users,
    title: "Trade and connect",
    body: "Mark cards for trade, message other collectors, and find local events on the community calendar.",
  },
  {
    icon: Store,
    title: "Free to start",
    body: "Your first Master Set is free. From there, buy exactly what you need or subscribe for unlimited.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-16 pb-8">
      <section className="flex flex-col items-center text-center gap-5 pt-6">
        <Logo size={120} />
        <div className="flex flex-col gap-3 max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Your complete Pokémon collector
          </h1>
          <p className="text-muted text-base">
            Track every card you own across official sets and custom checklists, know what
            it&apos;s worth, and connect with other collectors — all in one place.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none">
          <Link
            href="/signup"
            className="brand-gradient text-[#0b0c14] font-bold rounded-lg px-6 py-3 text-center"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="border border-border text-ink font-semibold rounded-lg px-6 py-3 text-center hover:bg-panel-2"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col gap-2 bg-panel border border-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-2">
              <Icon size={18} className="text-teal" />
              <h2 className="font-semibold text-ink text-sm">{title}</h2>
            </div>
            <p className="text-muted text-sm">{body}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col items-center text-center gap-4 bg-panel border border-border rounded-2xl p-8">
        <Sparkles size={22} className="text-teal" />
        <h2 className="text-xl font-bold text-ink">Ready to see what you&apos;ve got?</h2>
        <p className="text-muted text-sm max-w-sm">
          Create a free account and start checking off your collection in minutes.
        </p>
        <Link
          href="/signup"
          className="brand-gradient text-[#0b0c14] font-bold rounded-lg px-6 py-3"
        >
          Get started free
        </Link>
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-teal font-medium">
            Log in
          </Link>
        </p>
      </section>

      <footer className="flex items-center justify-center gap-1 text-xs text-muted">
        <MessagesSquare size={13} /> Built for collectors, by collectors.
      </footer>
    </div>
  );
}
