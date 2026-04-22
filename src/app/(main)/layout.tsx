import type { ReactNode } from "react";
import { Inter, IBM_Plex_Mono } from "next/font/google";

import { AuthGuard } from "@/components/auth/auth-guard";
import { SiteHeader } from "@/components/site/site-header";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${ibmPlexMono.variable} app-shell`}
      style={{
        minHeight: "100vh",
        background: "#f5f2ed",
        color: "#1a1815",
        fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <SiteHeader />
      <main className="app-main">
        <AuthGuard>{children}</AuthGuard>
      </main>
      <style>{siteStyles}</style>
    </div>
  );
}

const siteStyles = `
  .app-shell { --ink: #1a1815; --bg: #f5f2ed; --accent: oklch(0.45 0.12 25); --cream: #faf7f1; }
  .app-main {
    max-width: 640px;
    margin: 0 auto;
    padding: 24px 20px 48px;
  }
  .site-header {
    background: #f5f2ed;
    border-bottom: 1px solid rgba(26, 24, 21, 0.12);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .site-header-inner {
    max-width: 640px;
    margin: 0 auto;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .site-brand {
    font-family: var(--font-inter), sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink);
    text-decoration: none;
  }
  .site-nav-desktop { display: none; gap: 18px; align-items: center; }
  .site-nav-link {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(26, 24, 21, 0.55);
    text-decoration: none;
    padding: 4px 0;
    border-bottom: 1px dotted transparent;
    transition: color 0.1s, border-color 0.1s;
  }
  .site-nav-link:hover { color: var(--ink); border-bottom-color: rgba(26, 24, 21, 0.4); }
  .site-nav-link.is-active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
  .site-actions-desktop { display: none; }
  .site-hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid rgba(26, 24, 21, 0.2);
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    padding: 0;
    border-radius: 4px;
  }
  .site-hamburger-bars {
    display: inline-flex;
    flex-direction: column;
    gap: 4px;
    width: 16px;
    height: 12px;
    justify-content: center;
  }
  .site-hamburger-bars span {
    display: block;
    height: 1.5px;
    background: var(--ink);
    transition: transform 0.15s, opacity 0.15s;
    transform-origin: center;
  }
  .site-hamburger-bars[data-open="true"] span:nth-child(1) { transform: translateY(5.5px) rotate(45deg); }
  .site-hamburger-bars[data-open="true"] span:nth-child(2) { opacity: 0; }
  .site-hamburger-bars[data-open="true"] span:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); }
  .site-menu-scrim {
    position: fixed;
    inset: 0;
    top: 64px;
    background: rgba(26, 24, 21, 0.35);
    border: none;
    padding: 0;
    z-index: 18;
    cursor: pointer;
  }
  .site-mobile-menu {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    background: #f5f2ed;
    border-bottom: 1px solid rgba(26, 24, 21, 0.2);
    z-index: 19;
    padding: 8px 0 16px;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
  }
  .site-mobile-menu nav { display: flex; flex-direction: column; }
  .site-mobile-link {
    font-family: var(--font-inter), sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--ink);
    text-decoration: none;
    padding: 14px 20px;
    border-bottom: 1px dotted rgba(26, 24, 21, 0.08);
  }
  .site-mobile-link:hover { background: rgba(26, 24, 21, 0.04); }
  .site-mobile-link.is-active { color: var(--accent); }
  .site-mobile-actions {
    padding: 14px 20px 0;
    border-top: 1px solid rgba(26, 24, 21, 0.12);
    margin-top: 4px;
  }
  @media (min-width: 768px) {
    .app-main { max-width: 960px; }
    .site-header-inner { max-width: 960px; }
    .site-nav-desktop { display: flex; }
    .site-actions-desktop { display: flex; }
    .site-hamburger { display: none; }
    .site-menu-scrim, .site-mobile-menu { display: none !important; }
  }
`;
