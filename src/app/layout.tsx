import type { Metadata } from "next";
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
