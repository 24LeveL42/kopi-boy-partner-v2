"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";
import type { Kitchen, MenuItem, MerchantCategory, CuisineType } from "@/lib/types-kitchen";

const CATEGORIES: { id: MerchantCategory; label: string }[] = [
  { id: "home-cook", label: "Home Cook" },
  { id: "hawker", label: "Hawker" },
  { id: "bakery", label: "Bakery" },
  { id: "bulk-orders", label: "Bulk Orders" },
  { id: "drinks", label: "Desserts & Drinks" },
];

const CUISINES: { id: CuisineType; label: string }[] = [
  { id: "chinese", label: "Chinese" },
  { id: "halal", label: "Halal" },
  { id: "indian", label: "Indian" },
  { id: "western", label: "Western" },
];

interface DraftItem {
  key: string; // local React list key only — never sent to the DB
  name: string;
  price: string; // kept as text while editing, parsed to a number on submit
  photo_url: string;
  photoUploading: boolean; // local UI state only — never sent to the DB
}

function emptyItem(): DraftItem {
  return { key: crypto.randomUUID(), name: "", price: "", photo_url: "", photoUploading: false };
}

// Supabase errors (Postgrest, Storage, or a raw fetch/network throw) don't
// share one shape, and `.message` is sometimes empty even when `.details`/
// `.hint` have the actual reason — so pull whatever's there instead of
// trusting any single field, and always log the raw object so the full
// error (code, details, hint, stack) is visible in devtools too.
function describeSupabaseError(err: unknown): string {
  console.error("KitchenSetupForm error:", err);
  if (err && typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint].filter((p): p is string => !!p && p.trim().length > 0);
    if (parts.length > 0) {
      return e.code ? `${parts.join(" — ")} (code: ${e.code})` : parts.join(" — ");
    }
  }
  return "Something went wrong saving your kitchen — check the browser console for the full error.";
}

export function KitchenSetupForm({
  userId,
  defaults,
  existingKitchen,
  existingItems,
}: {
  userId: string;
  defaults: { business_name: string; neighbourhood: string; description: string };
  existingKitchen?: Kitchen | null;
  existingItems?: MenuItem[];
}) {
  const isEdit = !!existingKitchen;
  const router = useRouter();
  const supabase = createClient();

  const [businessName, setBusinessName] = useState(existingKitchen?.business_name ?? defaults.business_name);
  const [category, setCategory] = useState<MerchantCategory>(existingKitchen?.category ?? "home-cook");
  const [cuisineType, setCuisineType] = useState<CuisineType>(existingKitchen?.cuisine_type ?? "chinese");
  const [neighbourhood, setNeighbourhood] = useState(existingKitchen?.neighbourhood ?? defaults.neighbourhood);
  const [description, setDescription] = useState(existingKitchen?.description ?? defaults.description ?? "");
  const [heroImage, setHeroImage] = useState(existingKitchen?.hero_image ?? "");
  const [heroUploading, setHeroUploading] = useState(false);
  const [paynowUen, setPaynowUen] = useState(existingKitchen?.paynow_uen ?? "");
  const [items, setItems] = useState<DraftItem[]>(
    existingItems && existingItems.length > 0
      ? existingItems.map((i) => ({ key: i.id, name: i.name, price: String(i.price), photo_url: i.photo_url ?? "", photoUploading: false }))
      : [emptyItem()]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Uploads a cook-chosen file to the public kitchen-photos bucket under
  // this cook's own folder (required by the bucket's RLS policies — see
  // docs/supabase-schema.sql) and returns its public URL.
  async function uploadPhoto(file: File, prefix: string): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("kitchen-photos")
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadError) throw uploadError;
    return supabase.storage.from("kitchen-photos").getPublicUrl(path).data.publicUrl;
  }

  async function handleHeroFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setHeroUploading(true);
    try {
      setHeroImage(await uploadPhoto(file, "hero"));
    } catch (err) {
      setError(describeSupabaseError(err));
    } finally {
      setHeroUploading(false);
    }
  }

  async function handleItemPhotoChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    updateItem(key, { photoUploading: true });
    try {
      const url = await uploadPhoto(file, "dish");
      updateItem(key, { photo_url: url, photoUploading: false });
    } catch (err) {
      setError(describeSupabaseError(err));
      updateItem(key, { photoUploading: false });
    }
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("[KitchenSetupForm] submit fired", { businessName, neighbourhood, itemCount: items.length });
    setError(null);

    const validItems = items
      .map((it) => ({ ...it, name: it.name.trim(), price: parseFloat(it.price) }))
      .filter((it) => it.name.length > 0 && !Number.isNaN(it.price) && it.price > 0);

    if (!businessName.trim() || !neighbourhood.trim()) {
      console.log("[KitchenSetupForm] blocked: missing business name or neighbourhood");
      setError("Business name and neighbourhood are required.");
      return;
    }
    if (validItems.length === 0) {
      console.log("[KitchenSetupForm] blocked: no valid menu items", items);
      setError("Add at least one menu item with a name and a price above $0 — this is required before you can go live.");
      return;
    }

    setLoading(true);

    try {
      const { error: kitchenError } = await supabase.from("kitchens").upsert({
        id: userId,
        business_name: businessName.trim(),
        category,
        cuisine_type: cuisineType,
        neighbourhood: neighbourhood.trim(),
        description: description.trim() || null,
        hero_image: heroImage.trim() || null,
        paynow_uen: paynowUen.trim() || null,
        is_live: true,
      });
      if (kitchenError) throw kitchenError;

      // Replace-all on every save — simplest correct approach at this scope.
      // Both steps' errors were previously ignored/uncaught; now surfaced.
      const { error: deleteError } = await supabase.from("menu_items").delete().eq("kitchen_id", userId);
      if (deleteError) throw deleteError;

      const { error: itemsError } = await supabase.from("menu_items").insert(
        validItems.map((it) => ({
          kitchen_id: userId,
          name: it.name,
          price: it.price,
          photo_url: it.photo_url.trim() || null,
        }))
      );
      if (itemsError) throw itemsError;

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(describeSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-8" style={{ background: "var(--kb-navy)" }}>
      <div className="mb-6 flex justify-center">
        <Logo size={48} />
      </div>
      <h1 className="text-center font-display text-lg font-bold" style={{ color: "var(--kb-on-navy)" }}>
        {isEdit ? "Manage your kitchen" : "Set up your kitchen"}
      </h1>
      <p className="mt-1 text-center text-sm" style={{ color: "var(--kb-on-navy-soft)" }}>
        {isEdit
          ? "Update your menu and details any time — changes go live immediately."
          : "Add your menu to appear in the Customer app. A photo is optional, but at least one menu item with a price is required."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <section className="space-y-3 rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
          <Field label="Business name">
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: "#E5E7EB" }}
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MerchantCategory)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: "#E5E7EB" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cuisine">
            <select
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value as CuisineType)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: "#E5E7EB" }}
            >
              {CUISINES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Neighbourhood">
            <input
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              required
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: "#E5E7EB" }}
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: "#E5E7EB" }}
            />
          </Field>
          <Field label="Kitchen photo (optional)">
            <div className="flex items-center gap-3">
              {heroImage && (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Supabase Storage URL, not a static asset
                <img src={heroImage} alt="Kitchen" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleHeroFileChange}
                disabled={heroUploading}
                className="w-full text-sm"
              />
            </div>
            {heroUploading && (
              <p className="mt-1 text-xs" style={{ color: "var(--kb-ink-soft)" }}>
                Uploading…
              </p>
            )}
          </Field>
          <Field label="PayNow UEN (customers pay you directly)">
            <input
              value={paynowUen}
              onChange={(e) => setPaynowUen(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              style={{ borderColor: "#E5E7EB" }}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-4" style={{ color: "var(--kb-ink)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Menu items</h2>
            <button type="button" onClick={addItem} className="text-sm font-semibold" style={{ color: "var(--kb-purple)" }}>
              + Add item
            </button>
          </div>
          {items.map((it, i) => (
            <div key={it.key} className="space-y-2 border-b pb-3 last:border-0" style={{ borderColor: "#E5E7EB" }}>
              <div className="flex items-end gap-2">
                <Field label={`Item ${i + 1} name`} className="flex-[2]">
                  <input
                    value={it.name}
                    onChange={(e) => updateItem(it.key, { name: e.target.value })}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </Field>
                <Field label="Price ($)" className="flex-1">
                  <input
                    value={it.price}
                    onChange={(e) => updateItem(it.key, { price: e.target.value })}
                    inputMode="decimal"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeItem(it.key)}
                  className="mb-0.5 shrink-0 rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: "var(--kb-cream)" }}
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-2">
                {it.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Supabase Storage URL, not a static asset
                  <img src={it.photo_url} alt={it.name || "Dish"} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleItemPhotoChange(it.key, e)}
                  disabled={it.photoUploading}
                  className="w-full text-xs"
                />
                {it.photoUploading && (
                  <span className="shrink-0 text-xs" style={{ color: "var(--kb-ink-soft)" }}>
                    Uploading…
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        {error && (
          <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.15)", color: "#B91C1C" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || heroUploading || items.some((it) => it.photoUploading)}
          className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(90deg, var(--kb-purple) 0%, var(--kb-green) 100%)" }}
        >
          {loading ? "Saving…" : isEdit ? "Save changes" : "Go live"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-medium ${className ?? ""}`} style={{ color: "var(--kb-ink-soft)" }}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
