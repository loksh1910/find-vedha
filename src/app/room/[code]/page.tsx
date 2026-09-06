import { LobbyClient } from "@/components/lobby/lobby-client";

export default async function LobbyPage({ params, searchParams }: PageProps<"/room/[code]">) {
  const { code } = await params;
  const sp = await searchParams;
  return <LobbyClient code={code.toUpperCase()} solo={sp?.solo === "1"} />;
}
