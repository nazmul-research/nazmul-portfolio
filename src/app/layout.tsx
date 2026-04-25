import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/navbar";
import CursorFollower from "@/components/cursor-follower";
import CustomCursor from "@/components/custom-cursor";
import SpatialBackground from "@/components/spatial-background";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nazmul Islam — Portfolio",
    template: "%s | Nazmul Islam",
  },
  description: "AI, Robotics, and Product Engineering portfolio",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Nazmul Islam — Portfolio",
    description: "AI, Robotics, and Product Engineering portfolio",
    url: siteUrl,
    siteName: "Nazmul Portfolio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Nazmul Islam portfolio cover",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nazmul Islam — Portfolio",
    description: "AI, Robotics, and Product Engineering portfolio",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" }, select: { themePreset: true } });
  const themePreset = settings?.themePreset || "midnight-tech";

  return (
    <html lang="en">
      <body className="text-zinc-100">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black">
          Skip to content
        </a>
        <Navbar />
        <CursorFollower />
        <CustomCursor />
        <SpatialBackground />
        {children}
        <footer className="mt-12 border-t border-white/10 py-6 text-center text-sm text-zinc-400">© 2026 Nazmul</footer>

        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}

        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL && (
          <Script
            defer
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
          />
        )}
      </body>
    </html>
  );
}
