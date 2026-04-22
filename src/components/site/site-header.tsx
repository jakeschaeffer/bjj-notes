"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountActions } from "@/components/auth/account-actions";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/log", label: "Log" },
  { href: "/sessions", label: "Sessions" },
  { href: "/techniques", label: "Techniques" },
  { href: "/progress", label: "Progress" },
  { href: "/taxonomy", label: "Taxonomy" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close menu on route change; pathname is the external signal.
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" onClick={() => setMenuOpen(false)}>
            Grapple Graph
          </Link>
          <nav className="site-nav-desktop" aria-label="Primary">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href ||
                    pathname?.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`site-nav-link ${active ? "is-active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="site-actions-desktop">
            <AccountActions />
          </div>
          <button
            type="button"
            className="site-hamburger"
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="site-hamburger-bars" data-open={menuOpen}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>
      {menuOpen && (
        <>
          <button
            type="button"
            className="site-menu-scrim"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div id="site-mobile-menu" className="site-mobile-menu" role="dialog">
            <nav aria-label="Primary mobile">
              {NAV_LINKS.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href ||
                      pathname?.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`site-mobile-link ${active ? "is-active" : ""}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="site-mobile-actions">
              <AccountActions />
            </div>
          </div>
        </>
      )}
    </>
  );
}
