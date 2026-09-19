"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type BackHandler = () => void;

const BackContext = createContext<{ register: (handler: BackHandler | null) => void } | null>(null);

/**
 * Lets a screen with its own internal steps (e.g. the login flow, or the
 * apply form's role picker) take over the global Back button while it's
 * mounted, so Back steps within the screen instead of leaving it. Pass
 * `null` when there's no internal step to go back to.
 */
export function useBackHandler(handler: BackHandler | null) {
  const ctx = useContext(BackContext);
  // Callers pass a fresh closure each render; keep the latest in a ref and
  // only (un)register when the handler appears/disappears, so the bar isn't
  // re-rendered on every render of the calling screen.
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  const active = handler !== null;
  useEffect(() => {
    if (!active) return;
    ctx?.register(() => latest.current?.());
    return () => ctx?.register(null);
  }, [ctx, active]);
}

/**
 * The single, app-wide Home + Back bar. Mounted once in the root layout, so
 * every route (and every screen `/` can render) gets it — pages never add
 * their own. Fixed to the top; content is offset by --app-bar-h (see
 * globals.css, `min-h-page`).
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [override, setOverride] = useState<BackHandler | null>(null);
  // Bumped when Home is pressed while already on "/", to remount the page and
  // reset any in-page steps (login step, apply role picker) to the start.
  const [homeKey, setHomeKey] = useState(0);
  // True once this tab has navigated inside the app, so router.back() is
  // known to stay in-app (history.length also counts pages before the app,
  // e.g. the Google sign-in redirect).
  const hasInAppHistory = useRef(false);
  const firstPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== firstPath.current) hasInAppHistory.current = true;
  }, [pathname]);

  const register = useCallback((handler: BackHandler | null) => {
    setOverride(() => handler);
  }, []);
  const ctx = useMemo(() => ({ register }), [register]);

  const onHome = pathname === "/";
  // On the home route with nothing to step back through, there's nowhere to go.
  const backDisabled = onHome && !override;

  function handleBack() {
    if (override) {
      override();
    } else if (hasInAppHistory.current) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <BackContext.Provider value={ctx}>
      <header
        className="fixed inset-x-0 top-0 z-40 border-b"
        style={{ background: "var(--kb-navy)", borderColor: "var(--kb-navy-line)", height: "var(--app-bar-h)" }}
      >
        <nav
          aria-label="Page navigation"
          className="mx-auto flex h-full max-w-md items-center justify-between px-4 sm:max-w-lg sm:px-6"
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={backDisabled}
            aria-label="Go back"
            className="flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-sm font-semibold disabled:opacity-35"
            style={{ color: "var(--kb-on-navy)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 5 8 12 15 19" />
            </svg>
            Back
          </button>

          <Link
            href="/"
            onClick={() => {
              if (onHome) setHomeKey((k) => k + 1);
            }}
            aria-label="Go to home"
            aria-current={onHome ? "page" : undefined}
            className="flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-2 text-sm font-semibold"
            style={{ color: onHome ? "var(--kb-green)" : "var(--kb-on-navy)" }}
          >
            Home
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 11l8-7 8 7" />
              <path d="M6 10v10h4v-6h4v6h4V10" />
            </svg>
          </Link>
        </nav>
      </header>

      {/* Block (not flex) wrapper: pages centre themselves with mx-auto, which would shrink-wrap inside a flex column. */}
      <div key={homeKey} className="flex-1" style={{ paddingTop: "var(--app-bar-h)" }}>
        {children}
      </div>
    </BackContext.Provider>
  );
}
