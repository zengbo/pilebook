import { useState } from "react";
import { api, ApiError } from "../api";
import { Button, ErrorNote, Input, Label } from "../components/ui";
import { defaultPriceBook } from "../shared/defaults";
import { useSession } from "../session";
import type { PriceBook } from "../types";

const groups: Array<{ title: string; hint: string; fields: Array<{ key: keyof PriceBook; label: string; dollars?: boolean }> }> = [
  {
    title: "Carpet",
    hint: "What you charge before add-ons. Open area is cents per square foot.",
    fields: [
      { key: "roomCents", label: "Room", dollars: true },
      { key: "hallwayCents", label: "Hallway", dollars: true },
      { key: "stairFlightCents", label: "Stair flight", dollars: true },
      { key: "sqftCents", label: "Open area per sq ft", dollars: true },
    ],
  },
  {
    title: "Upholstery",
    hint: "Piece prices, not per cushion.",
    fields: [
      { key: "sofaCents", label: "Sofa", dollars: true },
      { key: "loveseatCents", label: "Loveseat", dollars: true },
      { key: "chairCents", label: "Chair", dollars: true },
    ],
  },
  {
    title: "Area rugs",
    hint: "Small is about 4×6, medium 6×9, large 9×12.",
    fields: [
      { key: "rugSmallCents", label: "Small rug", dollars: true },
      { key: "rugMediumCents", label: "Medium rug", dollars: true },
      { key: "rugLargeCents", label: "Large rug", dollars: true },
    ],
  },
  {
    title: "Add-ons",
    hint: "Pet odor and protector multiply by carpeted areas. Deodorizer is once per job.",
    fields: [
      { key: "petOdorPerAreaCents", label: "Pet odor per area", dollars: true },
      { key: "protectorPerAreaCents", label: "Stain protector per area", dollars: true },
      { key: "deodorizerFlatCents", label: "Deodorizer", dollars: true },
      { key: "minJobCents", label: "Minimum job", dollars: true },
    ],
  },
];

const times: Array<{ key: keyof PriceBook; label: string }> = [
  { key: "roomMinutes", label: "Room minutes" },
  { key: "hallwayMinutes", label: "Hallway minutes" },
  { key: "stairFlightMinutes", label: "Stair minutes" },
  { key: "sqftBlockMinutes", label: "Minutes per 100 sq ft" },
  { key: "sofaMinutes", label: "Sofa minutes" },
  { key: "loveseatMinutes", label: "Loveseat minutes" },
  { key: "chairMinutes", label: "Chair minutes" },
  { key: "rugSmallMinutes", label: "Small rug minutes" },
  { key: "rugMediumMinutes", label: "Medium rug minutes" },
  { key: "rugLargeMinutes", label: "Large rug minutes" },
  { key: "addonBufferMinutes", label: "Extra minutes if any add-on" },
];

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export function PricingPage() {
  const { business, refresh } = useSession();
  const [book, setBook] = useState<PriceBook>(business?.priceBook ?? defaultPriceBook());
  const [deposit, setDeposit] = useState(business?.depositPercent ?? 30);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showTimes, setShowTimes] = useState(false);

  function setMoney(key: keyof PriceBook, value: string) {
    const cents = Math.round(Number(value) * 100);
    if (Number.isFinite(cents)) setBook({ ...book, [key]: Math.max(0, cents) });
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/pricing", { method: "PUT", body: JSON.stringify(book) });
      await api("/api/business", { method: "PATCH", body: JSON.stringify({ depositPercent: deposit }) });
      await refresh();
      setMessage("Price book saved. The public page uses it immediately.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save prices.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-4xl">Price book</h1>
      <p className="mt-2 text-muted">These numbers are the quote. Customers can’t edit the math — only the quantities.</p>
      {groups.map((group) => (
        <section key={group.title} className="mt-6 rounded-3xl border border-line bg-card p-5">
          <h2 className="font-semibold">{group.title}</h2>
          <p className="mb-3 text-sm text-muted">{group.hint}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input id={field.key} inputMode="decimal" value={dollars(book[field.key])} onChange={(event) => setMoney(field.key, event.target.value)} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="mt-6 rounded-3xl border border-line bg-card p-5">
        <Label htmlFor="deposit">Deposit percent</Label>
        <Input id="deposit" type="number" min={10} max={100} value={deposit} onChange={(event) => setDeposit(Number(event.target.value))} />
        <p className="mt-1 text-xs text-muted">Customers can pay this share or the full amount. 100 means full payment only.</p>
      </section>
      <button type="button" className="mt-4 text-sm font-medium text-pine" onClick={() => setShowTimes((open) => !open)}>
        {showTimes ? "Hide time estimates" : "Edit how long each piece takes"}
      </button>
      {showTimes ? (
        <section className="mt-3 grid gap-3 rounded-3xl border border-line bg-card p-5 sm:grid-cols-2">
          {times.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input id={field.key} type="number" min={0} value={book[field.key]} onChange={(event) => setBook({ ...book, [field.key]: Number(event.target.value) })} />
            </div>
          ))}
        </section>
      ) : null}
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      {message ? <p className="mt-4 text-sm text-pine-deep">{message}</p> : null}
      <Button className="mt-4" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save price book"}</Button>
    </div>
  );
}
