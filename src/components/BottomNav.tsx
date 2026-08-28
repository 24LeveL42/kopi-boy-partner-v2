"use client";

import { useState } from "react";

const ITEMS = [
  { id: "orders", label: "Orders", icon: OrdersIcon },
  { id: "deliveries", label: "Deliveries", icon: DeliveryIcon },
  { id: "earnings", label: "Earnings", icon: EarningsIcon },
  { id: "profile", label: "Profile", icon: ProfileIcon },
] as const;

export function BottomNav() {
  const [active, setActive] = useState<string>("orders");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md items-stretch justify-between rounded-t-3xl bg-white px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] sm:max-w-lg"
      aria-label="Primary"
    >
      {ITEMS.map((item) => {
        const isActive = item.id === active;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="flex flex-1 flex-col items-center gap-1 py-1.5"
            aria-current={isActive ? "page" : undefined}
            style={{ color: isActive ? "var(--kb-purple)" : "var(--kb-ink-soft)" }}
          >
            {isActive && <span className="h-0.5 w-6 rounded-full" style={{ background: "var(--kb-purple)" }} />}
            <Icon />
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function OrdersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="4" width="14" height="16" rx="1.5" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}
function DeliveryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="17" cy="18" r="2.2" />
      <path d="M8 18h6l-2-6h4l2 4" />
      <path d="M9 12l2-4h3" />
    </svg>
  );
}
function EarningsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.5h3.75a1.75 1.75 0 010 3.5h-2.5a1.75 1.75 0 000 3.5H14" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.7-4.2 4.9-6.5 7.5-6.5s5.8 2.3 7.5 6.5" />
    </svg>
  );
}
