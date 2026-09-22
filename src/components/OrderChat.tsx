"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrderMessage } from "@/lib/types-messages";

const MESSAGE_LIMIT = 200;

/**
 * Simple chat box for an order's customer <-> rider thread. Mounted only
 * while the delivery is accepted (the caller controls that); RLS backs the
 * same rule server-side, so if the delivery goes terminal mid-conversation
 * the next load/realtime event just returns nothing instead of erroring.
 */
export function OrderChat({ orderId, userId }: { orderId: string; userId: string }) {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_LIMIT)
      .returns<OrderMessage[]>();
    if (data) setMessages(data);
  }, [supabase, orderId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const m = payload.new as OrderMessage;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m].slice(-MESSAGE_LIMIT)));
        }
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [supabase, orderId, load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { error: sendError } = await supabase.from("messages").insert({ order_id: orderId, sender_id: userId, body });
    setSending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setDraft("");
  }

  return (
    <div className="mt-3 rounded-2xl bg-white p-3" style={{ color: "var(--kb-ink)" }}>
      <p className="mb-2 text-xs font-medium uppercase" style={{ color: "var(--kb-purple)" }}>
        Chat with customer
      </p>

      <div ref={listRef} className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="py-2 text-xs" style={{ color: "var(--kb-ink-soft)" }}>
            No messages yet — say hi when you're on the way.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <p
                  className="max-w-[80%] rounded-xl px-3 py-1.5 text-sm"
                  style={
                    mine
                      ? { background: "var(--kb-green-deep)", color: "white" }
                      : { background: "var(--kb-navy-raised)", color: "var(--kb-on-navy)" }
                  }
                >
                  {m.body}
                </p>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-xl px-3 py-1.5 text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#B91C1C" }}>
          {error}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Message the customer…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--kb-navy-line)", color: "var(--kb-ink)" }}
        />
        <button
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--kb-purple)" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
