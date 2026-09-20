import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

/**
 * Web Push sender. Supabase calls this from a Database Webhook on every
 * INSERT into `notifications` (setup steps in docs/feature-notifications.md).
 * It looks up the recipient's browser subscriptions and pushes the alert to
 * each, dropping subscriptions the push service says are gone.
 *
 * Authenticated by a shared secret (`x-webhook-secret`), not by a user
 * session — it runs with the service-role key, so it must never be callable
 * without that secret.
 */

function sameSecret(given: string | null, expected: string) {
  if (!given) return false;
  // Hash both so the comparison is constant-time regardless of length.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

interface NotificationRecord {
  id: string;
  user_id: string;
  category: string;
  type: string;
  title: string;
  body: string | null;
  url: string;
}

export async function POST(request: Request) {
  const {
    PUSH_WEBHOOK_SECRET,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
    VAPID_SUBJECT,
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = process.env;

  if (
    !PUSH_WEBHOOK_SECRET ||
    !NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !VAPID_PRIVATE_KEY ||
    !NEXT_PUBLIC_SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: "Push sender is not configured" }, { status: 503 });
  }

  if (!sameSecret(request.headers.get("x-webhook-secret"), PUSH_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { type?: string; table?: string; record?: NotificationRecord };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record = payload.record;
  if (payload.type !== "INSERT" || payload.table !== "notifications" || !record?.user_id) {
    return NextResponse.json({ error: "Not a notifications INSERT" }, { status: 400 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@example.com", NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", record.user_id);

  if (error) {
    console.error("push: loading subscriptions failed:", error);
    return NextResponse.json({ error: "Could not load subscriptions" }, { status: 500 });
  }

  const message = JSON.stringify({
    title: record.title,
    body: record.body ?? "",
    url: record.url || "/",
    tag: record.id,
    category: record.category,
    type: record.type,
  });

  const gone: string[] = [];
  let sent = 0;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
          { TTL: 60 * 60, urgency: record.category === "account" ? "normal" : "high" }
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.id); // unsubscribed / expired
        else console.error("push: send failed:", status, err);
      }
    })
  );

  if (gone.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", gone);
  }

  return NextResponse.json({ sent, removed: gone.length });
}
