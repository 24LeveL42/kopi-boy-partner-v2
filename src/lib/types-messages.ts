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
  /** May be empty only when photo_path is set (messages_body_check). */
  body: string;
  /** Key in the private `order-chat-photos` bucket, not a URL — OrderChat signs it to render. */
  photo_path: string | null;
  created_at: string;
}
