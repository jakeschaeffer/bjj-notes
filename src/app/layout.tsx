import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono, Saira_Condensed } from "next/font/google";
import "./globals.css";

const displayFont = Saira_Condensed({
  variable: "--font-gg-display",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const bodyFont = IBM_Plex_Sans({
  variable: "--font-gg-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-gg-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Grapple Graph",
  description: "Log grappling sessions fast and spot patterns that win rounds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
