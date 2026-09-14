"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderWithItems } from "@/lib/types-orders";

// Cooks can't read the customer's profile (no RLS policy grants that), so
// order cards are identified by a short id + timestamp, not a customer name.
function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function itemsSummary(order: OrderWithItems) {
  return order.order_items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
}

export function CookOrdersPanel({ kitchenId }: { kitchenId: string }) {
  const supabase = createClient();
  const [newOrders, setNewOrders] = useState<OrderWithItems[]>([]);
  const [awaitingPayment, setAwaitingPayment] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const { data, error: loadError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("kitchen_id", kitchenId)
      .in("order_status", ["placed", "accepted"])
      .order("created_at", { ascending: true })
      .returns<OrderWithItems[]>();

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    setNewOrders(rows.filter((o) => o.order_status === "placed"));
    setAwaitingPayment(rows.filter((o) => o.order_status === "accepted" && o.payment_status === "unpaid"));
    setLoading(false);
  }, [supabase, kitchenId]);

  useEffect(() => {
    // Deferred so the initial setLoading(true) inside load() doesn't run
    // synchronously as part of the effect's own commit.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function decide(orderId: string, decision: "accepted" | "rejected") {
    setBusyId(orderId);
    setError(null);
    const { error: decideError } = await supabase
      .from("orders")
      .update({ order_status: decision, decided_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("order_status", "placed"); // can't decide an already-decided order
    setBusyId(null);
    if (decideError) {
      setError(decideError.message);
      return;
    }
    load();
  }

  async function markPaid(orderId: string) {
    setBusyId(orderId);
    setError(null);
    const { error: paidError } = await supabase
      .from("orders")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("order_status", "accepted")
      .eq("payment_status", "unpaid"); // can't mark paid before accepted / twice
    setBusyId(null);
    if (paidError) {
      setError(paidError.message);
      return;
    }
    load();
  }

  if (loading) {
    return <p className="mt-4 text-sm" style={{ color: "var(--kb-on-navy-soft)" }}>Loading…</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5" }}>
          {error}
        </p>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase" style={{ color: "var(--kb-on-navy-soft)" }}>
          New orders
        </h3>
        {newOrders.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-white p-4 text-sm" style={{ color: "var(--kb-ink-soft)" }}>
            No new orders right now.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {newOrders.map((o) => (
              <div key={o.id} className="rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Order #{shortId(o.id)}</p>
                  <p className="text-sm font-semibold">${o.subtotal.toFixed(2)}</p>
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--kb-ink-soft)" }}>{itemsSummary(o)}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => decide(o.id, "accepted")}
                    disabled={busyId === o.id}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--kb-green-deep)" }}
                  >
                    {busyId === o.id ? "Saving…" : "Accept"}
                  </button>
                  <button
                    onClick={() => decide(o.id, "rejected")}
                    disabled={busyId === o.id}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--kb-danger)" }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase" style={{ color: "var(--kb-on-navy-soft)" }}>
          Awaiting PayNow
        </h3>
        {awaitingPayment.length === 0 ? (
          <p className="mt-2 rounded-2xl bg-white p-4 text-sm" style={{ color: "var(--kb-ink-soft)" }}>
            No accepted orders waiting on payment.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {awaitingPayment.map((o) => (
              <div key={o.id} className="rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Order #{shortId(o.id)}</p>
                  <p className="text-sm font-semibold">${o.subtotal.toFixed(2)}</p>
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--kb-ink-soft)" }}>{itemsSummary(o)}</p>
                <button
                  onClick={() => markPaid(o.id)}
                  disabled={busyId === o.id}
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--kb-purple)" }}
                >
                  {busyId === o.id ? "Saving…" : "Mark PayNow received"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={load}
        className="w-full rounded-2xl py-2.5 text-sm font-semibold"
        style={{ background: "var(--kb-navy-raised)", color: "var(--kb-on-navy)" }}
      >
        Refresh
      </button>
    </div>
  );
}
