import type { HoursDay } from "../src/shared/defaults";
import type { PriceBook, Quote, TravelZone } from "../src/shared/quote";
import { fail } from "./errors";

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  createdAt: string;
};

export type Business = {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  timezone: string;
  brandColor: string;
  tagline: string | null;
  depositPercent: number;
  allowFullPayment: boolean;
  bufferMin: number;
  plan: string;
  stripeAccountId: string | null;
  stripeReady: boolean;
  onboardingComplete: boolean;
  createdAt: string;
};

export type Tech = {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string;
  active: boolean;
};

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  createdAt: string;
};

export type Job = {
  id: string;
  publicToken: string;
  businessId: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  address: string;
  city: string | null;
  state: string | null;
  zip: string;
  quote: Quote;
  totalCents: number;
  depositDueCents: number;
  paidCents: number;
  techId: string | null;
  notes: string | null;
  reminderSentAt: string | null;
  createdAt: string;
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  techName?: string | null;
  techColor?: string | null;
};

export type Payment = {
  id: string;
  jobId: string;
  businessId: string;
  amountCents: number;
  kind: string;
  status: string;
  provider: string;
  providerRef: string | null;
  createdAt: string;
};

export type Notice = {
  id: string;
  businessId: string | null;
  jobId: string | null;
  channel: string;
  kind: string;
  toAddress: string;
  subject: string | null;
  body: string;
  status: string;
  createdAt: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  created_at: string;
};

type BusinessRow = {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  timezone: string;
  brand_color: string;
  tagline: string | null;
  deposit_percent: number;
  allow_full_payment: number;
  buffer_min: number;
  plan: string;
  stripe_account_id: string | null;
  stripe_ready: number;
  onboarding_complete: number;
  created_at: string;
};

type JobRow = {
  id: string;
  public_token: string;
  business_id: string;
  customer_id: string;
  status: string;
  payment_status: string;
  starts_at: string;
  ends_at: string;
  duration_min: number;
  address: string;
  city: string | null;
  state: string | null;
  zip: string;
  quote_json: string;
  total_cents: number;
  deposit_due_cents: number;
  paid_cents: number;
  tech_id: string | null;
  notes: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  customer_name?: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  tech_name?: string | null;
  tech_color?: string | null;
  business_timezone?: string;
  business_name?: string;
};

const yes = (value: number) => value === 1;

function userFrom(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

function businessFrom(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    slug: row.slug,
    phone: row.phone,
    email: row.email,
    city: row.city,
    state: row.state,
    timezone: row.timezone,
    brandColor: row.brand_color,
    tagline: row.tagline,
    depositPercent: row.deposit_percent,
    allowFullPayment: yes(row.allow_full_payment),
    bufferMin: row.buffer_min,
    plan: row.plan,
    stripeAccountId: row.stripe_account_id,
    stripeReady: yes(row.stripe_ready),
    onboardingComplete: yes(row.onboarding_complete),
    createdAt: row.created_at,
  };
}

function jobFrom(row: JobRow): Job {
  let quote: Quote;
  try {
    quote = JSON.parse(row.quote_json) as Quote;
  } catch {
    fail(500, "Stored quote could not be read.");
  }
  return {
    id: row.id,
    publicToken: row.public_token,
    businessId: row.business_id,
    customerId: row.customer_id,
    status: row.status,
    paymentStatus: row.payment_status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    durationMin: row.duration_min,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    quote,
    totalCents: row.total_cents,
    depositDueCents: row.deposit_due_cents,
    paidCents: row.paid_cents,
    techId: row.tech_id,
    notes: row.notes,
    reminderSentAt: row.reminder_sent_at,
    createdAt: row.created_at,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    techName: row.tech_name,
    techColor: row.tech_color,
  };
}

export async function findUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const row = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<UserRow>();
  return row ? userFrom(row) : null;
}

export async function findUserById(db: D1Database, id: string): Promise<User | null> {
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  return row ? userFrom(row) : null;
}

export async function insertUser(db: D1Database, user: { id: string; email: string; name: string; passwordHash: string | null; createdAt: string }) {
  await db
    .prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(user.id, user.email, user.name, user.passwordHash, user.createdAt)
    .run();
}

export async function createSession(db: D1Database, id: string, userId: string, tokenHash: string, expiresAt: string) {
  await db
    .prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, tokenHash, expiresAt)
    .run();
}

export async function userForSession(db: D1Database, tokenHash: string, nowIso: string): Promise<User | null> {
  const row = await db
    .prepare(
      `SELECT users.* FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .bind(tokenHash, nowIso)
    .first<UserRow>();
  return row ? userFrom(row) : null;
}

export async function deleteSession(db: D1Database, tokenHash: string) {
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function insertMagicLink(db: D1Database, id: string, email: string, tokenHash: string, expiresAt: string) {
  await db
    .prepare("INSERT INTO magic_links (id, email, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, email, tokenHash, expiresAt)
    .run();
}

export async function takeMagicLink(db: D1Database, tokenHash: string, nowIso: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT id, email FROM magic_links WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?")
    .bind(tokenHash, nowIso)
    .first<{ id: string; email: string }>();
  if (!row) return null;
  await db.prepare("UPDATE magic_links SET used_at = ? WHERE id = ?").bind(nowIso, row.id).run();
  return row.email;
}

export async function businessForOwner(db: D1Database, userId: string): Promise<Business | null> {
  const row = await db.prepare("SELECT * FROM businesses WHERE owner_user_id = ?").bind(userId).first<BusinessRow>();
  return row ? businessFrom(row) : null;
}

export async function businessBySlug(db: D1Database, slug: string): Promise<Business | null> {
  const row = await db.prepare("SELECT * FROM businesses WHERE slug = ?").bind(slug).first<BusinessRow>();
  return row ? businessFrom(row) : null;
}

export async function businessById(db: D1Database, id: string): Promise<Business | null> {
  const row = await db.prepare("SELECT * FROM businesses WHERE id = ?").bind(id).first<BusinessRow>();
  return row ? businessFrom(row) : null;
}

export async function slugInUse(db: D1Database, slug: string, exceptId?: string): Promise<boolean> {
  const row = await db
    .prepare(`SELECT id FROM businesses WHERE slug = ? AND id != ?`)
    .bind(slug, exceptId ?? "")
    .first<{ id: string }>();
  return Boolean(row);
}

export async function insertBusiness(db: D1Database, business: Business) {
  await db
    .prepare(
      `INSERT INTO businesses (
        id, owner_user_id, name, slug, phone, email, city, state, timezone, brand_color, tagline,
        deposit_percent, allow_full_payment, buffer_min, plan, stripe_account_id, stripe_ready, onboarding_complete, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      business.id,
      business.ownerUserId,
      business.name,
      business.slug,
      business.phone,
      business.email,
      business.city,
      business.state,
      business.timezone,
      business.brandColor,
      business.tagline,
      business.depositPercent,
      business.allowFullPayment ? 1 : 0,
      business.bufferMin,
      business.plan,
      business.stripeAccountId,
      business.stripeReady ? 1 : 0,
      business.onboardingComplete ? 1 : 0,
      business.createdAt,
    )
    .run();
}

export async function updateBusinessFields(
  db: D1Database,
  id: string,
  fields: Partial<{
    name: string;
    slug: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    timezone: string;
    brandColor: string;
    tagline: string | null;
    depositPercent: number;
    allowFullPayment: boolean;
    bufferMin: number;
    stripeAccountId: string | null;
    stripeReady: boolean;
    onboardingComplete: boolean;
  }>,
) {
  const sets: string[] = [];
  const values: unknown[] = [];
  const map: Record<string, string> = {
    name: "name",
    slug: "slug",
    phone: "phone",
    email: "email",
    city: "city",
    state: "state",
    timezone: "timezone",
    brandColor: "brand_color",
    tagline: "tagline",
    depositPercent: "deposit_percent",
    allowFullPayment: "allow_full_payment",
    bufferMin: "buffer_min",
    stripeAccountId: "stripe_account_id",
    stripeReady: "stripe_ready",
    onboardingComplete: "onboarding_complete",
  };
  for (const [key, column] of Object.entries(map)) {
    if (key in fields) {
      const value = fields[key as keyof typeof fields];
      sets.push(`${column} = ?`);
      values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
    }
  }
  if (!sets.length) return;
  await db.prepare(`UPDATE businesses SET ${sets.join(", ")} WHERE id = ?`).bind(...values, id).run();
}

export async function hoursFor(db: D1Database, businessId: string): Promise<HoursDay[]> {
  const { results } = await db
    .prepare("SELECT weekday, closed, open_min, close_min FROM business_hours WHERE business_id = ? ORDER BY weekday")
    .bind(businessId)
    .all<{ weekday: number; closed: number; open_min: number | null; close_min: number | null }>();
  return results.map((row) => ({
    weekday: row.weekday,
    closed: yes(row.closed),
    openMin: row.open_min ?? 480,
    closeMin: row.close_min ?? 1020,
  }));
}

export async function replaceHours(db: D1Database, businessId: string, hours: HoursDay[]) {
  const statements = [
    db.prepare("DELETE FROM business_hours WHERE business_id = ?").bind(businessId),
    ...hours.map((day) =>
      db
        .prepare("INSERT INTO business_hours (business_id, weekday, open_min, close_min, closed) VALUES (?, ?, ?, ?, ?)")
        .bind(businessId, day.weekday, day.openMin, day.closeMin, day.closed ? 1 : 0),
    ),
  ];
  await db.batch(statements);
}

export async function zipsFor(db: D1Database, businessId: string): Promise<TravelZone[]> {
  const { results } = await db
    .prepare("SELECT zip, travel_fee_cents FROM service_zips WHERE business_id = ? ORDER BY zip")
    .bind(businessId)
    .all<TravelZone & { travel_fee_cents: number; zip: string }>();
  return results.map((row) => ({ zip: row.zip, travelFeeCents: row.travel_fee_cents }));
}

export async function replaceZips(db: D1Database, businessId: string, zones: TravelZone[]) {
  await db.batch([
    db.prepare("DELETE FROM service_zips WHERE business_id = ?").bind(businessId),
    ...zones.map((zone) =>
      db
        .prepare("INSERT INTO service_zips (business_id, zip, travel_fee_cents) VALUES (?, ?, ?)")
        .bind(businessId, zone.zip, zone.travelFeeCents),
    ),
  ]);
}

const PRICE_COLUMNS: Array<[keyof PriceBook, string]> = [
  ["roomCents", "room_cents"],
  ["hallwayCents", "hallway_cents"],
  ["stairFlightCents", "stair_flight_cents"],
  ["sqftCents", "sqft_cents"],
  ["sofaCents", "sofa_cents"],
  ["loveseatCents", "loveseat_cents"],
  ["chairCents", "chair_cents"],
  ["rugSmallCents", "rug_small_cents"],
  ["rugMediumCents", "rug_medium_cents"],
  ["rugLargeCents", "rug_large_cents"],
  ["petOdorPerAreaCents", "pet_odor_per_area_cents"],
  ["protectorPerAreaCents", "protector_per_area_cents"],
  ["deodorizerFlatCents", "deodorizer_flat_cents"],
  ["minJobCents", "min_job_cents"],
  ["roomMinutes", "room_minutes"],
  ["hallwayMinutes", "hallway_minutes"],
  ["stairFlightMinutes", "stair_flight_minutes"],
  ["sqftBlockMinutes", "sqft_block_minutes"],
  ["sofaMinutes", "sofa_minutes"],
  ["loveseatMinutes", "loveseat_minutes"],
  ["chairMinutes", "chair_minutes"],
  ["rugSmallMinutes", "rug_small_minutes"],
  ["rugMediumMinutes", "rug_medium_minutes"],
  ["rugLargeMinutes", "rug_large_minutes"],
  ["addonBufferMinutes", "addon_buffer_minutes"],
];

export async function priceBookFor(db: D1Database, businessId: string): Promise<PriceBook | null> {
  const row = await db.prepare("SELECT * FROM price_books WHERE business_id = ?").bind(businessId).first<Record<string, number>>();
  if (!row) return null;
  const book = {} as PriceBook;
  for (const [key, column] of PRICE_COLUMNS) book[key] = Number(row[column]);
  return book;
}

export async function savePriceBook(db: D1Database, businessId: string, book: PriceBook) {
  const columns = ["business_id", ...PRICE_COLUMNS.map(([, column]) => column)];
  const updates = PRICE_COLUMNS.map(([, column]) => `${column} = excluded.${column}`);
  await db
    .prepare(
      `INSERT INTO price_books (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})
       ON CONFLICT(business_id) DO UPDATE SET ${updates.join(", ")}`,
    )
    .bind(businessId, ...PRICE_COLUMNS.map(([key]) => book[key]))
    .run();
}

export async function techsFor(db: D1Database, businessId: string): Promise<Tech[]> {
  const { results } = await db
    .prepare("SELECT * FROM techs WHERE business_id = ? ORDER BY name")
    .bind(businessId)
    .all<{ id: string; business_id: string; name: string; email: string | null; phone: string | null; color: string; active: number }>();
  return results.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    color: row.color,
    active: yes(row.active),
  }));
}

export async function insertTech(db: D1Database, tech: Tech) {
  await db
    .prepare("INSERT INTO techs (id, business_id, name, email, phone, color, active) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(tech.id, tech.businessId, tech.name, tech.email, tech.phone, tech.color, tech.active ? 1 : 0)
    .run();
}

export async function updateTech(db: D1Database, businessId: string, id: string, fields: { name?: string; phone?: string | null; email?: string | null; active?: boolean; color?: string }) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) {
    sets.push("name = ?");
    values.push(fields.name);
  }
  if (fields.phone !== undefined) {
    sets.push("phone = ?");
    values.push(fields.phone);
  }
  if (fields.email !== undefined) {
    sets.push("email = ?");
    values.push(fields.email);
  }
  if (fields.color !== undefined) {
    sets.push("color = ?");
    values.push(fields.color);
  }
  if (fields.active !== undefined) {
    sets.push("active = ?");
    values.push(fields.active ? 1 : 0);
  }
  if (!sets.length) return;
  await db.prepare(`UPDATE techs SET ${sets.join(", ")} WHERE id = ? AND business_id = ?`).bind(...values, id, businessId).run();
}

export async function findCustomerByEmail(db: D1Database, businessId: string, email: string): Promise<Customer | null> {
  const row = await db
    .prepare("SELECT * FROM customers WHERE business_id = ? AND lower(email) = ?")
    .bind(businessId, email)
    .first<CustomerRow>();
  return row ? customerFrom(row) : null;
}

type CustomerRow = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
};

function customerFrom(row: CustomerRow): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    createdAt: row.created_at,
  };
}

export async function insertCustomer(db: D1Database, customer: Customer) {
  await db
    .prepare(
      `INSERT INTO customers (id, business_id, name, email, phone, address, city, state, zip, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      customer.id,
      customer.businessId,
      customer.name,
      customer.email,
      customer.phone,
      customer.address,
      customer.city,
      customer.state,
      customer.zip,
      customer.createdAt,
    )
    .run();
}

export async function updateCustomer(db: D1Database, customer: Customer) {
  await db
    .prepare(
      `UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, zip = ?
       WHERE id = ? AND business_id = ?`,
    )
    .bind(customer.name, customer.email, customer.phone, customer.address, customer.city, customer.state, customer.zip, customer.id, customer.businessId)
    .run();
}

export async function customersFor(db: D1Database, businessId: string): Promise<Array<Customer & { jobCount: number; lifetimeCents: number; lastStartsAt: string | null }>> {
  const { results } = await db
    .prepare(
      `SELECT customers.*,
        COUNT(jobs.id) AS job_count,
        COALESCE(SUM(CASE WHEN jobs.status != 'cancelled' THEN jobs.paid_cents ELSE 0 END), 0) AS lifetime_cents,
        MAX(jobs.starts_at) AS last_starts_at
       FROM customers
       LEFT JOIN jobs ON jobs.customer_id = customers.id
       WHERE customers.business_id = ?
       GROUP BY customers.id
       ORDER BY customers.name`,
    )
    .bind(businessId)
    .all<CustomerRow & { job_count: number; lifetime_cents: number; last_starts_at: string | null }>();
  return results.map((row) => ({
    ...customerFrom(row),
    jobCount: row.job_count,
    lifetimeCents: row.lifetime_cents,
    lastStartsAt: row.last_starts_at,
  }));
}

export async function customerById(db: D1Database, businessId: string, id: string): Promise<Customer | null> {
  const row = await db.prepare("SELECT * FROM customers WHERE business_id = ? AND id = ?").bind(businessId, id).first<CustomerRow>();
  return row ? customerFrom(row) : null;
}

const JOB_SELECT = `
  SELECT jobs.*,
    customers.name AS customer_name,
    customers.email AS customer_email,
    customers.phone AS customer_phone,
    techs.name AS tech_name,
    techs.color AS tech_color
  FROM jobs
  JOIN customers ON customers.id = jobs.customer_id
  LEFT JOIN techs ON techs.id = jobs.tech_id
`;

export async function jobsBetween(db: D1Database, businessId: string, from: string, to: string): Promise<Job[]> {
  const { results } = await db
    .prepare(`${JOB_SELECT} WHERE jobs.business_id = ? AND jobs.starts_at >= ? AND jobs.starts_at < ? ORDER BY jobs.starts_at`)
    .bind(businessId, from, to)
    .all<JobRow>();
  return results.map(jobFrom);
}

export async function jobsForCustomer(db: D1Database, businessId: string, customerId: string): Promise<Job[]> {
  const { results } = await db
    .prepare(`${JOB_SELECT} WHERE jobs.business_id = ? AND jobs.customer_id = ? ORDER BY jobs.starts_at DESC`)
    .bind(businessId, customerId)
    .all<JobRow>();
  return results.map(jobFrom);
}

export async function jobById(db: D1Database, businessId: string, id: string): Promise<Job | null> {
  const row = await db.prepare(`${JOB_SELECT} WHERE jobs.business_id = ? AND jobs.id = ?`).bind(businessId, id).first<JobRow>();
  return row ? jobFrom(row) : null;
}

export async function jobByToken(db: D1Database, slug: string, token: string): Promise<{ job: Job; business: Business } | null> {
  const row = await db
    .prepare(
      `${JOB_SELECT.replace("FROM jobs", "FROM jobs JOIN businesses ON businesses.id = jobs.business_id")}
       WHERE businesses.slug = ? AND jobs.public_token = ?`,
    )
    .bind(slug, token)
    .first<JobRow>();
  if (!row) return null;
  const business = await businessById(db, row.business_id);
  if (!business) return null;
  return { job: jobFrom(row), business };
}

export async function busyJobs(db: D1Database, businessId: string, day: string): Promise<Array<{ startMin: number; endMin: number; techId: string | null }>> {
  const { results } = await db
    .prepare(
      `SELECT starts_at, ends_at, tech_id FROM jobs
       WHERE business_id = ? AND starts_at >= ? AND starts_at < ? AND status != 'cancelled'`,
    )
    .bind(businessId, `${day}T00:00`, `${day}T99:99`)
    .all<{ starts_at: string; ends_at: string; tech_id: string | null }>();
  return results.map((row) => ({
    startMin: minutesOf(row.starts_at),
    endMin: minutesOf(row.ends_at),
    techId: row.tech_id,
  }));
}

function minutesOf(local: string): number {
  const time = local.split("T")[1] ?? "00:00";
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export async function insertJob(db: D1Database, job: Job) {
  await db
    .prepare(
      `INSERT INTO jobs (
        id, public_token, business_id, customer_id, status, payment_status, starts_at, ends_at, duration_min,
        address, city, state, zip, quote_json, total_cents, deposit_due_cents, paid_cents, tech_id, notes, reminder_sent_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      job.id,
      job.publicToken,
      job.businessId,
      job.customerId,
      job.status,
      job.paymentStatus,
      job.startsAt,
      job.endsAt,
      job.durationMin,
      job.address,
      job.city,
      job.state,
      job.zip,
      JSON.stringify(job.quote),
      job.totalCents,
      job.depositDueCents,
      job.paidCents,
      job.techId,
      job.notes,
      job.reminderSentAt,
      job.createdAt,
    )
    .run();
}

export async function saveJobStatus(
  db: D1Database,
  businessId: string,
  id: string,
  fields: { status?: string; paymentStatus?: string; paidCents?: number; techId?: string | null; notes?: string | null; reminderSentAt?: string | null },
) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.status !== undefined) {
    sets.push("status = ?");
    values.push(fields.status);
  }
  if (fields.paymentStatus !== undefined) {
    sets.push("payment_status = ?");
    values.push(fields.paymentStatus);
  }
  if (fields.paidCents !== undefined) {
    sets.push("paid_cents = ?");
    values.push(fields.paidCents);
  }
  if (fields.techId !== undefined) {
    sets.push("tech_id = ?");
    values.push(fields.techId);
  }
  if (fields.notes !== undefined) {
    sets.push("notes = ?");
    values.push(fields.notes);
  }
  if (fields.reminderSentAt !== undefined) {
    sets.push("reminder_sent_at = ?");
    values.push(fields.reminderSentAt);
  }
  if (!sets.length) return;
  await db.prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ? AND business_id = ?`).bind(...values, id, businessId).run();
}

export async function insertPayment(db: D1Database, payment: Payment) {
  await db
    .prepare(
      `INSERT INTO payments (id, job_id, business_id, amount_cents, kind, status, provider, provider_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(payment.id, payment.jobId, payment.businessId, payment.amountCents, payment.kind, payment.status, payment.provider, payment.providerRef, payment.createdAt)
    .run();
}

export async function paymentById(db: D1Database, id: string): Promise<Payment | null> {
  const row = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(id).first<PaymentRow>();
  return row ? paymentFrom(row) : null;
}

type PaymentRow = {
  id: string;
  job_id: string;
  business_id: string;
  amount_cents: number;
  kind: string;
  status: string;
  provider: string;
  provider_ref: string | null;
  created_at: string;
};

function paymentFrom(row: PaymentRow): Payment {
  return {
    id: row.id,
    jobId: row.job_id,
    businessId: row.business_id,
    amountCents: row.amount_cents,
    kind: row.kind,
    status: row.status,
    provider: row.provider,
    providerRef: row.provider_ref,
    createdAt: row.created_at,
  };
}

export async function paymentsForJob(db: D1Database, jobId: string): Promise<Payment[]> {
  const { results } = await db.prepare("SELECT * FROM payments WHERE job_id = ? ORDER BY created_at").bind(jobId).all<PaymentRow>();
  return results.map(paymentFrom);
}

export async function setPaymentProviderRef(db: D1Database, id: string, providerRef: string) {
  await db.prepare("UPDATE payments SET provider_ref = ? WHERE id = ?").bind(providerRef, id).run();
}

export async function markPaymentRowPaid(db: D1Database, id: string) {
  await db.prepare("UPDATE payments SET status = 'paid' WHERE id = ? AND status != 'paid'").bind(id).run();
}

export async function collectedBetween(db: D1Database, businessId: string, fromIso: string, toIso: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS cents FROM payments
       WHERE business_id = ? AND status = 'paid' AND created_at >= ? AND created_at < ?`,
    )
    .bind(businessId, fromIso, toIso)
    .first<{ cents: number }>();
  return row?.cents ?? 0;
}

export async function outstandingCents(db: D1Database, businessId: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(total_cents - paid_cents), 0) AS cents FROM jobs
       WHERE business_id = ? AND status != 'cancelled' AND paid_cents < total_cents`,
    )
    .bind(businessId)
    .first<{ cents: number }>();
  return row?.cents ?? 0;
}

export async function countJobs(db: D1Database, businessId: string, from: string, to: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM jobs
       WHERE business_id = ? AND status != 'cancelled' AND starts_at >= ? AND starts_at < ?`,
    )
    .bind(businessId, from, to)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function insertNotice(db: D1Database, notice: Notice) {
  await db
    .prepare(
      `INSERT INTO notifications (id, business_id, job_id, channel, kind, to_address, subject, body, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(notice.id, notice.businessId, notice.jobId, notice.channel, notice.kind, notice.toAddress, notice.subject, notice.body, notice.status, notice.createdAt)
    .run();
}

export async function noticesFor(db: D1Database, businessId: string): Promise<Notice[]> {
  const { results } = await db
    .prepare("SELECT * FROM notifications WHERE business_id = ? ORDER BY created_at DESC LIMIT 50")
    .bind(businessId)
    .all<{
      id: string;
      business_id: string | null;
      job_id: string | null;
      channel: string;
      kind: string;
      to_address: string;
      subject: string | null;
      body: string;
      status: string;
      created_at: string;
    }>();
  return results.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    jobId: row.job_id,
    channel: row.channel,
    kind: row.kind,
    toAddress: row.to_address,
    subject: row.subject,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function reminderCandidates(db: D1Database, fromLocal: string, toLocal: string): Promise<Array<Job & { timezone: string; businessName: string }>> {
  const { results } = await db
    .prepare(
      `SELECT jobs.*,
         customers.name AS customer_name,
         customers.email AS customer_email,
         customers.phone AS customer_phone,
         techs.name AS tech_name,
         techs.color AS tech_color,
         businesses.timezone AS business_timezone,
         businesses.name AS business_name
       FROM jobs
       JOIN customers ON customers.id = jobs.customer_id
       JOIN businesses ON businesses.id = jobs.business_id
       LEFT JOIN techs ON techs.id = jobs.tech_id
       WHERE jobs.reminder_sent_at IS NULL
         AND jobs.status IN ('booked', 'en_route')
         AND jobs.starts_at >= ? AND jobs.starts_at <= ?`,
    )
    .bind(fromLocal, toLocal)
    .all<JobRow>();
  return results.map((row) => ({
    ...jobFrom(row),
    timezone: row.business_timezone || "America/Chicago",
    businessName: row.business_name || "Your cleaner",
  }));
}
