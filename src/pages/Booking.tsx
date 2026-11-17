import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { Qty } from "../components/Fields";
import { Wordmark } from "../components/Mark";
import { Button, Input, Label, Textarea } from "../components/ui";
import { depositCents, formatUsd } from "../shared/money";
import { addDays, formatDuration, formatMinutes, localToday, weekdayOf } from "../shared/time";
import { WEEKDAYS } from "../shared/defaults";
import type { Business, Quote, Selection } from "../types";

const empty: Selection = {
  rooms: 0,
  hallways: 0,
  stairFlights: 0,
  openSqft: 0,
  sofas: 0,
  loveseats: 0,
  chairs: 0,
  rugsSmall: 0,
  rugsMedium: 0,
  rugsLarge: 0,
  petOdor: false,
  protector: false,
  deodorizer: false,
  zip: "",
};

export function BookingPage({ embed = false }: { embed?: boolean }) {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [missing, setMissing] = useState(false);
  const [selection, setSelection] = useState<Selection>(empty);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<number[]>([]);
  const [closed, setClosed] = useState(false);
  const [startMin, setStartMin] = useState<number | null>(null);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", address: "", city: "", state: "", notes: "" });
  const [pay, setPay] = useState<"deposit" | "full">("deposit");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quoting, setQuoting] = useState(false);

  useEffect(() => {
    api<{ business: Business }>(`/api/public/${slug}`)
      .then((data) => {
        setBusiness(data.business);
        setCustomer((current) => ({ ...current, city: data.business.city ?? "", state: data.business.state ?? "" }));
        setDate(localToday(data.business.timezone));
      })
      .catch(() => setMissing(true));
  }, [slug]);

  useEffect(() => {
    if (!business) return;
    const handle = window.setTimeout(() => {
      setQuoting(true);
      api<{ quote: Quote }>(`/api/public/${slug}/quote`, { method: "POST", body: JSON.stringify(selection) })
        .then((data) => setQuote(data.quote))
        .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not price that."))
        .finally(() => setQuoting(false));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [selection, business, slug]);

  useEffect(() => {
    if (!business || !date || !quote) return;
    api<{ slots: Array<{ startMin: number }>; closed: boolean }>(`/api/public/${slug}/slots`, {
      method: "POST",
      body: JSON.stringify({ ...selection, date }),
    })
      .then((data) => {
        setSlots(data.slots.map((slot) => slot.startMin));
        setClosed(data.closed);
        setStartMin((current) => (current != null && data.slots.some((slot) => slot.startMin === current) ? current : null));
      })
      .catch(() => {
        setSlots([]);
        setClosed(false);
      });
  }, [date, quote?.durationMin, quote?.totalCents, selection.zip, business, slug]);

  const days = useMemo(() => {
    if (!business) return [];
    const start = localToday(business.timezone);
    return Array.from({ length: 14 }, (_, index) => addDays(start, index));
  }, [business]);

  function patch<K extends keyof Selection>(key: K, value: Selection[K]) {
    setSelection((current) => ({ ...current, [key]: value }));
  }

  async function book() {
    if (!quote || startMin == null) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ payment: { url: string } }>(`/api/public/${slug}/book`, {
        method: "POST",
        body: JSON.stringify({
          ...selection,
          date,
          startMin,
          pay,
          customer: { ...customer, zip: selection.zip },
        }),
      });
      if (data.payment.url.startsWith("http")) window.location.href = data.payment.url;
      else navigate(data.payment.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not hold that time.");
    } finally {
      setBusy(false);
    }
  }

  if (missing) {
    return (
      <div className="pile-bg min-h-screen px-5 py-16">
        <h1 className="display text-4xl">That shop isn’t listed.</h1>
        <Link to="/" className="mt-4 inline-block text-pine">Back to Pilebook</Link>
      </div>
    );
  }
  if (!business || !quote) return <p className="px-5 py-16 text-muted">Loading the booking page…</p>;

  const bookPrice = business.priceBook;
  const deposit = depositCents(quote.totalCents, business.depositPercent);
  const canBook = quote.serviceable && startMin != null && !busy;

  return (
    <div className="min-h-screen" style={{ background: "#f6f1e8" }}>
      <header className="border-b border-black/5" style={{ background: business.brandColor }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-white">
          <div>
            <p className="display text-2xl">{business.name}</p>
            <p className="text-sm text-white/80">{business.tagline}</p>
          </div>
          <div className="text-right text-sm">
            <p>{business.phone}</p>
            <p>{business.city}, {business.state}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.7fr)]">
        <div className="space-y-6">
          {business.paymentsMode === "mock" ? (
            <p className="rounded-2xl bg-[#f4e4cf] px-4 py-3 text-sm text-brass-deep">Demo checkout: card numbers stay in the browser. Nothing is charged.</p>
          ) : null}
          <section className="rounded-3xl bg-white p-5">
            <h2 className="display text-3xl">What are we cleaning?</h2>
            <Qty label="Rooms" hint="Bedroom, living room, dining room" value={selection.rooms} onChange={(value) => patch("rooms", value)} price={bookPrice ? formatUsd(bookPrice.roomCents) : undefined} />
            <Qty label="Hallways" value={selection.hallways} onChange={(value) => patch("hallways", value)} price={bookPrice ? formatUsd(bookPrice.hallwayCents) : undefined} />
            <Qty label="Stair flights" value={selection.stairFlights} onChange={(value) => patch("stairFlights", value)} price={bookPrice ? formatUsd(bookPrice.stairFlightCents) : undefined} />
            <div className="flex items-center justify-between gap-3 border-b border-line/80 py-3">
              <div>
                <p className="font-medium">Open area</p>
                <p className="text-sm text-muted">Square feet, priced per foot</p>
              </div>
              <Input className="w-28" inputMode="numeric" aria-label="Open area square feet" value={selection.openSqft || ""} placeholder="0" onChange={(event) => patch("openSqft", Number(event.target.value.replace(/\D/g, "") || 0))} />
            </div>
            <Qty label="Sofa" value={selection.sofas} onChange={(value) => patch("sofas", value)} price={bookPrice ? formatUsd(bookPrice.sofaCents) : undefined} />
            <Qty label="Loveseat" value={selection.loveseats} onChange={(value) => patch("loveseats", value)} price={bookPrice ? formatUsd(bookPrice.loveseatCents) : undefined} />
            <Qty label="Chair" value={selection.chairs} onChange={(value) => patch("chairs", value)} price={bookPrice ? formatUsd(bookPrice.chairCents) : undefined} />
            <Qty label="Small area rug" hint="Up to about 4×6" value={selection.rugsSmall} onChange={(value) => patch("rugsSmall", value)} price={bookPrice ? formatUsd(bookPrice.rugSmallCents) : undefined} />
            <Qty label="Medium area rug" hint="Up to about 6×9" value={selection.rugsMedium} onChange={(value) => patch("rugsMedium", value)} price={bookPrice ? formatUsd(bookPrice.rugMediumCents) : undefined} />
            <Qty label="Large area rug" hint="Up to about 9×12" value={selection.rugsLarge} onChange={(value) => patch("rugsLarge", value)} price={bookPrice ? formatUsd(bookPrice.rugLargeCents) : undefined} />
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex gap-2"><input type="checkbox" checked={selection.petOdor} onChange={(event) => patch("petOdor", event.target.checked)} /> Pet odor treatment</label>
              <label className="flex gap-2"><input type="checkbox" checked={selection.protector} onChange={(event) => patch("protector", event.target.checked)} /> Stain protector</label>
              <label className="flex gap-2"><input type="checkbox" checked={selection.deodorizer} onChange={(event) => patch("deodorizer", event.target.checked)} /> Deodorizer</label>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5">
            <h2 className="display text-3xl">Where?</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="zip">Zip code</Label><Input id="zip" inputMode="numeric" maxLength={5} value={selection.zip} onChange={(event) => patch("zip", event.target.value.replace(/\D/g, "").slice(0, 5))} /></div>
              <div className="sm:col-span-2"><Label htmlFor="address">Street address</Label><Input id="address" value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} /></div>
              <div><Label htmlFor="city">City</Label><Input id="city" value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} /></div>
              <div><Label htmlFor="state">State</Label><Input id="state" maxLength={2} value={customer.state} onChange={(event) => setCustomer({ ...customer, state: event.target.value.toUpperCase() })} /></div>
            </div>
            <p className="mt-2 text-xs text-muted">We travel to {business.zips.map((zone) => zone.zip).join(", ") || "the zips on file"}.</p>
          </section>

          <section className="rounded-3xl bg-white p-5">
            <h2 className="display text-3xl">When?</h2>
            <p className="mt-1 text-sm text-muted">{quote.durationMin ? `About ${formatDuration(quote.durationMin)} on site.` : "Add a service to see open times."}</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => {
                const hours = business.hours.find((entry) => entry.weekday === weekdayOf(day));
                const isClosed = !hours || hours.closed;
                return (
                  <button key={day} type="button" disabled={isClosed} onClick={() => setDate(day)} className={`min-w-20 rounded-2xl border px-3 py-2 text-left text-sm ${date === day ? "border-transparent bg-ink text-paper" : "border-line bg-paper"} disabled:opacity-40`}>
                    <span className="block text-xs uppercase">{WEEKDAYS[weekdayOf(day)]?.slice(0, 3)}</span>
                    <span className="font-semibold">{day.slice(8)}</span>
                  </button>
                );
              })}
            </div>
            {closed ? <p className="mt-3 text-sm text-muted">Closed that day.</p> : null}
            {!closed && quote.durationMin > 0 && slots.length === 0 ? <p className="mt-3 text-sm text-muted">No open slots. The crew is booked, or the job runs past close.</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button key={slot} type="button" onClick={() => setStartMin(slot)} className={`rounded-full px-3 py-2 text-sm ${startMin === slot ? "bg-pine text-paper" : "bg-paper"}`}>
                  {formatMinutes(slot)}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5">
            <h2 className="display text-3xl">Who should we ask for?</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="who">Name</Label><Input id="who" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></div>
              <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} /></div>
              <div className="sm:col-span-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></div>
              <div className="sm:col-span-2"><Label htmlFor="notes">Gate code, pets, parking</Label><Textarea id="notes" value={customer.notes} onChange={(event) => setCustomer({ ...customer, notes: event.target.value })} /></div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-3xl p-5 text-white" style={{ background: business.brandColor }}>
            <p className="text-sm text-white/75">{quoting ? "Updating the quote…" : "Your quote"}</p>
            <p className="display mt-2 text-5xl">{formatUsd(quote.totalCents)}</p>
            <p className="text-sm text-white/80">{quote.durationMin ? formatDuration(quote.durationMin) : "Add rooms or furniture"}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {quote.lines.map((line) => (
                <li key={line.key} className="flex justify-between gap-3"><span className="min-w-0">{line.qty} × {line.label}</span><span className="shrink-0">{formatUsd(line.totalCents)}</span></li>
              ))}
            </ul>
            {quote.warnings.map((warning) => <p key={warning} className="mt-3 text-sm text-[#f4e4cf]">{warning}</p>)}
            <div className="mt-4 space-y-2">
              <label className="flex items-center justify-between gap-3 rounded-2xl bg-black/15 px-3 py-2 text-sm">
                <span><input type="radio" name="pay" checked={pay === "deposit"} onChange={() => setPay("deposit")} /> Deposit {formatUsd(deposit)}</span>
              </label>
              {business.allowFullPayment ? (
                <label className="flex items-center justify-between gap-3 rounded-2xl bg-black/15 px-3 py-2 text-sm">
                  <span><input type="radio" name="pay" checked={pay === "full"} onChange={() => setPay("full")} /> Pay in full {formatUsd(quote.totalCents)}</span>
                </label>
              ) : null}
            </div>
            {error ? <p className="mt-3 text-sm text-[#f4e4cf]">{error}</p> : null}
            <Button className="mt-4 w-full bg-white text-ink hover:bg-[#f3eee6]" disabled={!canBook} onClick={() => void book()}>
              {busy ? "Holding the time…" : startMin == null ? "Pick a time" : `Book ${formatMinutes(startMin)}`}
            </Button>
          </div>
          {embed ? null : (
            <p className="mt-3 text-center text-xs text-muted">
              Scheduling by <Link to="/" className="underline"><Wordmark /></Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
