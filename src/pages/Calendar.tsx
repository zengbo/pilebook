import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { ErrorNote } from "../components/ui";
import { addDays, formatLongDate, formatMinutes, localToday, startOfWeek, weekdayOf } from "../shared/time";
import { WEEKDAYS } from "../shared/defaults";
import { useSession } from "../session";
import type { Job } from "../types";

const START = 7 * 60;
const END = 18 * 60;
const PX = 1.05;

function minutes(iso: string) {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

export function CalendarPage() {
  const { business } = useSession();
  const today = business ? localToday(business.timezone) : localToday("America/Chicago");
  const [anchor, setAnchor] = useState(startOfWeek(today));
  const [mode, setMode] = useState<"week" | "day">("week");
  const [focus, setFocus] = useState(today);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(anchor, index)), [anchor]);
  const visible = mode === "day" ? [focus] : days;

  useEffect(() => {
    const from = mode === "day" ? focus : anchor;
    const to = addDays(mode === "day" ? focus : addDays(anchor, 6), 1);
    setLoading(true);
    api<{ jobs: Job[] }>(`/api/jobs?from=${from}&to=${to}`)
      .then((data) => setJobs(data.jobs.filter((job) => job.status !== "cancelled")))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load the calendar."))
      .finally(() => setLoading(false));
  }, [anchor, focus, mode]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl">Calendar</h1>
          <p className="text-sm text-muted">{formatLongDate(visible[0] ?? anchor)}{visible.length > 1 ? ` – ${formatLongDate(visible[visible.length - 1] ?? anchor)}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => { setAnchor(addDays(anchor, mode === "day" ? -1 : -7)); setFocus(addDays(focus, -1)); }}>Previous</button>
          <button className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => { setAnchor(startOfWeek(today)); setFocus(today); }}>Today</button>
          <button className="rounded-full border border-line bg-card px-3 py-2 text-sm" onClick={() => { setAnchor(addDays(anchor, mode === "day" ? 1 : 7)); setFocus(addDays(focus, 1)); }}>Next</button>
          <button className={`rounded-full px-3 py-2 text-sm ${mode === "day" ? "bg-ink text-paper" : "border border-line bg-card"}`} onClick={() => setMode("day")}>Day</button>
          <button className={`rounded-full px-3 py-2 text-sm ${mode === "week" ? "bg-ink text-paper" : "border border-line bg-card"}`} onClick={() => setMode("week")}>Week</button>
        </div>
      </div>
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading the week…</p> : null}
      <div className={`mt-4 grid gap-3 ${mode === "week" ? "lg:grid-cols-7" : "grid-cols-1"}`}>
        {mode === "week" ? (
          <div className="flex gap-2 overflow-x-auto lg:hidden">
            {days.map((day) => (
              <button key={day} className={`rounded-full px-3 py-1 text-sm ${day === focus ? "bg-pine text-paper" : "bg-card"}`} onClick={() => { setFocus(day); setMode("day"); }}>
                {WEEKDAYS[weekdayOf(day)]?.slice(0, 3)} {day.slice(8)}
              </button>
            ))}
          </div>
        ) : null}
        {visible.map((day) => {
          const dayJobs = jobs.filter((job) => job.startsAt.startsWith(day));
          return (
            <section key={day} className={`${mode === "week" ? "hidden lg:block" : ""}`}>
              <header className="mb-2">
                <p className="text-xs uppercase tracking-wide text-muted">{WEEKDAYS[weekdayOf(day)]}</p>
                <p className="font-semibold">{formatLongDate(day)}</p>
              </header>
              <div className="relative rounded-2xl border border-line bg-card" style={{ height: (END - START) * PX }}>
                <div className="calendar-grid absolute inset-0" />
                {Array.from({ length: END / 60 - START / 60 + 1 }, (_, index) => START + index * 60).map((mark) => (
                  <span key={mark} className="absolute left-1 text-[10px] text-muted" style={{ top: (mark - START) * PX - 6 }}>{formatMinutes(mark)}</span>
                ))}
                {dayJobs.length === 0 ? <p className="absolute inset-x-2 top-8 text-center text-xs text-muted">No jobs</p> : null}
                {dayJobs.map((job) => {
                  const start = minutes(job.startsAt);
                  const top = Math.max(0, (start - START) * PX);
                  const height = Math.max(28, job.durationMin * PX);
                  return (
                    <Link
                      key={job.id}
                      to={`/app/jobs/${job.id}`}
                      className="absolute right-1 left-10 overflow-hidden rounded-xl px-2 py-1 text-xs text-white"
                      style={{ top, height, background: job.techColor || "#1f6b5a" }}
                    >
                      <span className="block font-semibold">{formatMinutes(start)} {job.customerName}</span>
                      <span className="block opacity-90">{job.techName || "Unassigned"}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {mode === "week" ? (
        <div className="mt-4 space-y-2 lg:hidden">
          {jobs.filter((job) => job.startsAt.startsWith(focus)).length === 0 ? <p className="text-sm text-muted">No jobs on {formatLongDate(focus)}. Pick another day above, or switch to week on a larger screen.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
