import Link from "next/link";
import { Logo } from "./Logo";

export function TopBar({ badge = "Partner" }: { badge?: string }) {
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <button aria-label="Open menu" className="p-1" style={{ color: "var(--kb-on-navy)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      <Logo size={30} />

      <Link
        href="/account"
        className="rounded-full px-3 py-1 text-xs font-semibold"
        style={{ background: "var(--kb-navy-raised)", color: "var(--kb-on-navy-soft)", border: "1px solid var(--kb-navy-line)" }}
      >
        {badge}
      </Link>
    </div>
  );
}
