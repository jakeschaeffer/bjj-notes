import Link from "next/link";

import { AuthGuard } from "@/components/auth/auth-guard";
import { AccountActions } from "@/components/auth/account-actions";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/log", label: "Log" },
  { href: "/sessions", label: "Sessions" },
  { href: "/techniques", label: "Techniques" },
  { href: "/progress", label: "Progress" },
  { href: "/taxonomy", label: "Taxonomy" },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--gg-bg)] text-[var(--gg-text)] gg-mat-grid">
      <header className="border-b border-[var(--gg-border)] bg-[rgba(11,15,19,0.92)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="font-display text-xl font-semibold tracking-[0.12em] text-[var(--gg-text)]">
            Grapple Graph
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-text-muted)]">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-transparent px-3 py-2 transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-signal)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <AccountActions />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}
