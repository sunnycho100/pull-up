import { requireUser } from "@/lib/supabase/server";
import PeopleBrowser from "@/components/PeopleBrowser";

export default async function PeoplePage() {
  const { user, supabase } = await requireUser();

  const { data: people } = await supabase
    .from("directory_profiles")
    .select("id, name, photo_url, school, position, interests, bio")
    .order("name");

  return (
    <section style={{ padding: "24px 20px" }}>
      <header className="page-head">
        <p className="page-kicker">UKC 2026</p>
        <h1 className="page-title">People</h1>
        <p className="page-sub">Everyone here this week.</p>
      </header>
      <PeopleBrowser people={people ?? []} meId={user.id} />
    </section>
  );
}
