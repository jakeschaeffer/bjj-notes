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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white text-zinc-900">
      <header className="border-b border-amber-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Grapple Graph
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex flex-wrap gap-3 text-sm font-medium text-zinc-600">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-1 transition hover:bg-amber-100/80 hover:text-zinc-900"
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
