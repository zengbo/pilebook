import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { formatUsd } from "../shared/money";
import { formatDuration, formatLongDate, formatMinutes } from "../shared/time";
import type { Job } from "../types";

export function ConfirmedPage() {
  const { slug = "", token = "" } = useParams();
  const [params] = useSearchParams();
  const [job, setJob] = useState<Job | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionId = params.get("session_id");
    const paymentId = params.get("payment");
    const confirm = sessionId && paymentId
      ? api("/api/public/checkout/confirm", { method: "POST", body: JSON.stringify({ sessionId, paymentId }) }).catch(() => undefined)
      : Promise.resolve();
    confirm
      .then(() => api<{ businessName: string; phone: string | null; job: Job }>(`/api/public/${slug}/confirmation/${token}`))
      .then((data) => {
        setName(data.businessName);
        setPhone(data.phone);
        setJob(data.job);
      })
      .catch(() => setError("We couldn’t find that booking."));
  }, [slug, token, params]);

  if (error) return <div className="pile-bg min-h-screen px-5 py-16"><p>{error}</p><Link to={`/b/${slug}`}>Back to booking</Link></div>;
  if (!job) return <p className="px-5 py-16 text-muted">Loading your confirmation…</p>;
  const start = Number(job.startsAt.slice(11, 13)) * 60 + Number(job.startsAt.slice(14, 16));

  return (
    <div className="pile-bg min-h-screen px-4 py-10">
      <article className="mx-auto max-w-lg rounded-3xl border border-line bg-card p-6">
        <p className="text-sm text-muted">{name}</p>
        <h1 className="display mt-1 text-4xl">{job.paidCents > 0 ? "You’re booked." : "Time held."}</h1>
        <p className="mt-2 text-muted">{formatLongDate(job.startsAt.slice(0, 10))} at {formatMinutes(start)} · {formatDuration(job.durationMin)}</p>
        <p className="mt-4 text-sm">{job.address}, {job.city} {job.state} {job.zip}</p>
        <ul className="mt-4 space-y-1 text-sm">
          {job.quote.lines.map((line) => (
            <li key={line.key} className="flex justify-between"><span>{line.qty} × {line.label}</span><span>{formatUsd(line.totalCents)}</span></li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between font-semibold"><span>Total</span><span>{formatUsd(job.totalCents)}</span></p>
        <p className="flex justify-between text-sm"><span>Paid</span><span>{formatUsd(job.paidCents)}</span></p>
        <p className="flex justify-between text-sm"><span>Due after the job</span><span>{formatUsd(job.balanceCents)}</span></p>
        <p className="mt-4 text-sm text-muted">{job.paidCents > 0 ? "A confirmation is in your inbox — or in the shop’s message log, if email is set to console." : "Finish the deposit from the link in your email if you closed checkout."} {phone ? `Questions: ${phone}.` : ""}</p>
        <Link to={`/b/${slug}`} className="mt-6 inline-block text-sm text-pine">Book another visit</Link>
      </article>
    </div>
  );
}
