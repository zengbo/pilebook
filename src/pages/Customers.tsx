import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { EmptyState, ErrorNote, Input, StatusPill } from "../components/ui";
import { formatUsd } from "../shared/money";
import { formatLongDate, formatMinutes } from "../shared/time";
import type { Customer, Job } from "../types";

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ customers: Customer[] }>("/api/customers")
      .then((data) => setCustomers(data.customers))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load customers."))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) => `${customer.name} ${customer.email ?? ""} ${customer.phone ?? ""} ${customer.zip ?? ""}`.toLowerCase().includes(needle));
  }, [customers, query]);

  return (
    <div>
      <h1 className="display text-4xl">Customers</h1>
      <p className="mt-1 text-muted">Everyone who has booked, with what they’ve paid you.</p>
      <Input className="mt-4 max-w-md" placeholder="Search name, phone, or zip" value={query} onChange={(event) => setQuery(event.target.value)} />
      {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
      {loading ? <p className="mt-4 text-sm text-muted">Loading customers…</p> : null}
      {!loading && customers.length === 0 ? <div className="mt-4"><EmptyState title="No customers yet." body="The first booking from your public page creates the customer and their history." /></div> : null}
      {!loading && customers.length > 0 && shown.length === 0 ? <p className="mt-4 text-sm text-muted">No one matches that search.</p> : null}
      <div className="mt-4 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
        {shown.map((customer) => (
          <Link key={customer.id} to={`/app/customers/${customer.id}`} className="grid gap-1 px-4 py-3 hover:bg-paper sm:grid-cols-[1.4fr_1fr_auto]">
            <span>
              <span className="block font-medium">{customer.name}</span>
              <span className="text-sm text-muted">{customer.phone || customer.email}</span>
            </span>
            <span className="text-sm text-muted">{customer.zip} · {customer.jobCount ?? 0} jobs</span>
            <span className="text-sm font-medium">{formatUsd(customer.lifetimeCents ?? 0)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CustomerPage() {
  const { id = "" } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ customer: Customer; jobs: Job[] }>(`/api/customers/${id}`)
      .then((data) => {
        setCustomer(data.customer);
        setJobs(data.jobs);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not load this customer."));
  }, [id]);

  if (!customer) return error ? <ErrorNote>{error}</ErrorNote> : <p className="text-muted">Loading customer…</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/app/customers" className="text-sm text-pine">All customers</Link>
      <h1 className="display mt-2 text-4xl">{customer.name}</h1>
      <p className="mt-2 text-sm text-muted">{customer.phone}<br />{customer.email}<br />{[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(", ")}</p>
      <h2 className="mt-8 font-semibold">Job history</h2>
      {jobs.length === 0 ? <p className="mt-2 text-sm text-muted">No jobs yet.</p> : null}
      <div className="mt-3 space-y-3">
        {jobs.map((job) => {
          const start = Number(job.startsAt.slice(11, 13)) * 60 + Number(job.startsAt.slice(14, 16));
          return (
            <Link key={job.id} to={`/app/jobs/${job.id}`} className="block rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span>{formatLongDate(job.startsAt.slice(0, 10))} · {formatMinutes(start)}</span>
                <StatusPill status={job.status} />
              </div>
              <p className="mt-1 text-sm text-muted">{formatUsd(job.totalCents)} · paid {formatUsd(job.paidCents)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
