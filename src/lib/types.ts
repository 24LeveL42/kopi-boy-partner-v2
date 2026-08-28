/**
 * Partner app domain types — foundation scope only.
 * Full order/delivery state machines (handover doc section 24) land with
 * Feature #006 (accept/reject + PayNow) and #008 (rider workflow).
 */

export type PartnerRole = "cook" | "rider";

export type OrderStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "PREPARING" | "READY" | "COMPLETED";

export interface DemoOrder {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: OrderStatus;
  placedMinutesAgo: number;
}

export type DeliveryStatus = "AVAILABLE" | "ASSIGNED" | "GOING_TO_PICKUP" | "OUT_FOR_DELIVERY" | "DELIVERED";

export interface DemoDelivery {
  id: string;
  pickupFrom: string;
  dropoffArea: string;
  fee: number;
  status: DeliveryStatus;
}
