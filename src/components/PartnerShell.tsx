"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { DEMO_ORDERS, DEMO_DELIVERIES } from "@/lib/demo-data";
import { OrderStatus, DeliveryStatus } from "@/lib/types";

const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "var(--kb-warn)",
  ACCEPTED: "var(--kb-green)",
  REJECTED: "var(--kb-danger)",
  PREPARING: "var(--kb-purple)",
  READY: "var(--kb-green-deep)",
  COMPLETED: "var(--kb-on-navy-soft)",
};

const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  GOING_TO_PICKUP: "Going to pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

/**
 * Partner app shell — foundation only.
 *
 * One login serves both cooks and riders (per the handover doc); this is a
 * demo view-toggle, not real role detection. Auth + real role assignment
 * is Feature #002. Cook accept/reject + PayNow is #006, rider workflow is
 * #008 — this screen just proves the navigation and layout out.
 */
export function PartnerShell({ defaultView = "cook" }: { defaultView?: "cook" | "rider" }) {
  const [view, setView] = useState<"cook" | "rider">(defaultView);

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--kb-navy)" }}>
      <div className="mx-auto max-w-md px-4 pt-4 sm:max-w-lg sm:px-6">
        <TopBar />

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setView("cook")}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={
              view === "cook"
                ? { background: "linear-gradient(90deg, var(--kb-purple) 0%, var(--kb-green) 100%)", color: "#fff" }
                : { background: "var(--kb-navy-raised)", color: "var(--kb-on-navy-soft)", border: "1px solid var(--kb-navy-line)" }
            }
          >
            Cook view
          </button>
          <button
            onClick={() => setView("rider")}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={
              view === "rider"
                ? { background: "linear-gradient(90deg, var(--kb-purple) 0%, var(--kb-green) 100%)", color: "#fff" }
                : { background: "var(--kb-navy-raised)", color: "var(--kb-on-navy-soft)", border: "1px solid var(--kb-navy-line)" }
            }
          >
            Rider view
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-md space-y-3 px-4 py-6 sm:max-w-lg sm:px-6">
        {view === "cook" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold" style={{ color: "var(--kb-on-navy)" }}>
                Orders
              </h2>
              <Link href="/kitchen" className="text-sm font-semibold" style={{ color: "var(--kb-green)" }}>
                Manage kitchen &amp; menu &rsaquo;
              </Link>
            </div>
            {DEMO_ORDERS.map((o) => (
              <div key={o.id} className="rounded-2xl bg-white p-4 shadow-lg" style={{ color: "var(--kb-ink)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{o.id} &middot; {o.customerName}</span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: ORDER_STATUS_COLOR[o.status] }}>
                    {o.status}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--kb-ink-soft)" }}>{o.items}</p>
                <div className="mt-2 flex items-center justify-between text-xs" style={{ color: "var(--kb-ink-soft)" }}>
                  <span>{o.placedMinutesAgo} min ago</span>
                  <span className="font-semibold" style={{ color: "var(--kb-green-deep)" }}>${o.total.toFixed(2)}</span>
                </div>
                {o.status === "PENDING" && (
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 rounded-lg py-2 text-sm font-medium text-white" style={{ background: "var(--kb-green-deep)" }}>Accept</button>
                    <button className="flex-1 rounded-lg py-2 text-sm font-medium" style={{ background: "var(--kb-cream)", color: "var(--kb-ink)" }}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold" style={{ color: "var(--kb-on-navy)" }}>
                Deliveries
              </h2>
              <Link href="/request-picker" className="text-sm font-semibold" style={{ color: "var(--kb-green)" }}>
                Request a picker &rsaquo;
              </Link>
            </div>
            {DEMO_DELIVERIES.map((d) => (
              <div key={d.id} className="rounded-2xl bg-white p-4 shadow-lg" style={{ color: "var(--kb-ink)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{d.id}</span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "var(--kb-cream)", color: "var(--kb-ink-soft)" }}>
                    {DELIVERY_STATUS_LABEL[d.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--kb-ink-soft)" }}>{d.pickupFrom} &rarr; {d.dropoffArea}</p>
                <div className="mt-2 text-right text-sm font-semibold" style={{ color: "var(--kb-green-deep)" }}>
                  ${d.fee.toFixed(2)} delivery fee
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
