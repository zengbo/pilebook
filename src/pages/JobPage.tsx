import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { Button, ErrorNote, StatusPill } from "../components/ui";
import { formatUsd } from "../shared/money";
import { STATUS_LABEL, type JobStatus } from "../shared/status";
import { formatLongDate, formatMinutes } from "../shared/time";
import { useSession } from "../session";
import type { Job } from "../types";

const flow: JobStatus[] = ["booked", "en_route", "done", "paid"];

export function JobPage() {
  const { id = "" } = useParams();
  const { business, refresh } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<{ job: Job }>(`/api/jobs/${id}`);
    setJob(data.job);
  }

  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load the job."));
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ job: Job }>(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setJob(data.job);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the job.");
    } finally {
      setBusy(false);
    }
  }

  async function collect() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ url: string; provider: string; amountCents: number }>(`/api/jobs/${id}/payment-link`, {
        method: "POST",
        body: JSON.stringify({ kind: "balance" }),
      });
      setLink(data.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create a payment link.");
    } finally {
      setBusy(false);
    }
  }

  if (!job) return <div>{error ? <ErrorNote>{error}</ErrorNote> : <p className="text-muted">Loading the job…</p>}</div>;
  const date = job.startsAt.slice(0, 10);
  const start = Number(job.startsAt.slice(11, 13)) * 60 + Number(job.startsAt.slice(14, 16));

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/app/calendar" className="text-sm text-pine">Back to calendar</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-4xl">{job.customerName}</h1>
          <p className="mt-1 text-muted">{formatLongDate(date)} at {formatMinutes(start)} · {job.durationMin} min</p>
        </div>
        <StatusPill status={job.status} />
      </div>
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {flow.map((status) => (
          <Button key={status} type="button" size="sm" variant={job.status === status ? "default" : "outline"} disabled={busy} onClick={() => void patch({ status })}>
            {STATUS_LABEL[status]}
          </Button>
        ))}
        {job.status !== "cancelled" ? (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void patch({ status: "cancelled" })}>Cancel job</Button>
        ) : null}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-line bg-card p-4">
          <h2 className="font-semibold">Visit</h2>
          <p className="mt-2 text-sm">{job.address}<br />{job.city}, {job.state} {job.zip}</p>
          <p className="mt-2 text-sm text-muted">{job.customerPhone}<br />{job.customerEmail}</p>
          <label className="mt-4 block text-sm font-medium" htmlFor="tech">Assign tech</label>
          <select id="tech" className="mt-1 h-11 w-full rounded-xl border border-line bg-paper px-3" value={job.techId ?? ""} onChange={(event) => void patch({ techId: event.target.value || null })}>
            <option value="">Unassigned</option>
            {(business?.techs ?? []).map((tech) => (
              <option key={tech.id} value={tech.id}>{tech.name}{tech.active ? "" : " (inactive)"}</option>
            ))}
          </select>
          {job.notes ? <p className="mt-3 text-sm text-muted">Note: {job.notes}</p> : null}
        </section>
        <section className="rounded-3xl border border-line bg-card p-4">
          <h2 className="font-semibold">Money</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {job.quote.lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-3"><span>{line.qty} × {line.label}</span><span>{formatUsd(line.totalCents)}</span></li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between font-semibold"><span>Total</span><span>{formatUsd(job.totalCents)}</span></p>
          <p className="flex justify-between text-sm text-muted"><span>Paid</span><span>{formatUsd(job.paidCents)}</span></p>
          <p className="flex justify-between text-sm"><span>Remaining</span><span>{formatUsd(job.balanceCents)}</span></p>
          {job.balanceCents > 0 && job.status !== "cancelled" ? (
            <Button className="mt-4" type="button" disabled={busy} onClick={() => void collect()}>Collect {formatUsd(job.balanceCents)}</Button>
          ) : null}
          {link ? (
            <p className="mt-3 break-all text-sm">
              Payment link ({business?.paymentsMode === "stripe" ? "Stripe" : "simulated"}): <a className="text-pine" href={link}>{link}</a>
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted">Marking the job Paid records any leftover as cash so the month’s revenue includes it. Card links go to the business, not to Pilebook.</p>
        </section>
      </div>
    </div>
  );
}
