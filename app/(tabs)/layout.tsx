import TabBar from "@/components/TabBar";
import GuestBanner from "@/components/GuestBanner";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {user?.is_anonymous && <GuestBanner />}
      <main style={{ paddingBottom: 88 }}>{children}</main>
      <TabBar />
    </>
  );
}
