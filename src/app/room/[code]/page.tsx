import { LobbyClient } from "@/components/lobby/lobby-client";

export default async function LobbyPage({ params }: PageProps<"/room/[code]">) {
  const { code } = await params;
  return <LobbyClient code={code.toUpperCase()} />;
}
