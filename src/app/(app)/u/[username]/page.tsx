import { ProfileScreen } from "@/components/profile/profile-screen";

export default async function UserProfilePage({
  params,
}: PageProps<"/u/[username]">) {
  const { username } = await params;
  return <ProfileScreen username={decodeURIComponent(username)} />;
}
