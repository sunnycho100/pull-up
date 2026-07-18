import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/server";
import OnboardingClient from "@/components/onboarding/OnboardingClient";

export default async function WelcomePage() {
  const { user } = await requireUser();
  return (
    <Suspense>
      <OnboardingClient userId={user.id} />
    </Suspense>
  );
}
