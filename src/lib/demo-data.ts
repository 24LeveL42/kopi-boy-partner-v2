import { DemoOrder, DemoDelivery } from "./types";

// DEMO DATA ONLY — replaces with real Supabase queries in Feature #006/#008.

export const DEMO_ORDERS: DemoOrder[] = [
  { id: "ORD-1042", customerName: "Wei Ling", items: "2x Nasi Lemak Ayam Goreng", total: 13.0, status: "PENDING", placedMinutesAgo: 2 },
  { id: "ORD-1041", customerName: "Farhan", items: "1x Fish Head Curry Set", total: 9.5, status: "ACCEPTED", placedMinutesAgo: 14 },
  { id: "ORD-1039", customerName: "Priya", items: "1x Banana Leaf Rice, 1x Teh Tarik", total: 8.5, status: "PREPARING", placedMinutesAgo: 22 },
  { id: "ORD-1035", customerName: "Marcus", items: "2x Kaya Butter Bread", total: 9.0, status: "READY", placedMinutesAgo: 31 },
  { id: "ORD-1030", customerName: "Siti", items: "1x Nasi Lemak Rendang", total: 7.5, status: "COMPLETED", placedMinutesAgo: 58 },
];

export const DEMO_DELIVERIES: DemoDelivery[] = [
  { id: "DEL-771", pickupFrom: "Kak Nur's Nasi Lemak, Bedok", dropoffArea: "Bedok North", fee: 5.0, status: "AVAILABLE" },
  { id: "DEL-770", pickupFrom: "Wei Jie Claypot Rice, Ang Mo Kio", dropoffArea: "AMK Ave 6", fee: 6.5, status: "ASSIGNED" },
  { id: "DEL-768", pickupFrom: "Old Tampines Bakes, Tampines", dropoffArea: "Tampines East", fee: 4.5, status: "OUT_FOR_DELIVERY" },
];
