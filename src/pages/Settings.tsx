import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { HoursEditor, ZipEditor } from "../components/Fields";
import { Button, ErrorNote, Input, Label, Textarea } from "../components/ui";
import { US_TIMEZONES } from "../shared/defaults";
import { useSession } from "../session";
import type { Business } from "../types";

export function SettingsPage() {
  const { business, refresh } = useSession();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<Business | null>(null);
  useEffect(() => {
    if (business) setDraft((current) => current ?? business);
  }, [business]);
  const [techName, setTechName] = useState("");
  const [techPhone, setTechPhone] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(params.get("stripe") ? "Stripe returned to Pilebook. If charges are enabled, live test checkout is on." : "");
  const [busy, setBusy] = useState(false);
  const shop = draft;

  const snippet = useMemo(() => {
    if (!shop) return "";
    const origin = window.location.origin;
    return `<iframe src="${origin}/b/${shop.slug}/embed" title="Book ${shop.name}" style="width:100%;min-height:780px;border:0;border-radius:16px;"></iframe>`;
  }, [shop]);

  if (!shop) return <p className="text-muted">Loading settings…</p>;

  async function saveProfile() {
    if (!shop) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ business: Business }>("/api/business", {
        method: "PATCH",
        body: JSON.stringify({
          name: shop.name,
          slug: shop.slug,
          phone: shop.phone,
          email: shop.email,
          city: shop.city,
          state: shop.state,
          timezone: shop.timezone,
          brandColor: shop.brandColor,
          tagline: shop.tagline,
          allowFullPayment: shop.allowFullPayment,
          bufferMin: shop.bufferMin,
        }),
      });
      setDraft(data.business);
      await refresh();
      setMessage("Shop details saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function saveHours() {
    if (!shop) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/hours", { method: "PUT", body: JSON.stringify({ hours: shop.hours }) });
      await refresh();
      setMessage("Hours saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save hours.");
    } finally {
      setBusy(false);
    }
  }

  async function saveZips() {
    if (!shop) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/zips", { method: "PUT", body: JSON.stringify({ zips: shop.zips }) });
      await refresh();
      setMessage("Service area saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save zips.");
    } finally {
      setBusy(false);
    }
  }

  async function addTech() {
    setBusy(true);
    setError("");
    try {
      await api("/api/techs", { method: "POST", body: JSON.stringify({ name: techName, phone: techPhone }) });
      setTechName("");
      setTechPhone("");
      await refresh();
      setMessage("Tech added.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the tech.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTech(id: string, active: boolean) {
    await api(`/api/techs/${id}`, { method: "PATCH", body: JSON.stringify({ active }) });
    await refresh();
  }

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ mode: string; url?: string; message?: string }>("/api/stripe/connect", { method: "POST" });
      if (data.url) window.location.href = data.url;
      else {
        setMessage(data.message || "Payments stay simulated.");
        await refresh();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not connect Stripe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="display text-4xl">Settings</h1>
        <p className="mt-1 text-muted">The public page, the crew, and where card payments go.</p>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {message ? <p className="text-sm text-pine-deep">{message}</p> : null}

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold">Shop</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="name">Name</Label><Input id="name" value={shop.name} onChange={(event) => setDraft({ ...shop, name: event.target.value })} /></div>
          <div><Label htmlFor="slug">Link</Label><Input id="slug" value={shop.slug} onChange={(event) => setDraft({ ...shop, slug: event.target.value })} /></div>
          <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={shop.phone ?? ""} onChange={(event) => setDraft({ ...shop, phone: event.target.value })} /></div>
          <div><Label htmlFor="email">Public email</Label><Input id="email" value={shop.email ?? ""} onChange={(event) => setDraft({ ...shop, email: event.target.value })} /></div>
          <div><Label htmlFor="city">City</Label><Input id="city" value={shop.city ?? ""} onChange={(event) => setDraft({ ...shop, city: event.target.value })} /></div>
          <div><Label htmlFor="state">State</Label><Input id="state" value={shop.state ?? ""} onChange={(event) => setDraft({ ...shop, state: event.target.value.toUpperCase() })} /></div>
          <div>
            <Label htmlFor="tz">Timezone</Label>
            <select id="tz" className="h-11 w-full rounded-xl border border-line bg-paper px-3" value={shop.timezone} onChange={(event) => setDraft({ ...shop, timezone: event.target.value })}>
              {US_TIMEZONES.map((zone) => <option key={zone}>{zone}</option>)}
            </select>
          </div>
          <div><Label htmlFor="color">Brand color</Label><Input id="color" value={shop.brandColor} onChange={(event) => setDraft({ ...shop, brandColor: event.target.value })} /></div>
        </div>
        <div className="mt-3"><Label htmlFor="tag">Tagline</Label><Input id="tag" value={shop.tagline ?? ""} onChange={(event) => setDraft({ ...shop, tagline: event.target.value })} /></div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={shop.allowFullPayment} onChange={(event) => setDraft({ ...shop, allowFullPayment: event.target.checked })} />
          Let customers pay the full amount online
        </label>
        <div className="mt-3 max-w-xs">
          <Label htmlFor="buffer">Buffer between jobs (minutes)</Label>
          <Input id="buffer" type="number" min={0} max={60} value={shop.bufferMin} onChange={(event) => setDraft({ ...shop, bufferMin: Number(event.target.value) })} />
        </div>
        <Button className="mt-4" disabled={busy} onClick={() => void saveProfile()}>Save shop</Button>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold">Hours</h2>
        <div className="mt-3"><HoursEditor hours={shop.hours} onChange={(hours) => setDraft({ ...shop, hours })} /></div>
        <Button className="mt-4" variant="outline" disabled={busy} onClick={() => void saveHours()}>Save hours</Button>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold">Service area</h2>
        <div className="mt-3"><ZipEditor zones={shop.zips} onChange={(zips) => setDraft({ ...shop, zips })} /></div>
        <Button className="mt-4" variant="outline" disabled={busy} onClick={() => void saveZips()}>Save zips</Button>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold">Crew</h2>
        <ul className="mt-3 space-y-2">
          {(business?.techs ?? []).map((tech) => (
            <li key={tech.id} className="flex items-center justify-between gap-3 text-sm">
              <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: tech.color }} />{tech.name} {tech.phone ? `· ${tech.phone}` : ""}</span>
              <button type="button" className="text-pine" onClick={() => void toggleTech(tech.id, !tech.active)}>{tech.active ? "Deactivate" : "Activate"}</button>
            </li>
          ))}
          {(business?.techs ?? []).length === 0 ? <li className="text-sm text-muted">Just you right now. The calendar still holds one job at a time.</li> : null}
        </ul>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Name" value={techName} onChange={(event) => setTechName(event.target.value)} aria-label="New tech name" />
          <Input placeholder="Phone" value={techPhone} onChange={(event) => setTechPhone(event.target.value)} aria-label="New tech phone" />
          <Button type="button" disabled={busy || techName.trim().length < 2} onClick={() => void addTech()}>Add</Button>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold">Payments</h2>
        <p className="mt-2 text-sm text-muted">
          {shop.paymentsMode === "stripe"
            ? `Stripe Connect is ready${shop.stripeAccountId ? ` (${shop.stripeAccountId})` : ""}. Card payments settle on the connected account.`
            : "Checkout is simulated. Connect a Stripe test key to send deposits to a Connect Express account."}
        </p>
        <Button className="mt-3" variant="outline" disabled={busy} onClick={() => void connect()}>
          {shop.stripeAccountId ? "Refresh Stripe connection" : "Connect Stripe"}
        </Button>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold">Embed on your website</h2>
        <Textarea className="mt-3 font-mono text-xs" readOnly value={snippet} />
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-semibold">Plan</h2>
        <p className="mt-2 text-sm text-muted">Trial. Subscription billing for the $49 / $99 / $199 plans is not switched on, and the crew limits are not enforced.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          {["Starter $49", "Growth $99", "Crew $199"].map((plan) => (
            <div key={plan} className="rounded-2xl border border-dashed border-line px-3 py-3 text-muted">{plan}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
