import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/LoginForm";
import { ApplyForm } from "@/components/ApplyForm";
import { StatusScreen } from "@/components/StatusScreen";
import { PartnerShell } from "@/components/PartnerShell";
import type { Profile, CookApplication, RiderApplication } from "@/lib/types-auth";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginForm />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Approved and active partner — show the real cook/rider shell.
  if (profile && (profile.role === "cook" || profile.role === "rider")) {
    if (!profile.is_active) {
      return (
        <StatusScreen
          tone="danger"
          title="Account temporarily blocked"
          message="Your partner account has been temporarily blocked. Contact Kopi Boy support for details."
        />
      );
    }
    return <PartnerShell defaultView={profile.role} />;
  }

  // Not yet a cook/rider — check for an existing application.
  const [{ data: cookApp }, { data: riderApp }] = await Promise.all([
    supabase
      .from("cook_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<CookApplication>(),
    supabase
      .from("rider_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<RiderApplication>(),
  ]);

  const latestApp = [cookApp, riderApp]
    .filter(Boolean)
    .sort((a, b) => new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime())[0];

  if (latestApp?.status === "pending") {
    return (
      <StatusScreen
        tone="warning"
        title="Application under review"
        message="Thanks for applying! Kopi Boy HQ is reviewing your application — we'll let you know once it's approved."
      />
    );
  }

  if (latestApp?.status === "rejected") {
    return (
      <StatusScreen
        tone="danger"
        title="Application not approved"
        message="Your application wasn't approved this time. Contact Kopi Boy support if you'd like to know more or reapply."
      />
    );
  }

  // No application yet — show the sign-up form.
  return <ApplyForm userId={user.id} />;
}
