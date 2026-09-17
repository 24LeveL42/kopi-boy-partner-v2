/**
 * Delivery request types — Feature #008 (rider workflow). A cook requests a
 * rider once an order's preparation_status = 'ready'; any approved rider can
 * accept, then marks it delivered. Delivery fee is agreed directly between
 * cook and rider off-platform — no suggested_fee column, unlike
 * pickup_requests.
 */

export type DeliveryRequestStatus = "open" | "accepted" | "completed" | "cancelled";

export interface DeliveryRequest {
  id: string;
  order_id: string;
  kitchen_id: string;
  rider_id: string | null;
  status: DeliveryRequestStatus;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

// Joined shape used by the rider dashboard — pulls in the kitchen name/
// neighbourhood so the feed doesn't need a second round trip per row.
export interface DeliveryRequestWithKitchen extends DeliveryRequest {
  kitchen_business_name: string;
  kitchen_neighbourhood: string;
}
