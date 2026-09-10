/**
 * Picker role types — the optional pickup-helper role. A picker collects
 * an order from the cook and hands it to the rider, who pays the picker
 * directly (off-platform, same pattern as cook-pays-rider).
 */

export type PickupRequestStatus = "open" | "accepted" | "completed" | "cancelled";

export interface PickupRequest {
  id: string;
  rider_id: string;
  kitchen_id: string;
  picker_id: string | null;
  status: PickupRequestStatus;
  suggested_fee: number;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

// Joined shape used by the picker feed and the rider's own request list —
// pulls in the kitchen name/neighbourhood so neither screen needs a second
// round trip per row.
export interface PickupRequestWithKitchen extends PickupRequest {
  kitchen_business_name: string;
  kitchen_neighbourhood: string;
}
