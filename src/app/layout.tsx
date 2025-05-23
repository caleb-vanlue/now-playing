import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MediaDataProvider } from "../components/MediaDataContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Now Playing",
  description: "A dashboard for your media library",
  icons: {
    icon: "/favicon-32x32.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body
        className={`${inter.variable} antialiased bg-[#141414] text-white font-sans`}
      >
        <MediaDataProvider>{children}</MediaDataProvider>{" "}
      </body>
    </html>
  );
}
