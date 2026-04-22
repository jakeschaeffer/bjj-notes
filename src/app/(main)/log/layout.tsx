import type { ReactNode } from "react";
import { Inter, IBM_Plex_Mono } from "next/font/google";

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

export default function LogLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.variable} ${ibmPlexMono.variable}`}>
      {children}
    </div>
  );
}
