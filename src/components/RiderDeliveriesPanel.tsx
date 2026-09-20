"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLiveRefresh } from "@/lib/use-live-refresh";
import type { DeliveryRequestWithKitchen } from "@/lib/types-delivery";

interface RawRow {
  id: string;
  order_id: string;
  kitchen_id: string;
  rider_id: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  kitchens: { business_name: string; neighbourhood: string } | null;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function toRow(r: RawRow): DeliveryRequestWithKitchen {
  return {
    id: r.id,
    order_id: r.order_id,
    kitchen_id: r.kitchen_id,
    rider_id: r.rider_id,
    status: r.status as DeliveryRequestWithKitchen["status"],
    created_at: r.created_at,
    accepted_at: r.accepted_at,
    completed_at: r.completed_at,
    kitchen_business_name: r.kitchens?.business_name ?? "Unknown kitchen",
    kitchen_neighbourhood: r.kitchens?.neighbourhood ?? "",
  };
}

export function RiderDeliveriesPanel({ riderId }: { riderId: string }) {
  const supabase = createClient();
  const [openRequests, setOpenRequests] = useState<DeliveryRequestWithKitchen[]>([]);
  const [myDelivery, setMyDelivery] = useState<DeliveryRequestWithKitchen | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `silent` = live refresh: update in place without flashing the loading state.
  const load = useCallback(async (silent?: boolean) => {
    if (silent !== true) setLoading(true);
    setError(null);

    const { data: mine, error: mineError } = await supabase
      .from("delivery_requests")
      .select("*, kitchens(business_name, neighbourhood)")
      .eq("rider_id", riderId)
      .eq("status", "accepted")
      .maybeSingle<RawRow>();

    if (mineError) {
      setError(mineError.message);
      setLoading(false);
      return;
    }

    if (mine) {
      setMyDelivery(toRow(mine));
      setOpenRequests([]);
      setLoading(false);
      return;
    }

    setMyDelivery(null);

    const { data: open, error: openError } = await supabase
      .from("delivery_requests")
      .select("*, kitchens(business_name, neighbourhood)")
      .eq("status", "open")
      .order("created_at", { ascending: true })
      .returns<RawRow[]>();

    if (openError) {
      setError(openError.message);
      setLoading(false);
      return;
    }

    setOpenRequests((open ?? []).map(toRow));
    setLoading(false);
  }, [supabase, riderId]);

  useEffect(() => {
    // Deferred so the initial setLoading(true) inside load() doesn't run
    // synchronously as part of the effect's own commit.
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Open requests are visible to every rider (RLS scopes it), so no filter.
  useLiveRefresh([{ table: "delivery_requests" }], () => void load(true));

  async function accept(requestId: string) {
    setBusyId(requestId);
    setError(null);
    const { error: acceptError } = await supabase
      .from("delivery_requests")
      .update({ rider_id: riderId, status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("status", "open"); // first to accept wins — a second rider's update matches 0 rows
    setBusyId(null);
    if (acceptError) {
      setError(acceptError.message);
      return;
    }
    load();
  }

  async function markDelivered() {
    if (!myDelivery) return;
    setBusyId(myDelivery.id);
    setError(null);
    const { error: deliveredError } = await supabase
      .from("delivery_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", myDelivery.id);
    setBusyId(null);
    if (deliveredError) {
      setError(deliveredError.message);
      return;
    }
    load();
  }

  if (loading) {
    return <p className="mt-2 text-sm" style={{ color: "var(--kb-on-navy-soft)" }}>Loading…</p>;
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5" }}>
          {error}
        </p>
      )}

      {myDelivery ? (
        <div className="rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
          <p className="text-xs font-medium uppercase" style={{ color: "var(--kb-purple)" }}>
            Your active delivery
          </p>
          <p className="mt-1 text-sm font-semibold">{myDelivery.kitchen_business_name}</p>
          <p className="text-xs" style={{ color: "var(--kb-ink-soft)" }}>{myDelivery.kitchen_neighbourhood}</p>
          <p className="mt-1 text-xs" style={{ color: "var(--kb-ink-soft)" }}>Order #{shortId(myDelivery.order_id)}</p>
          <p className="mt-2 text-xs" style={{ color: "var(--kb-ink-soft)" }}>
            Collect from the cook and agree the delivery fee directly with them.
          </p>
          <button
            onClick={markDelivered}
            disabled={busyId === myDelivery.id}
            className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--kb-green-deep)" }}
          >
            {busyId === myDelivery.id ? "Saving…" : "Mark delivered"}
          </button>
        </div>
      ) : (
        <>
          {openRequests.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm" style={{ color: "var(--kb-ink-soft)" }}>
              No open delivery requests right now — check back later.
            </p>
          ) : (
            <div className="space-y-2">
              {openRequests.map((r) => (
                <div key={r.id} className="rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
                  <p className="text-sm font-semibold">{r.kitchen_business_name}</p>
                  <p className="text-xs" style={{ color: "var(--kb-ink-soft)" }}>{r.kitchen_neighbourhood}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--kb-ink-soft)" }}>Order #{shortId(r.order_id)}</p>
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
            onClick={() => void load()}
            className="mt-3 w-full rounded-2xl py-2.5 text-sm font-semibold"
            style={{ background: "var(--kb-navy-raised)", color: "var(--kb-on-navy)" }}
          >
            Refresh
          </button>
        </>
      )}
    </div>
  );
}
