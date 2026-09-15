import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "CourtHub — Book Sports Courts Instantly",
    template: "%s | CourtHub",
  },
  description:
    "Discover and book premium sports courts near you. Badminton, Tennis, Futsal, Basketball, Cricket — all in one platform. Instant booking, real-time availability.",
  keywords: [
    "sports court booking",
    "badminton court",
    "tennis court",
    "futsal booking",
    "basketball court",
    "cricket ground",
    "online booking",
    "CourtHub",
  ],
  authors: [{ name: "CourtHub" }],
  openGraph: {
    title: "CourtHub — Book Sports Courts Instantly",
    description:
      "Discover and book premium sports courts near you. Instant booking, real-time availability.",
    type: "website",
    locale: "en_US",
    siteName: "CourtHub",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
