import { requireUser } from "@/lib/auth";
import { OnboardingClient } from "./OnboardingClient";

// Full-screen route OUTSIDE the (app) group — no sidebar / tab-bar (like /login).
// A logged-in user lands here; the (app) layout gate sends new hires in.
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser();

  // Already-onboarded users may replay the tour by visiting /onboarding directly
  // (e.g. a "Пройти заново" link from the profile) — nothing to redirect.
  const firstName = user.name.split(" ")[0] ?? "";

  return <OnboardingClient firstName={firstName} />;
}
