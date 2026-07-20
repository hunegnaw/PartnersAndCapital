import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import { OrganizationProvider } from "@/components/providers/organization-provider";
import { FontLoader } from "@/components/providers/font-loader";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves relative Open Graph / Twitter image URLs (e.g. /uploads/media/…)
  // to absolute URLs. Without this, social scrapers like Facebook get a
  // localhost/relative og:image and can't fetch the blog hero image.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://partnersandcapital.com"
  ),
  title: "Partners + Capital",
  description: "Investor Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GoogleTagManager />
        <SessionProvider>
          <OrganizationProvider>
            <FontLoader />
            {children}
          </OrganizationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
