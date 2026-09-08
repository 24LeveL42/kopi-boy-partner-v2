/**
 * Kitchen + menu item types — Feature #003.
 *
 * Mirrors the `kitchens` / `menu_items` tables added to
 * `docs/supabase-schema.sql`. `category` / `cuisine_type` values match the
 * Customer app's `MerchantCategory` / `CuisineType` exactly — a kitchen row
 * is rendered directly as a `Merchant` there (see that repo's
 * `src/lib/kitchens.ts`).
 */

export type MerchantCategory = "home-cook" | "hawker" | "bakery" | "bulk-orders" | "drinks";
export type CuisineType = "chinese" | "halal" | "indian" | "western";

export interface Kitchen {
  id: string;
  business_name: string;
  category: MerchantCategory;
  cuisine_type: CuisineType;
  neighbourhood: string;
  description: string | null;
  hero_image: string | null;
  is_live: boolean;
}

export interface MenuItem {
  id: string;
  kitchen_id: string;
  name: string;
  price: number;
  photo_url: string | null;
}
