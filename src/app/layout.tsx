import type { Metadata } from "next";
import { Bricolage_Grotesque, Poppins, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/components/providers/app-state-provider";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Find Vedha",
  description:
    "A hidden-chase party game on a stylised Chennai transit map. Make a private room, one of you is Vedha, the Detectives hunt.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${poppins.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
