import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Poppins } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/components/providers/app-state-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { PresenceProvider } from "@/components/providers/presence-provider";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Find Vedha",
  description:
    "A hidden-chase party game on a stylised Chennai transit map. Make a private room, one of you is Vedha, the Detectives hunt.",
  // lets a mobile browser (or a PWABuilder-style Android wrapper) install
  // this as an app — purely additive, changes nothing about the site itself
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#131313",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${poppins.variable} h-full`}
    >
      <body className="min-h-full">
        <SettingsProvider>
          <AppStateProvider>
            <PresenceProvider>{children}</PresenceProvider>
          </AppStateProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
