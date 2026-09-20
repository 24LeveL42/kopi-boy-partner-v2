"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ onlyWhenSignedIn = false }: { onlyWhenSignedIn?: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  // For pages that render for signed-out visitors too (404, crash screen):
  // stay hidden until the browser session confirms someone is signed in.
  const [signedIn, setSignedIn] = useState(!onlyWhenSignedIn);

  useEffect(() => {
    if (!onlyWhenSignedIn) return;
    let live = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (live) setSignedIn(!!data.session);
      });
    return () => {
      live = false;
    };
  }, [onlyWhenSignedIn]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!signedIn) return null;

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full rounded-xl py-2.5 text-sm font-medium"
      style={{ background: "var(--kb-cream)", color: "var(--kb-ink)" }}
    >
      Sign out
    </button>
  );
}
