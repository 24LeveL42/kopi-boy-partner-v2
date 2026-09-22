/**
 * Order chat message — mirrors the `messages` table in
 * `docs/supabase-messages.sql`. Visible only to the order's customer and the
 * currently accepted rider, and only while the delivery is accepted (RLS
 * enforces both — see order_chat_participant() in that file).
 */
export interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
