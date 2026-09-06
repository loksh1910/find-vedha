import type { ReactNode } from "react";
import { MediaProvider } from "@/components/providers/media-provider";

/**
 * Shared across the lobby (`/room/[code]`) and the game (`/room/[code]/play`),
 * so the camera/mic the viewer turns on in the lobby carries into the game.
 */
export default function RoomLayout({ children }: { children: ReactNode }) {
  return <MediaProvider>{children}</MediaProvider>;
}
