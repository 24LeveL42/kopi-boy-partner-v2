"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PartnerRole } from "@/lib/types";
import { Logo } from "./Logo";

export function ApplyForm({ userId }: { userId: string }) {
  const [roleChoice, setRoleChoice] = useState<PartnerRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Cook fields
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Home Cook");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [description, setDescription] = useState("");
  const [paynowUen, setPaynowUen] = useState("");

  // Rider fields
  const [vehicleType, setVehicleType] = useState("Motorcycle");
  const [licensePlate, setLicensePlate] = useState("");

  // Picker fields
  const [pickerNote, setPickerNote] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (roleChoice === "cook") {
      const { error } = await supabase.from("cook_applications").insert({
        user_id: userId,
        business_name: businessName,
        business_type: businessType,
        neighbourhood,
        description,
        paynow_uen: paynowUen,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else if (roleChoice === "rider") {
      const { error } = await supabase.from("rider_applications").insert({
        user_id: userId,
        vehicle_type: vehicleType,
        license_plate: licensePlate,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    } else if (roleChoice === "picker") {
      const { error } = await supabase.from("picker_applications").insert({
        user_id: userId,
        note: pickerNote || null,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  if (!roleChoice) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6" style={{ background: "var(--kb-navy)" }}>
        <div className="mb-6 flex justify-center">
          <Logo size={48} />
        </div>
        <h1 className="text-center font-display text-lg font-bold" style={{ color: "var(--kb-on-navy)" }}>
          Join as a partner
        </h1>
        <p className="mt-1 text-center text-sm" style={{ color: "var(--kb-on-navy-soft)" }}>
          Are you signing up to cook, or to deliver?
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => setRoleChoice("cook")}
            className="w-full rounded-2xl bg-white py-4 text-left px-5"
          >
            <span className="block font-semibold" style={{ color: "var(--kb-ink)" }}>I&apos;m a cook</span>
            <span className="text-sm" style={{ color: "var(--kb-ink-soft)" }}>Home cook, hawker, bakery, or small food business</span>
          </button>
          <button
            onClick={() => setRoleChoice("rider")}
            className="w-full rounded-2xl bg-white py-4 text-left px-5"
          >
            <span className="block font-semibold" style={{ color: "var(--kb-ink)" }}>I&apos;m a rider</span>
            <span className="text-sm" style={{ color: "var(--kb-ink-soft)" }}>Free registration, no fees — you keep the full delivery fee</span>
          </button>
          <button
            onClick={() => setRoleChoice("picker")}
            className="w-full rounded-2xl bg-white py-4 text-left px-5"
          >
            <span className="block font-semibold" style={{ color: "var(--kb-ink)" }}>I&apos;m a picker</span>
            <span className="text-sm" style={{ color: "var(--kb-ink-soft)" }}>Casual — collect an order from a cook and hand it to a rider nearby</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-sm px-6 py-10" style={{ background: "var(--kb-navy)" }}>
      <button onClick={() => setRoleChoice(null)} className="text-sm" style={{ color: "var(--kb-green)" }}>
        &larr; Back
      </button>
      <h1 className="mt-4 font-display text-lg font-bold" style={{ color: "var(--kb-on-navy)" }}>
        {roleChoice === "cook" ? "Cook application" : roleChoice === "rider" ? "Rider application" : "Picker application"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        {roleChoice === "picker" && (
          <Field label="Anything we should know? (optional)">
            <textarea
              value={pickerNote}
              onChange={(e) => setPickerNote(e.target.value)}
              className="kb-input"
              rows={3}
              placeholder="e.g. usually free after school, near Toa Payoh"
            />
          </Field>
        )}
        {roleChoice === "cook" ? (
          <>
            <Field label="Business name">
              <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="kb-input" />
            </Field>
            <Field label="Business type">
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="kb-input">
                <option>Home Cook</option>
                <option>Hawker</option>
                <option>Bakery</option>
                <option>Small Business</option>
              </select>
            </Field>
            <Field label="Neighbourhood">
              <input required value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} className="kb-input" placeholder="e.g. Toa Payoh" />
            </Field>
            <Field label="Tell customers about your food">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="kb-input" rows={3} />
            </Field>
            <Field label="PayNow UEN (customers pay you directly)">
              <input value={paynowUen} onChange={(e) => setPaynowUen(e.target.value)} className="kb-input" />
            </Field>
          </>
        ) : roleChoice === "rider" ? (
          <>
            <Field label="Vehicle type">
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="kb-input">
                <option>Bicycle</option>
                <option>Motorcycle</option>
                <option>Car</option>
              </select>
            </Field>
            <Field label="License plate (if applicable)">
              <input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="kb-input" />
            </Field>
          </>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(90deg, var(--kb-purple) 0%, var(--kb-green) 100%)" }}
        >
          {loading ? "Submitting…" : "Submit application"}
        </button>

        {error && (
          <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.15)", color: "#FCA5A5" }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: "var(--kb-on-navy-soft)" }}>{label}</span>
      {children}
    </label>
  );
}
