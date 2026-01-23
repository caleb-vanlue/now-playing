import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { MediaDataProvider } from "../components/MediaDataContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const customFont = localFont({
  src: "../../public/fonts/font.otf",
  variable: "--font-custom",
  display: "swap",
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
        className={`${customFont.variable} ${inter.variable} antialiased bg-[#141414] text-white`}
        style={{
          fontFamily: "var(--font-custom), var(--font-inter), sans-serif",
        }}
      >
        <MediaDataProvider>{children}</MediaDataProvider>{" "}
      </body>
    </html>
  );
}
