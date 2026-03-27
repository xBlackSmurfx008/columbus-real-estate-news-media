import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./cren-v2.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Columbus Real Estate News — Rent, Buy & Invest Local",
  description:
    "Columbus Ohio's boutique real estate platform. Hyper-local market data, neighborhood guides, and trusted community journalism for renters, buyers, and investors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable} ${spaceGrotesk.variable}`}>
      <body className="cren-theme font-sans antialiased">
        <header className="relative z-[1100]">
          <SiteHeader />
        </header>
        <main className="cren-main relative z-0">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
