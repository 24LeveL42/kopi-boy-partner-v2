import Link from "next/link";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

/**
 * Partner app shell — real role detection now (Feature #002 is done).
 * Order-taking (#005/#006) and rider workflow (#008) aren't built yet,
 * so this shows an honest "not live yet" state instead of fake demo
 * orders/deliveries with non-functional buttons.
 */
export function PartnerShell({ defaultView }: { defaultView: "cook" | "rider" }) {
  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--kb-navy)" }}>
      <div className="mx-auto max-w-md px-4 pt-4 sm:max-w-lg sm:px-6">
        <TopBar />
      </div>

      <main className="mx-auto max-w-md space-y-3 px-4 py-6 sm:max-w-lg sm:px-6">
        {defaultView === "cook" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold" style={{ color: "var(--kb-on-navy)" }}>
                Orders
              </h2>
              <Link href="/kitchen" className="text-sm font-semibold" style={{ color: "var(--kb-green)" }}>
                Manage kitchen &amp; menu &rsaquo;
              </Link>
            </div>
            <p className="rounded-2xl bg-white p-5 text-sm shadow-lg" style={{ color: "var(--kb-ink-soft)" }}>
              Order-taking isn&apos;t live yet — this lands with Feature #005/#006. Use &ldquo;Manage kitchen &amp; menu&rdquo; above to update your business photo, menu, and pricing — customers already see this live.
            </p>
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
            <p className="rounded-2xl bg-white p-5 text-sm shadow-lg" style={{ color: "var(--kb-ink-soft)" }}>
              Delivery job matching isn&apos;t live yet — this lands with Feature #008 (rider workflow).
            </p>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
