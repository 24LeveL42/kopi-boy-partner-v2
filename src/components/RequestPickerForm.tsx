"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PickupRequestWithKitchen } from "@/lib/types-picker";

interface KitchenOption {
  id: string;
  business_name: string;
  neighbourhood: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Waiting for a picker",
  accepted: "Picker on the way",
  completed: "Handed off",
  cancelled: "Cancelled",
};

export function RequestPickerForm({
  userId,
  kitchens,
  myRequests,
}: {
  userId: string;
  kitchens: KitchenOption[];
  myRequests: PickupRequestWithKitchen[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [kitchenId, setKitchenId] = useState(kitchens[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kitchenId) return;
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("pickup_requests").insert({
      rider_id: userId,
      kitchen_id: kitchenId,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.refresh();
  }

  const openOrActive = myRequests.filter((r) => r.status === "open" || r.status === "accepted");

  return (
    <div>
      {openOrActive.length > 0 ? (
        <div className="space-y-2">
          {openOrActive.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
              <p className="text-sm font-semibold">{r.kitchen_business_name}</p>
              <p className="text-xs" style={{ color: "var(--kb-ink-soft)" }}>{r.kitchen_neighbourhood}</p>
              <p className="mt-2 text-xs font-medium" style={{ color: r.status === "accepted" ? "var(--kb-green-deep)" : "var(--kb-warn)" }}>
                {STATUS_LABEL[r.status]}
              </p>
              {r.status === "accepted" && (
                <p className="mt-1 text-xs" style={{ color: "var(--kb-ink-soft)" }}>
                  Pay the picker directly when they hand off the food (suggested ${r.suggested_fee.toFixed(2)}).
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
          <label className="block text-xs font-medium" style={{ color: "var(--kb-ink-soft)" }}>
            Which kitchen is this pickup for?
          </label>
          <select
            value={kitchenId}
            onChange={(e) => setKitchenId(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ borderColor: "#E5E7EB" }}
          >
            {kitchens.map((k) => (
              <option key={k.id} value={k.id}>
                {k.business_name} — {k.neighbourhood}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs" style={{ color: "var(--kb-ink-soft)" }}>
            Suggested fee $2.00, paid directly to the picker — not through Kopi Boy.
          </p>
          <button
            type="submit"
            disabled={loading || !kitchenId}
            className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, var(--kb-purple) 0%, var(--kb-green) 100%)" }}
          >
            {loading ? "Requesting…" : "Request a picker"}
          </button>
          {error && (
            <p className="mt-2 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#B91C1C" }}>
              {error}
            </p>
          )}
        </form>
      )}

      {myRequests.some((r) => r.status === "completed") && (
        <p className="mt-4 text-xs" style={{ color: "var(--kb-on-navy-soft)" }}>
          Your completed pickups are handled — continue the delivery as normal.
        </p>
      )}
    </div>
  );
}
