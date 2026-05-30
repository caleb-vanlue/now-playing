import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { MediaDataProvider } from "../components/MediaDataContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import ServiceWorkerRegistrar from "../components/ServiceWorkerRegistrar";

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
  description: "Real-time dashboard for your media streams",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Now Playing",
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("now-playing-theme"),bg=t==="plex"?"#141414":"#0d1117";document.documentElement.style.background=bg;var m=document.createElement("meta");m.name="theme-color";m.content=bg;document.head.appendChild(m);if(t==="plex")document.documentElement.setAttribute("data-theme","plex")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${customFont.variable} ${inter.variable} antialiased text-white`}
        style={{
          fontFamily: "var(--font-custom), var(--font-inter), sans-serif",
        }}
      >
        <ServiceWorkerRegistrar />
        <ThemeProvider>
          <MediaDataProvider>{children}</MediaDataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
