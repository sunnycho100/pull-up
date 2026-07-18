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
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>People</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
          Everyone here this week.
        </p>
      </header>
      <PeopleBrowser people={people ?? []} meId={user.id} />
    </section>
  );
}
