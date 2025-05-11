import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MediaDataProvider } from "../components/MediaDataContext";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Now Playing",
  description: "A dashboard for your media library",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} antialiased bg-[#141414] text-white font-sans`}
      >
        <Analytics />
        <MediaDataProvider>{children}</MediaDataProvider>{" "}
      </body>
    </html>
  );
}
