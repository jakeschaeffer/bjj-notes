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
    <div className="grain-overlay relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff,transparent_55%),linear-gradient(160deg,var(--surface-3),var(--background))] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-3xl" />
        <div className="absolute -bottom-32 right-[-120px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(26,20,16,0.16),transparent)] blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[var(--line)] bg-[var(--surface)]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-display text-2xl">BJJ</span>
            <span className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
              Notes
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-transparent px-3 py-2 transition hover:border-[var(--line-strong)] hover:text-[var(--foreground)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <AccountActions />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}
