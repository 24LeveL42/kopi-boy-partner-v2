"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "./TopBar";
import type { PickupRequestWithKitchen } from "@/lib/types-picker";

interface RawRow {
  id: string;
  rider_id: string;
  kitchen_id: string;
  picker_id: string | null;
  status: string;
  suggested_fee: number;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  kitchens: { business_name: string; neighbourhood: string } | null;
}

function toRow(r: RawRow): PickupRequestWithKitchen {
  return {
    id: r.id,
    rider_id: r.rider_id,
    kitchen_id: r.kitchen_id,
    picker_id: r.picker_id,
    status: r.status as PickupRequestWithKitchen["status"],
    suggested_fee: r.suggested_fee,
    created_at: r.created_at,
    accepted_at: r.accepted_at,
    completed_at: r.completed_at,
    kitchen_business_name: r.kitchens?.business_name ?? "Unknown kitchen",
    kitchen_neighbourhood: r.kitchens?.neighbourhood ?? "",
  };
}

export function PickerShell({ userId }: { userId: string }) {
  const supabase = createClient();
  const [openRequests, setOpenRequests] = useState<PickupRequestWithKitchen[]>([]);
  const [myPickup, setMyPickup] = useState<PickupRequestWithKitchen | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: mine } = await supabase
      .from("pickup_requests")
      .select("*, kitchens(business_name, neighbourhood)")
      .eq("picker_id", userId)
      .eq("status", "accepted")
      .maybeSingle<RawRow>();

    if (mine) {
      setMyPickup(toRow(mine));
      setOpenRequests([]);
      setLoading(false);
      return;
    }

    setMyPickup(null);

    const { data: open } = await supabase
      .from("pickup_requests")
      .select("*, kitchens(business_name, neighbourhood)")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .returns<RawRow[]>();

    setOpenRequests((open ?? []).map(toRow));
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    // Deferred so the initial setLoading(true) inside load() doesn't run
    // synchronously as part of the effect's own commit.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function accept(requestId: string) {
    setBusyId(requestId);
    await supabase
      .from("pickup_requests")
      .update({ picker_id: userId, status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("status", "open"); // first to accept wins — a second picker's update matches 0 rows
    setBusyId(null);
    load();
  }

  async function completeHandoff() {
    if (!myPickup) return;
    setBusyId(myPickup.id);
    await supabase
      .from("pickup_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", myPickup.id);
    setBusyId(null);
    load();
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-6" style={{ background: "var(--kb-navy)" }}>
      <TopBar badge="Picker" />

      <h1 className="mt-4 font-display text-lg font-bold" style={{ color: "var(--kb-on-navy)" }}>
        Picker
      </h1>

      {myPickup ? (
        <div className="mt-4 rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
          <p className="text-xs font-medium uppercase" style={{ color: "var(--kb-purple)" }}>
            Your active pickup
          </p>
          <p className="mt-1 text-sm font-semibold">{myPickup.kitchen_business_name}</p>
          <p className="text-xs" style={{ color: "var(--kb-ink-soft)" }}>{myPickup.kitchen_neighbourhood}</p>
          <p className="mt-2 text-xs" style={{ color: "var(--kb-ink-soft)" }}>
            Collect from the cook, meet the rider nearby, and get paid directly by the rider (suggested ${myPickup.suggested_fee.toFixed(2)}).
          </p>
          <button
            onClick={completeHandoff}
            disabled={busyId === myPickup.id}
            className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--kb-green-deep)" }}
          >
            {busyId === myPickup.id ? "Saving…" : "Mark handoff complete"}
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm" style={{ color: "var(--kb-on-navy-soft)" }}>
            Nearby pickup requests from riders
          </p>

          {loading ? (
            <p className="mt-4 text-sm" style={{ color: "var(--kb-on-navy-soft)" }}>Loading…</p>
          ) : openRequests.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white p-4 text-sm" style={{ color: "var(--kb-ink-soft)" }}>
              No open requests right now — check back later.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {openRequests.map((r) => (
                <div key={r.id} className="rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
                  <p className="text-sm font-semibold">{r.kitchen_business_name}</p>
                  <p className="text-xs" style={{ color: "var(--kb-ink-soft)" }}>{r.kitchen_neighbourhood}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--kb-ink-soft)" }}>
                    Suggested ${r.suggested_fee.toFixed(2)} — paid directly by the rider
                  </p>
                  <button
                    onClick={() => accept(r.id)}
                    disabled={busyId === r.id}
                    className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--kb-purple)" }}
                  >
                    {busyId === r.id ? "Accepting…" : "Accept"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={load}
            className="mt-4 w-full rounded-2xl py-2.5 text-sm font-semibold"
            style={{ background: "var(--kb-navy-raised)", color: "var(--kb-on-navy)" }}
          >
            Refresh
          </button>
        </>
      )}
    </div>
  );
}
