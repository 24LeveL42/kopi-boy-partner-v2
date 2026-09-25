import type { SupabaseClient } from "@supabase/supabase-js";

// Must stay in sync with the order-chat-photos bucket and the messages checks
// in docs/supabase-messages.sql (sections 4-5), which enforce the same rules
// server-side. Same layout as the Customer app's complaint-photos helpers.
export const ORDER_CHAT_PHOTO_BUCKET = "order-chat-photos";
export const ORDER_CHAT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const ORDER_CHAT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** How long a rendered photo link stays valid. */
export const ORDER_CHAT_PHOTO_URL_TTL_SECONDS = 60 * 60;

export const MESSAGE_BODY_MAX_LENGTH = 2000;

/** Returns why a picked file can't be attached, or null if it's fine. */
export function validateOrderChatPhoto(file: { type: string; size: number }): string | null {
  if (!ORDER_CHAT_PHOTO_TYPES.includes(file.type)) return "Please choose a JPEG, PNG, WebP or HEIC photo.";
  if (file.size > ORDER_CHAT_PHOTO_MAX_BYTES) return "That photo is over 5 MB — please choose a smaller one.";
  return null;
}

/**
 * Object key `<order_id>/<uploader_id>/<random>.<ext>` — the storage policies
 * require exactly this layout, and messages_photo_path_check requires the key
 * to sit under the message's own order.
 */
export function orderChatPhotoPath(orderId: string, userId: string, fileName: string, id: string): string {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(fileName)?.[1]?.toLowerCase() ?? "jpg";
  return `${orderId}/${userId}/${id}.${ext}`;
}

/**
 * Uploads a picked (already validated) photo under this order/user's folder
 * and returns its object key, or null if the upload failed. Every call gets a
 * fresh key, so nothing is ever overwritten.
 */
export async function uploadOrderChatPhoto(
  supabase: SupabaseClient,
  orderId: string,
  userId: string,
  file: File
): Promise<string | null> {
  const path = orderChatPhotoPath(orderId, userId, file.name, crypto.randomUUID());
  const { error } = await supabase.storage
    .from(ORDER_CHAT_PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  return error ? null : path;
}

/** Trimmed body, or null when there's nothing sendable (text or a photo is required). */
export function normalizeOrderChatBody(raw: string, hasPhoto: boolean): string | null {
  const body = raw.trim();
  if (body.length > MESSAGE_BODY_MAX_LENGTH) return null;
  if (!body && !hasPhoto) return null;
  return body;
}
