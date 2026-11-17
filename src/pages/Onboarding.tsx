import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { HoursEditor, ZipEditor } from "../components/Fields";
import { Wordmark } from "../components/Mark";
import { Button, ErrorNote, Input, Label } from "../components/ui";
import { defaultHours, US_TIMEZONES } from "../shared/defaults";
import { useSession } from "../session";
import type { Business } from "../types";

const steps = ["Shop", "Zips", "Hours", "Crew"];

export function Onboarding() {
  const { user, business, loading, setSession } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [timezone, setTimezone] = useState<string>("America/Chicago");
  const [tagline, setTagline] = useState("Carpet, upholstery, and area rugs.");
  const [zips, setZips] = useState([{ zip: "", travelFeeCents: 0 }]);
  const [hours, setHours] = useState(defaultHours());
  const [techs, setTechs] = useState([{ name: "", phone: "" }]);

  if (loading) return <p className="p-8 text-muted">Loading…</p>;
  if (!user) return <Navigate to="/signup" replace />;
  if (business?.onboardingComplete) return <Navigate to="/app" replace />;

  function problem(current: number): string {
    if (current === 0) {
      if (name.trim().length < 2) return "Enter the business name.";
      if (city.trim().length < 2) return "Enter the city.";
      if (!/^[A-Z]{2}$/.test(state)) return "State needs exactly 2 letters, such as MN.";
    }
    if (current === 1 && !zips.some((zone) => /^\d{5}$/.test(zone.zip))) return "Add at least one 5-digit zip code.";
    if (current === 2 && hours.every((day) => day.closed)) return "Stay open at least one day.";
    return "";
  }

  function continueStep() {
    const message = problem(step);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep(step + 1);
  }

  async function finish() {
    const message = problem(0) || problem(1) || problem(2);
    if (message) {
      setError(message);
      if (message.includes("zip")) setStep(1);
      else if (message.includes("open")) setStep(2);
      else setStep(0);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ business: Business }>("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug,
          phone,
          city,
          state,
          timezone,
          tagline,
          zips: zips.filter((zone) => zone.zip),
          hours,
          techs: techs.filter((tech) => tech.name.trim()),
        }),
      });
      setSession(user, data.business);
      navigate("/app/pricing");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not save the shop.";
      setError(message);
      if (message.toLowerCase().includes("zip")) setStep(1);
      else if (message.toLowerCase().includes("hour") || message.toLowerCase().includes("open")) setStep(2);
      else setStep(0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pile-bg min-h-screen">
      <div className="stripe-rule" />
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Wordmark />
        <p className="mt-8 text-sm text-muted">Step {step + 1} of {steps.length} · {steps[step]}</p>
        <div className="mt-2 flex gap-1">
          {steps.map((label, index) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-pine" : "bg-line"}`} />
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-line bg-card p-6">
          {step === 0 ? (
            <div className="space-y-3">
              <h1 className="display text-4xl">What do customers call you?</h1>
              <div>
                <Label htmlFor="biz">Business name</Label>
                <Input id="biz" value={name} onChange={(event) => setName(event.target.value)} placeholder="North Loop Carpet Co." />
              </div>
              <div>
                <Label htmlFor="slug">Booking link</Label>
                <Input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="north-loop" />
                <p className="mt-1 text-xs text-muted">Public page will live at /b/{slug || "your-shop"}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Shop phone</Label>
                  <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="612-555-0144" />
                </div>
                <div>
                  <Label htmlFor="tz">Timezone</Label>
                  <select id="tz" className="h-11 w-full rounded-xl border border-line bg-card px-3" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                    {US_TIMEZONES.map((zone) => (
                      <option key={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={state} maxLength={2} autoComplete="off" placeholder="MN" onChange={(event) => setState(event.target.value.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase())} />
                </div>
              </div>
              <div>
                <Label htmlFor="tag">Tagline on the booking page</Label>
                <Input id="tag" value={tagline} onChange={(event) => setTagline(event.target.value)} />
              </div>
            </div>
          ) : null}
          {step === 1 ? (
            <div>
              <h1 className="display text-4xl">Where will you drive?</h1>
              <p className="mb-4 mt-2 text-sm text-muted">Only these zips can book. Travel fee is extra, on top of the minimum.</p>
              <div className="mb-2 grid grid-cols-[1fr_8rem_auto] text-xs uppercase tracking-wide text-muted">
                <span>Zip</span><span>Fee $</span><span />
              </div>
              <ZipEditor zones={zips} onChange={setZips} />
            </div>
          ) : null}
          {step === 2 ? (
            <div>
              <h1 className="display text-4xl">When is the crew on the clock?</h1>
              <p className="mb-4 mt-2 text-sm text-muted">Slots are offered inside these hours, with room for the job and a 15 minute buffer.</p>
              <HoursEditor hours={hours} onChange={setHours} />
            </div>
          ) : null}
          {step === 3 ? (
            <div>
              <h1 className="display text-4xl">Who’s in the truck?</h1>
              <p className="mb-4 mt-2 text-sm text-muted">Leave this blank if it’s just you. One person still gets a full calendar.</p>
              <div className="space-y-3">
                {techs.map((tech, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Tech name" aria-label={`Tech ${index + 1} name`} value={tech.name} onChange={(event) => setTechs(techs.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))} />
                    <Input placeholder="Phone" aria-label={`Tech ${index + 1} phone`} value={tech.phone} onChange={(event) => setTechs(techs.map((item, i) => (i === index ? { ...item, phone: event.target.value } : item)))} />
                  </div>
                ))}
                <button type="button" className="text-sm font-medium text-pine" onClick={() => setTechs([...techs, { name: "", phone: "" }])}>Add another tech</button>
              </div>
            </div>
          ) : null}
          {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
          <div className="mt-6 flex justify-between">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
            {step < 3 ? (
              <Button type="button" onClick={continueStep}>Continue</Button>
            ) : (
              <Button type="button" disabled={busy} onClick={() => void finish()}>{busy ? "Saving…" : "Save and set prices"}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
