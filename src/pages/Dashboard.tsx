import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { EmptyState, ErrorNote, StatusPill } from "../components/ui";
import { formatUsd } from "../shared/money";
import { formatLongDate, formatMinutes, localMinutes, localToday } from "../shared/time";
import { useSession } from "../session";
import type { Job } from "../types";

function clock(iso: string) {
  const minutes = Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
  return formatMinutes(minutes);
}

export function Dashboard() {
  const { user, business } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [revenue, setRevenue] = useState<{ collectedMonthCents: number; outstandingCents: number; jobsWeek: number; jobsToday: number; today: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!business) return;
    const today = localToday(business.timezone);
    const tomorrow = new Date(`${today}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const next = tomorrow.toISOString().slice(0, 10);
    Promise.all([
      api<{ jobs: Job[] }>(`/api/jobs?from=${today}&to=${next}`),
      api<{ collectedMonthCents: number; outstandingCents: number; jobsWeek: number; jobsToday: number; today: string }>("/api/revenue"),
    ])
      .then(([jobData, money]) => {
        setJobs(jobData.jobs.filter((job) => job.status !== "cancelled"));
        setRevenue(money);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load today."));
  }, [business]);

  const nowMin = business ? localMinutes(business.timezone) : new Date().getHours() * 60;
  const hello = nowMin < 12 * 60 ? "Good morning" : nowMin < 17 * 60 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <p className="text-sm text-muted">{business ? formatLongDate(localToday(business.timezone)) : ""}</p>
      <h1 className="display mt-1 text-4xl">{hello}, {user?.name.split(" ")[0]}.</h1>
      <p className="mt-2 max-w-xl text-muted">{business?.name} · {revenue ? `${revenue.jobsToday} job${revenue.jobsToday === 1 ? "" : "s"} today` : "Loading the board…"}</p>
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Collected this month", revenue ? formatUsd(revenue.collectedMonthCents) : "—"],
          ["Still outstanding", revenue ? formatUsd(revenue.outstandingCents) : "—"],
          ["Jobs this week", revenue ? String(revenue.jobsWeek) : "—"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-line bg-card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="display mt-2 text-3xl">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today’s route</h2>
          <Link to="/app/calendar" className="text-sm text-pine">Week view</Link>
        </div>
        {!revenue ? <p className="text-sm text-muted">Loading jobs…</p> : null}
        {revenue && jobs.length === 0 ? (
          <EmptyState title="Nothing on the truck today." body="Share the booking page when the phone is quiet. New deposits land on this list." />
        ) : null}
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link key={job.id} to={`/app/jobs/${job.id}`} className="block rounded-3xl border border-line bg-card p-4 hover:border-pine">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{clock(job.startsAt)} · {job.customerName}</p>
                <StatusPill status={job.status} />
              </div>
              <p className="mt-1 text-sm text-muted">{job.address}, {job.city} {job.zip}</p>
              <p className="mt-2 text-sm">{job.techName ? job.techName : "Unassigned"} · {formatUsd(job.paidCents)} paid · {formatUsd(job.balanceCents)} left</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
