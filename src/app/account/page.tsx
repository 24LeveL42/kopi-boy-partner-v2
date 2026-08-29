import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6" style={{ background: "var(--kb-navy)", color: "var(--kb-on-navy)" }}>
      <div className="mx-auto max-w-sm">
        <h1 className="font-display text-xl font-bold">Account</h1>
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-lg" style={{ color: "var(--kb-ink)" }}>
          <p className="text-sm" style={{ color: "var(--kb-ink-soft)" }}>Signed in as</p>
          <p className="mt-1 font-semibold">{user?.email}</p>
          {profile && (
            <p className="mt-1 text-sm capitalize" style={{ color: "var(--kb-ink-soft)" }}>
              Role: {profile.role}
            </p>
          )}
          <div className="mt-5">
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
