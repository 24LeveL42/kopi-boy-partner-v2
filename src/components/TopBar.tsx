"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

export function TopBar({ badge = "Partner" }: { badge?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between px-1 py-2">
        <button
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="p-1"
          style={{ color: "var(--kb-on-navy)" }}
        >
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

      {menuOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            className="absolute inset-y-0 left-0 w-72 max-w-[80%] p-5"
            style={{ background: "var(--kb-navy)" }}
          >
            <div className="flex items-center justify-between">
              <Logo size={30} />
              <button
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                style={{ color: "var(--kb-on-navy)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </svg>
              </button>
            </div>

            <nav className="mt-6 space-y-1">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium"
                style={{ color: "var(--kb-on-navy)" }}
              >
                Home
              </Link>
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium"
                style={{ color: "var(--kb-on-navy)" }}
              >
                My Profile
              </Link>
            </nav>

            <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--kb-navy-line)" }}>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
