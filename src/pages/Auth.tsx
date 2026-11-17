import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { Wordmark } from "../components/Mark";
import { Button, ErrorNote, Input, Label } from "../components/ui";
import { useSession } from "../session";
import type { Business, User } from "../types";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setSession } = useSession();
  const [tab, setTab] = useState<"password" | "magic">("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(mode === "login" ? "demo@northloop.example" : "");
  const [password, setPassword] = useState(mode === "login" ? "demo-clean-2026" : "");
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState("");
  const [busy, setBusy] = useState(false);
  const magic = params.get("magic");

  async function finish(user: User, business: Business | null) {
    setSession(user, business);
    const next = params.get("next");
    if (business?.onboardingComplete) navigate(next && next.startsWith("/app") ? next : "/app");
    else navigate("/onboarding");
  }

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body = mode === "signup" ? { name, email, password } : { email, password };
      const data = await api<{ user: User; business: Business | null }>(path, { method: "POST", body: JSON.stringify(body) });
      await finish(data.user, data.business);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function onMagic(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ devLink?: string }>("/api/auth/magic/request", { method: "POST", body: JSON.stringify({ email }) });
      setDevLink(data.devLink ?? "");
      if (!data.devLink) setError("Check the server log for the sign-in link. Email is in console mode.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the link.");
    } finally {
      setBusy(false);
    }
  }

  async function consume() {
    if (!magic) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: User; business: Business | null }>("/api/auth/magic/consume", {
        method: "POST",
        body: JSON.stringify({ token: magic }),
      });
      await finish(data.user, data.business);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That link did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pile-bg min-h-screen">
      <div className="stripe-rule" />
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-8 lg:grid-cols-2">
        <div>
          <Link to="/"><Wordmark /></Link>
          <h1 className="display mt-8 text-5xl">{mode === "signup" ? "Set up the shop." : "Welcome back."}</h1>
          <p className="mt-3 max-w-md text-muted">
            {mode === "signup"
              ? "You’ll name the business, drop in the zips you drive, set hours, and add the techs. Pricing starts from a carpet-cleaning default you can edit."
              : "The demo shop is already on the calendar, with a public booking page you can click through."}
          </p>
          {mode === "login" ? (
            <div className="mt-6 rounded-2xl border border-line bg-card p-4 text-sm">
              <p className="font-medium">Demo owner</p>
              <p className="mt-1 text-muted">demo@northloop.example</p>
              <p className="text-muted">demo-clean-2026</p>
            </div>
          ) : null}
        </div>
        <form onSubmit={tab === "password" ? onPassword : onMagic} className="rounded-3xl border border-line bg-card p-6">
          <div className="mb-5 flex gap-2 text-sm">
            <button type="button" className={`rounded-full px-3 py-1.5 ${tab === "password" ? "bg-ink text-paper" : "bg-paper"}`} onClick={() => setTab("password")}>
              Email & password
            </button>
            <button type="button" className={`rounded-full px-3 py-1.5 ${tab === "magic" ? "bg-ink text-paper" : "bg-paper"}`} onClick={() => setTab("magic")}>
              Magic link
            </button>
          </div>
          {mode === "signup" && tab === "password" ? (
            <div className="mb-3">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
          ) : null}
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {tab === "password" ? (
            <div className="mt-3">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">We’ll email a one-time link. In local dev it also prints in the server log, and shows here when the dev flag is on.</p>
          )}
          {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
          {devLink ? (
            <a className="mt-4 block rounded-xl bg-foam px-3 py-2 text-sm text-pine-deep" href={devLink}>
              Open the sign-in link
            </a>
          ) : null}
          <Button className="mt-5 w-full" disabled={busy}>{busy ? "Working…" : tab === "magic" ? "Email me a link" : mode === "signup" ? "Create account" : "Sign in"}</Button>
          {magic ? (
            <Button type="button" variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => void consume()}>
              Continue with the link in this URL
            </Button>
          ) : null}
          <p className="mt-4 text-sm text-muted">
            {mode === "signup" ? <Link to="/login">Already have a shop? Sign in</Link> : <Link to="/signup">New shop? Create an account</Link>}
          </p>
        </form>
      </div>
    </div>
  );
}
