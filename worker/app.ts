import { Hono } from "hono";
import { ApiError, fail } from "./errors";
import { currentUser, endSession, startSession } from "./auth";
import {
  businessById,
  businessBySlug,
  businessForOwner,
  busyJobs,
  collectedBetween,
  countJobs,
  customerById,
  customersFor,
  findCustomerByEmail,
  findUserByEmail,
  hoursFor,
  insertBusiness,
  insertCustomer,
  insertJob,
  insertMagicLink,
  insertPayment,
  insertTech,
  insertUser,
  jobById,
  jobByToken,
  jobsBetween,
  jobsForCustomer,
  markPaymentRowPaid,
  noticesFor,
  outstandingCents,
  paymentById,
  paymentsForJob,
  priceBookFor,
  replaceHours,
  replaceZips,
  saveJobStatus,
  savePriceBook,
  setPaymentProviderRef,
  slugInUse,
  takeMagicLink,
  techsFor,
  updateBusinessFields,
  updateCustomer,
  updateTech,
  zipsFor,
  type Business,
  type Customer,
  type Job,
  type Payment,
  type Tech,
} from "./data";
import { sendBookingNotice, sendDepositNotice } from "./notify";
import {
  accountChargesEnabled,
  createAccountLink,
  createCheckoutSession,
  createExpressAccount,
  retrieveCheckoutSession,
  stripeReady,
  verifyStripeSignature,
} from "./payments";
import { runReminders } from "./reminders";
import { hashPassword, randomToken, sha256Hex, verifyPassword } from "../src/shared/password";
import { BOOKING_HORIZON_DAYS, defaultPriceBook, LEAD_TIME_MIN, SLOT_STEP_MIN, TECH_COLORS, type HoursDay } from "../src/shared/defaults";
import { depositCents, formatUsd } from "../src/shared/money";
import { quote, type PriceBook, type TravelZone } from "../src/shared/quote";
import { availableSlots } from "../src/shared/slots";
import { isJobStatus } from "../src/shared/status";
import { addDays, combineLocal, isIsoDate, localMinutes, localToday, startOfWeek, weekdayOf, zonedLocalToUtc } from "../src/shared/time";
import {
  asObject,
  colorOf,
  emailOf,
  hoursFrom,
  personName,
  phoneOf,
  priceBookFrom,
  quoteRequestFrom,
  slugOf,
  stateOf,
  text,
  timezoneOf,
  zipOf,
  zonesFrom,
} from "./validate";

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ error: err.message }, err.status as 400);
  console.log(JSON.stringify({ level: "error", event: "unhandled", message: err instanceof Error ? err.message : "error" }));
  return c.json({ error: "Something went wrong." }, 500);
});

app.get("/api/health", (c) => c.json({ ok: true, service: "pilebook" }));

function filled(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function readBody(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown>> {
  try {
    return asObject(await c.req.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    fail(400, "Expected JSON.");
  }
}

async function requireUser(c: Parameters<typeof currentUser>[0]) {
  const user = await currentUser(c);
  if (!user) fail(401, "Sign in to continue.");
  return user;
}

async function requireOwner(c: Parameters<typeof currentUser>[0]) {
  const user = await requireUser(c);
  const business = await businessForOwner(c.env.DB, user.id);
  if (!business) fail(409, "Finish setting up your business.");
  return { user, business };
}

async function loadShop(db: D1Database, business: Business) {
  const hours = await hoursFor(db, business.id);
  const zips = await zipsFor(db, business.id);
  const priceBook = await priceBookFor(db, business.id);
  const techs = await techsFor(db, business.id);
  return { business, hours, zips, priceBook, techs };
}

function presentBusiness(
  loaded: { business: Business; hours: HoursDay[]; zips: TravelZone[]; priceBook: PriceBook | null; techs: Tech[] },
  env: Env,
  pub = false,
) {
  const { business } = loaded;
  const paymentsMode = stripeReady(env, business.stripeAccountId, business.stripeReady) ? "stripe" : "mock";
  const shared = {
    id: business.id,
    name: business.name,
    slug: business.slug,
    phone: business.phone,
    email: business.email,
    city: business.city,
    state: business.state,
    timezone: business.timezone,
    brandColor: business.brandColor,
    tagline: business.tagline,
    depositPercent: business.depositPercent,
    allowFullPayment: business.allowFullPayment,
    bufferMin: business.bufferMin,
    paymentsMode,
    hours: loaded.hours,
    zips: loaded.zips,
    priceBook: loaded.priceBook,
  };
  if (pub) return shared;
  return {
    ...shared,
    plan: business.plan,
    stripeReady: business.stripeReady,
    stripeAccountId: business.stripeAccountId,
    onboardingComplete: business.onboardingComplete,
    techs: loaded.techs,
  };
}

function presentJob(job: Job) {
  return {
    id: job.id,
    publicToken: job.publicToken,
    status: job.status,
    paymentStatus: job.paymentStatus,
    startsAt: job.startsAt,
    endsAt: job.endsAt,
    durationMin: job.durationMin,
    address: job.address,
    city: job.city,
    state: job.state,
    zip: job.zip,
    quote: job.quote,
    totalCents: job.totalCents,
    depositDueCents: job.depositDueCents,
    paidCents: job.paidCents,
    balanceCents: Math.max(0, job.totalCents - job.paidCents),
    techId: job.techId,
    techName: job.techName ?? null,
    techColor: job.techColor ?? null,
    notes: job.notes,
    customerId: job.customerId,
    customerName: job.customerName ?? null,
    customerEmail: job.customerEmail ?? null,
    customerPhone: job.customerPhone ?? null,
    createdAt: job.createdAt,
  };
}

async function applyPayment(db: D1Database, paymentId: string): Promise<{ payment: Payment; job: Job; added: number } | null> {
  const payment = await paymentById(db, paymentId);
  if (!payment) return null;
  const existing = await jobById(db, payment.businessId, payment.jobId);
  if (!existing) return null;
  if (payment.status === "paid") return { payment, job: existing, added: 0 };
  const room = Math.max(0, existing.totalCents - existing.paidCents);
  const added = Math.min(room, payment.amountCents);
  const paidCents = existing.paidCents + added;
  const paymentStatus = paidCents >= existing.totalCents ? "paid" : paidCents > 0 ? "deposit_paid" : "unpaid";
  const status = paymentStatus === "paid" && (existing.status === "done" || existing.status === "paid") ? "paid" : existing.status;
  await markPaymentRowPaid(db, payment.id);
  await saveJobStatus(db, existing.businessId, existing.id, { paidCents, paymentStatus, status });
  const job = await jobById(db, existing.businessId, existing.id);
  if (!job) return null;
  return { payment: { ...payment, status: "paid" }, job, added };
}

async function openCheckout(
  c: Parameters<typeof currentUser>[0],
  business: Business,
  job: Job,
  amountCents: number,
  kind: string,
): Promise<{ payment: Payment; url: string; provider: "mock" | "stripe" }> {
  const provider = stripeReady(c.env, business.stripeAccountId, business.stripeReady) ? "stripe" : "mock";
  const payment: Payment = {
    id: crypto.randomUUID(),
    jobId: job.id,
    businessId: business.id,
    amountCents,
    kind,
    status: "pending",
    provider,
    providerRef: null,
    createdAt: new Date().toISOString(),
  };
  await insertPayment(c.env.DB, payment);
  const origin = new URL(c.req.url).origin;
  if (provider === "mock" || !business.stripeAccountId) {
    return { payment, provider: "mock", url: `${origin}/pay/${payment.id}` };
  }
  const secret = filled(c.env.STRIPE_SECRET_KEY);
  if (!secret) return { payment, provider: "mock", url: `${origin}/pay/${payment.id}` };
  const session = await createCheckoutSession({
    secretKey: secret,
    stripeAccountId: business.stripeAccountId,
    amountCents,
    productName: `${business.name} — ${kind === "balance" ? "remaining balance" : kind === "full" ? "carpet cleaning" : "deposit"}`,
    successUrl: `${origin}/b/${business.slug}/confirmed/${job.publicToken}?session_id={CHECKOUT_SESSION_ID}&payment=${payment.id}`,
    cancelUrl: `${origin}/b/${business.slug}?payment=cancelled`,
    paymentId: payment.id,
    jobId: job.id,
  });
  await setPaymentProviderRef(c.env.DB, payment.id, session.id);
  return { payment, provider: "stripe", url: session.url };
}

app.post("/api/auth/signup", async (c) => {
  const body = await readBody(c);
  const email = emailOf(text(body, "email"));
  const name = personName(text(body, "name"));
  const password = text(body, "password");
  if (password.length < 8 || password.length > 200) fail(400, "Use a password of at least 8 characters.");
  if (await findUserByEmail(c.env.DB, email)) fail(409, "That email already has an account. Sign in instead.");
  const now = new Date().toISOString();
  const user = { id: crypto.randomUUID(), email, name, passwordHash: await hashPassword(password), createdAt: now };
  await insertUser(c.env.DB, user);
  await startSession(c, user.id);
  return c.json({ user: { id: user.id, email, name }, business: null });
});

app.post("/api/auth/login", async (c) => {
  const body = await readBody(c);
  const email = emailOf(text(body, "email"));
  const password = text(body, "password");
  const user = await findUserByEmail(c.env.DB, email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) fail(401, "Email or password doesn't match.");
  await startSession(c, user.id);
  const business = await businessForOwner(c.env.DB, user.id);
  const loaded = business ? await loadShop(c.env.DB, business) : null;
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    business: loaded ? presentBusiness(loaded, c.env) : null,
  });
});

app.post("/api/auth/magic/request", async (c) => {
  const body = await readBody(c);
  const email = emailOf(text(body, "email"));
  const token = randomToken();
  const expires = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  await insertMagicLink(c.env.DB, crypto.randomUUID(), email, await sha256Hex(token), expires);
  const url = `${new URL(c.req.url).origin}/login?magic=${token}`;
  const { createEmailProvider } = await import("./mailer");
  await createEmailProvider(c.env).send({
    to: email,
    subject: "Your Pilebook sign-in link",
    text: `Sign in to Pilebook:\n${url}\n\nThis link expires in 20 minutes. If you did not ask for it, ignore this email.`,
  });
  return c.json({ ok: true, devLink: c.env.DEV_EXPOSE_MAGIC_LINK === "1" ? url : undefined });
});

app.post("/api/auth/magic/consume", async (c) => {
  const body = await readBody(c);
  const token = text(body, "token");
  if (token.length < 20) fail(400, "That sign-in link is not valid.");
  const email = await takeMagicLink(c.env.DB, await sha256Hex(token), new Date().toISOString());
  if (!email) fail(400, "That sign-in link expired or was already used.");
  let user = await findUserByEmail(c.env.DB, email);
  if (!user) {
    const local = email.split("@")[0] ?? "Owner";
    const name = local.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 80) || "Owner";
    const now = new Date().toISOString();
    await insertUser(c.env.DB, { id: crypto.randomUUID(), email, name, passwordHash: null, createdAt: now });
    user = await findUserByEmail(c.env.DB, email);
  }
  if (!user) fail(500, "Could not create the account.");
  await startSession(c, user.id);
  const business = await businessForOwner(c.env.DB, user.id);
  const loaded = business ? await loadShop(c.env.DB, business) : null;
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    business: loaded ? presentBusiness(loaded, c.env) : null,
  });
});

app.post("/api/auth/logout", async (c) => {
  await endSession(c);
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ user: null, business: null });
  const business = await businessForOwner(c.env.DB, user.id);
  const loaded = business ? await loadShop(c.env.DB, business) : null;
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    business: loaded ? presentBusiness(loaded, c.env) : null,
  });
});

app.post("/api/onboarding", async (c) => {
  const user = await requireUser(c);
  if (await businessForOwner(c.env.DB, user.id)) fail(409, "This account already has a business.");
  const body = await readBody(c);
  const name = personName(text(body, "name"), "Business name");
  const slug = slugOf(text(body, "slug") || name);
  if (await slugInUse(c.env.DB, slug)) fail(409, "That booking link is taken. Try another.");
  const phone = phoneOf(text(body, "phone"), false);
  const email = text(body, "email") ? emailOf(text(body, "email")) : user.email;
  const city = personName(text(body, "city"), "City");
  const state = stateOf(text(body, "state"));
  const timezone = timezoneOf(text(body, "timezone") || "America/Chicago");
  const brandColor = text(body, "brandColor") ? colorOf(text(body, "brandColor")) : "#1f6b5a";
  const tagline = text(body, "tagline").slice(0, 140) || "Carpet, upholstery, and area rugs.";
  const zones = zonesFrom(body.zips);
  const hours = hoursFrom(body.hours);
  const techRows = Array.isArray(body.techs) ? body.techs : [];
  if (techRows.length > 10) fail(400, "Pilebook's crew plan stops at 10 techs.");
  const now = new Date().toISOString();
  const business: Business = {
    id: crypto.randomUUID(),
    ownerUserId: user.id,
    name,
    slug,
    phone,
    email,
    city,
    state,
    timezone,
    brandColor,
    tagline,
    depositPercent: 30,
    allowFullPayment: true,
    bufferMin: 15,
    plan: "trial",
    stripeAccountId: null,
    stripeReady: false,
    onboardingComplete: true,
    createdAt: now,
  };
  await insertBusiness(c.env.DB, business);
  await replaceHours(c.env.DB, business.id, hours);
  await replaceZips(c.env.DB, business.id, zones);
  await savePriceBook(c.env.DB, business.id, defaultPriceBook());
  let colorIndex = 0;
  for (const entry of techRows) {
    const row = asObject(entry);
    const techName = text(row, "name");
    if (!techName) continue;
    await insertTech(c.env.DB, {
      id: crypto.randomUUID(),
      businessId: business.id,
      name: personName(techName, "Tech name"),
      email: text(row, "email") ? emailOf(text(row, "email")) : null,
      phone: phoneOf(text(row, "phone"), false),
      color: TECH_COLORS[colorIndex % TECH_COLORS.length] ?? "#1f6b5a",
      active: true,
    });
    colorIndex += 1;
  }
  const loaded = await loadShop(c.env.DB, business);
  return c.json({ business: presentBusiness(loaded, c.env) });
});

app.patch("/api/business", async (c) => {
  const { business } = await requireOwner(c);
  const body = await readBody(c);
  const fields: Parameters<typeof updateBusinessFields>[2] = {};
  if ("name" in body) fields.name = personName(text(body, "name"), "Business name");
  if ("slug" in body) {
    const slug = slugOf(text(body, "slug"));
    if (await slugInUse(c.env.DB, slug, business.id)) fail(409, "That booking link is taken.");
    fields.slug = slug;
  }
  if ("phone" in body) fields.phone = phoneOf(text(body, "phone"), false);
  if ("email" in body) fields.email = text(body, "email") ? emailOf(text(body, "email")) : null;
  if ("city" in body) fields.city = text(body, "city").slice(0, 80);
  if ("state" in body) fields.state = stateOf(text(body, "state"));
  if ("timezone" in body) fields.timezone = timezoneOf(text(body, "timezone"));
  if ("brandColor" in body) fields.brandColor = colorOf(text(body, "brandColor"));
  if ("tagline" in body) fields.tagline = text(body, "tagline").slice(0, 140);
  if ("depositPercent" in body) {
    const percent = Number(body.depositPercent);
    if (!Number.isInteger(percent) || percent < 10 || percent > 100) fail(400, "Deposit should be 10–100%.");
    fields.depositPercent = percent;
  }
  if ("allowFullPayment" in body) fields.allowFullPayment = body.allowFullPayment === true;
  if ("bufferMin" in body) {
    const buffer = Number(body.bufferMin);
    if (!Number.isInteger(buffer) || buffer < 0 || buffer > 60) fail(400, "Buffer should be 0–60 minutes.");
    fields.bufferMin = buffer;
  }
  await updateBusinessFields(c.env.DB, business.id, fields);
  const next = await businessById(c.env.DB, business.id);
  if (!next) fail(404, "Business not found.");
  return c.json({ business: presentBusiness(await loadShop(c.env.DB, next), c.env) });
});

app.put("/api/pricing", async (c) => {
  const { business } = await requireOwner(c);
  const book = priceBookFrom(await readBody(c));
  await savePriceBook(c.env.DB, business.id, book);
  return c.json({ priceBook: book });
});

app.put("/api/hours", async (c) => {
  const { business } = await requireOwner(c);
  const body = await readBody(c);
  const hours = hoursFrom(body.hours);
  await replaceHours(c.env.DB, business.id, hours);
  return c.json({ hours });
});

app.put("/api/zips", async (c) => {
  const { business } = await requireOwner(c);
  const body = await readBody(c);
  const zips = zonesFrom(body.zips);
  await replaceZips(c.env.DB, business.id, zips);
  return c.json({ zips });
});

app.post("/api/techs", async (c) => {
  const { business } = await requireOwner(c);
  const existing = await techsFor(c.env.DB, business.id);
  if (existing.length >= 10) fail(400, "10 techs is the crew limit.");
  const body = await readBody(c);
  const tech: Tech = {
    id: crypto.randomUUID(),
    businessId: business.id,
    name: personName(text(body, "name"), "Tech name"),
    email: text(body, "email") ? emailOf(text(body, "email")) : null,
    phone: phoneOf(text(body, "phone"), false),
    color: text(body, "color") ? colorOf(text(body, "color")) : (TECH_COLORS[existing.length % TECH_COLORS.length] ?? "#1f6b5a"),
    active: true,
  };
  await insertTech(c.env.DB, tech);
  return c.json({ tech });
});

app.patch("/api/techs/:id", async (c) => {
  const { business } = await requireOwner(c);
  const body = await readBody(c);
  const fields: { name?: string; phone?: string | null; email?: string | null; active?: boolean; color?: string } = {};
  if ("name" in body) fields.name = personName(text(body, "name"), "Tech name");
  if ("phone" in body) fields.phone = phoneOf(text(body, "phone"), false);
  if ("email" in body) fields.email = text(body, "email") ? emailOf(text(body, "email")) : null;
  if ("active" in body) fields.active = body.active === true;
  if ("color" in body) fields.color = colorOf(text(body, "color"));
  await updateTech(c.env.DB, business.id, c.req.param("id"), fields);
  const techs = await techsFor(c.env.DB, business.id);
  return c.json({ techs });
});

app.get("/api/jobs", async (c) => {
  const { business } = await requireOwner(c);
  const from = c.req.query("from") ?? "";
  const to = c.req.query("to") ?? "";
  if (!isIsoDate(from) || !isIsoDate(to)) fail(400, "Use from and to dates.");
  const jobs = await jobsBetween(c.env.DB, business.id, `${from}T00:00`, `${to}T00:00`);
  return c.json({ jobs: jobs.map(presentJob) });
});

app.get("/api/jobs/:id", async (c) => {
  const { business } = await requireOwner(c);
  const job = await jobById(c.env.DB, business.id, c.req.param("id"));
  if (!job) fail(404, "Job not found.");
  const payments = await paymentsForJob(c.env.DB, job.id);
  return c.json({ job: presentJob(job), payments });
});

app.patch("/api/jobs/:id", async (c) => {
  const { business } = await requireOwner(c);
  const job = await jobById(c.env.DB, business.id, c.req.param("id"));
  if (!job) fail(404, "Job not found.");
  const body = await readBody(c);
  let status = job.status;
  let paymentStatus = job.paymentStatus;
  let paidCents = job.paidCents;
  if ("status" in body) {
    const next = text(body, "status");
    if (!isJobStatus(next)) fail(400, "Unknown job status.");
    status = next;
    if (next === "paid") {
      const remainder = job.totalCents - job.paidCents;
      if (remainder > 0) {
        await insertPayment(c.env.DB, {
          id: crypto.randomUUID(),
          jobId: job.id,
          businessId: business.id,
          amountCents: remainder,
          kind: "balance",
          status: "paid",
          provider: "cash",
          providerRef: null,
          createdAt: new Date().toISOString(),
        });
      }
      paidCents = job.totalCents;
      paymentStatus = "paid";
    } else if (next === "done" && job.paidCents >= job.totalCents) {
      status = "paid";
      paymentStatus = "paid";
    }
  }
  const fields: { status: string; paymentStatus: string; paidCents: number; techId?: string | null; notes?: string | null } = {
    status,
    paymentStatus,
    paidCents,
  };
  if ("techId" in body) {
    const techId = body.techId == null || body.techId === "" ? null : String(body.techId);
    if (techId) {
      const techs = await techsFor(c.env.DB, business.id);
      if (!techs.some((tech) => tech.id === techId)) fail(400, "That tech is not on this crew.");
    }
    fields.techId = techId;
  }
  if ("notes" in body) fields.notes = text(body, "notes").slice(0, 500);
  await saveJobStatus(c.env.DB, business.id, job.id, fields);
  const updated = await jobById(c.env.DB, business.id, job.id);
  if (!updated) fail(404, "Job not found.");
  return c.json({ job: presentJob(updated) });
});

app.post("/api/jobs/:id/payment-link", async (c) => {
  const { business } = await requireOwner(c);
  const job = await jobById(c.env.DB, business.id, c.req.param("id"));
  if (!job) fail(404, "Job not found.");
  const remaining = job.totalCents - job.paidCents;
  if (remaining <= 0) fail(400, "This job is already paid in full.");
  if (job.status === "cancelled") fail(400, "Cancelled jobs can't take payment.");
  const checkout = await openCheckout(c, business, job, remaining, "balance");
  return c.json({
    url: checkout.url,
    provider: checkout.provider,
    amountCents: remaining,
    paymentId: checkout.payment.id,
  });
});

app.get("/api/customers", async (c) => {
  const { business } = await requireOwner(c);
  return c.json({ customers: await customersFor(c.env.DB, business.id) });
});

app.get("/api/customers/:id", async (c) => {
  const { business } = await requireOwner(c);
  const customer = await customerById(c.env.DB, business.id, c.req.param("id"));
  if (!customer) fail(404, "Customer not found.");
  const jobs = await jobsForCustomer(c.env.DB, business.id, customer.id);
  return c.json({ customer, jobs: jobs.map(presentJob) });
});

app.get("/api/revenue", async (c) => {
  const { business } = await requireOwner(c);
  const today = localToday(business.timezone);
  const monthStartLocal = `${today.slice(0, 7)}-01T00:00`;
  const monthStart = zonedLocalToUtc(monthStartLocal, business.timezone).toISOString();
  const nextMonth = zonedLocalToUtc(`${addDays(`${today.slice(0, 7)}-01`, 32).slice(0, 7)}-01T00:00`, business.timezone).toISOString();
  const week = startOfWeek(today);
  return c.json({
    collectedMonthCents: await collectedBetween(c.env.DB, business.id, monthStart, nextMonth),
    outstandingCents: await outstandingCents(c.env.DB, business.id),
    jobsWeek: await countJobs(c.env.DB, business.id, `${week}T00:00`, `${addDays(week, 7)}T00:00`),
    jobsToday: await countJobs(c.env.DB, business.id, `${today}T00:00`, `${addDays(today, 1)}T00:00`),
    today,
  });
});

app.get("/api/notifications", async (c) => {
  const { business } = await requireOwner(c);
  return c.json({ notifications: await noticesFor(c.env.DB, business.id) });
});

app.post("/api/stripe/connect", async (c) => {
  const user = await requireUser(c);
  const business = await businessForOwner(c.env.DB, user.id);
  if (!business) fail(409, "Finish setting up your business.");
  const secret = filled(c.env.STRIPE_SECRET_KEY);
  const origin = new URL(c.req.url).origin;
  if (!secret) {
    await updateBusinessFields(c.env.DB, business.id, {
      stripeAccountId: `acct_mock_${business.id.replace(/-/g, "").slice(0, 12)}`,
      stripeReady: true,
    });
    return c.json({
      mode: "mock",
      message: "No Stripe test key is configured. Deposits are simulated and never leave this demo.",
    });
  }
  let accountId = business.stripeAccountId;
  if (!accountId || accountId.startsWith("acct_mock")) {
    accountId = await createExpressAccount(secret, business.email || user.email);
    await updateBusinessFields(c.env.DB, business.id, { stripeAccountId: accountId, stripeReady: false });
  }
  const url = await createAccountLink(
    secret,
    accountId,
    `${origin}/api/stripe/connect/refresh`,
    `${origin}/api/stripe/connect/return`,
  );
  return c.json({ mode: "stripe", url });
});

app.get("/api/stripe/connect/return", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.redirect("/login");
  const business = await businessForOwner(c.env.DB, user.id);
  if (!business?.stripeAccountId) return c.redirect("/app/settings");
  const secret = filled(c.env.STRIPE_SECRET_KEY);
  if (secret && !business.stripeAccountId.startsWith("acct_mock")) {
    const ready = await accountChargesEnabled(secret, business.stripeAccountId);
    await updateBusinessFields(c.env.DB, business.id, { stripeReady: ready });
  }
  return c.redirect("/app/settings?stripe=return");
});

app.get("/api/stripe/connect/refresh", async (c) => {
  return c.redirect("/app/settings?stripe=refresh");
});

app.post("/api/stripe/webhook", async (c) => {
  const payload = await c.req.text();
  const secret = filled(c.env.STRIPE_WEBHOOK_SECRET);
  if (secret) {
    const valid = await verifyStripeSignature(secret, payload, c.req.header("stripe-signature"));
    if (!valid) fail(400, "Invalid Stripe signature.");
  } else if (c.env.DEV_EXPOSE_MAGIC_LINK !== "1") {
    fail(400, "Stripe webhook secret is not configured.");
  }
  const event = JSON.parse(payload) as {
    type?: string;
    data?: { object?: { payment_status?: string; metadata?: { payment_id?: string } } };
  };
  if (event.type === "checkout.session.completed" && event.data?.object?.payment_status === "paid") {
    const paymentId = event.data.object.metadata?.payment_id;
    if (paymentId) {
      const applied = await applyPayment(c.env.DB, paymentId);
      if (applied && applied.added > 0) {
        const business = await businessById(c.env.DB, applied.job.businessId);
        if (business) await sendDepositNotice(c.env, business, applied.job, applied.added);
      }
    }
  }
  return c.json({ received: true });
});

app.post("/api/dev/reminders", async (c) => {
  if (c.env.DEV_EXPOSE_MAGIC_LINK !== "1") fail(404, "Not found.");
  return c.json(await runReminders(c.env));
});

app.get("/api/public/:slug", async (c) => {
  const business = await businessBySlug(c.env.DB, c.req.param("slug"));
  if (!business?.onboardingComplete) fail(404, "That booking page is not available.");
  return c.json({ business: presentBusiness(await loadShop(c.env.DB, business), c.env, true) });
});

async function pricedFor(db: D1Database, business: Business, body: Record<string, unknown>, zip: string) {
  const book = (await priceBookFor(db, business.id)) ?? defaultPriceBook();
  const zones = await zipsFor(db, business.id);
  return { book, zones, priced: quote(quoteRequestFrom(body, zip), book, zones) };
}

app.post("/api/public/:slug/quote", async (c) => {
  const business = await businessBySlug(c.env.DB, c.req.param("slug"));
  if (!business?.onboardingComplete) fail(404, "That booking page is not available.");
  const body = await readBody(c);
  const zip = text(body, "zip");
  if (zip) zipOf(zip);
  const { priced } = await pricedFor(c.env.DB, business, body, zip);
  return c.json({ quote: priced });
});

async function openingsFor(db: D1Database, business: Business, date: string, durationMin: number) {
  if (!isIsoDate(date)) fail(400, "Pick a date.");
  const today = localToday(business.timezone);
  if (date < today || date > addDays(today, BOOKING_HORIZON_DAYS)) fail(400, "That date is outside the booking window.");
  const hours = await hoursFor(db, business.id);
  const day = hours.find((entry) => entry.weekday === weekdayOf(date));
  const techs = (await techsFor(db, business.id)).filter((tech) => tech.active);
  const techIds = techs.length ? techs.map((tech) => tech.id) : ["owner"];
  const earliest = date === today ? localMinutes(business.timezone) + LEAD_TIME_MIN : 0;
  const slots = availableSlots({
    openMin: day && !day.closed ? day.openMin : null,
    closeMin: day && !day.closed ? day.closeMin : null,
    durationMin,
    stepMin: SLOT_STEP_MIN,
    bufferMin: business.bufferMin,
    techIds,
    busy: await busyJobs(db, business.id, date),
    earliestStartMin: earliest,
  });
  return { slots, closed: !day || day.closed };
}

app.post("/api/public/:slug/slots", async (c) => {
  const business = await businessBySlug(c.env.DB, c.req.param("slug"));
  if (!business?.onboardingComplete) fail(404, "That booking page is not available.");
  const body = await readBody(c);
  const zip = text(body, "zip");
  if (zip) zipOf(zip);
  const { priced } = await pricedFor(c.env.DB, business, body, zip);
  const date = text(body, "date");
  const { slots, closed } = await openingsFor(c.env.DB, business, date, priced.durationMin);
  return c.json({
    quote: priced,
    closed,
    slots: slots.map((slot) => ({ startMin: slot.startMin })),
  });
});

app.post("/api/public/:slug/book", async (c) => {
  const business = await businessBySlug(c.env.DB, c.req.param("slug"));
  if (!business?.onboardingComplete) fail(404, "That booking page is not available.");
  const body = await readBody(c);
  const customerBody = asObject(body.customer);
  const zip = zipOf(text(customerBody, "zip"));
  const { priced } = await pricedFor(c.env.DB, business, body, zip);
  if (priced.outOfArea) fail(400, priced.warnings[0] || "That zip is outside the service area.");
  if (!priced.serviceable || priced.totalCents <= 0) fail(400, "Add at least one service to book.");
  const date = text(body, "date");
  const startMin = Number(body.startMin);
  if (!Number.isInteger(startMin)) fail(400, "Pick a time.");
  const { slots } = await openingsFor(c.env.DB, business, date, priced.durationMin);
  const opening = slots.find((slot) => slot.startMin === startMin);
  if (!opening) fail(409, "That time was just taken. Pick another open slot.");
  const name = personName(text(customerBody, "name"));
  const email = emailOf(text(customerBody, "email"));
  const phone = phoneOf(text(customerBody, "phone"), true);
  const address = text(customerBody, "address");
  if (address.length < 4 || address.length > 120) fail(400, "Enter the street address.");
  const city = personName(text(customerBody, "city"), "City");
  const state = stateOf(text(customerBody, "state") || business.state || "");
  const notes = text(customerBody, "notes").slice(0, 500);
  const now = new Date().toISOString();
  let customer: Customer | null = await findCustomerByEmail(c.env.DB, business.id, email);
  if (customer) {
    customer = { ...customer, name, email, phone, address, city, state, zip };
    await updateCustomer(c.env.DB, customer);
  } else {
    customer = {
      id: crypto.randomUUID(),
      businessId: business.id,
      name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      createdAt: now,
    };
    await insertCustomer(c.env.DB, customer);
  }
  const pay = text(body, "pay") === "full" ? "full" : "deposit";
  if (pay === "full" && !business.allowFullPayment) fail(400, "This shop collects a deposit, not the full amount online.");
  const due = pay === "full" ? priced.totalCents : depositCents(priced.totalCents, business.depositPercent);
  const startsAt = combineLocal(date, startMin);
  const endsAt = combineLocal(date, startMin + priced.durationMin);
  const job: Job = {
    id: crypto.randomUUID(),
    publicToken: randomToken(12),
    businessId: business.id,
    customerId: customer.id,
    status: "booked",
    paymentStatus: "unpaid",
    startsAt,
    endsAt,
    durationMin: priced.durationMin,
    address,
    city,
    state,
    zip,
    quote: priced,
    totalCents: priced.totalCents,
    depositDueCents: depositCents(priced.totalCents, business.depositPercent),
    paidCents: 0,
    techId: opening.techId === "owner" ? null : opening.techId,
    notes: notes || null,
    reminderSentAt: null,
    createdAt: now,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
  };
  await insertJob(c.env.DB, job);
  const checkout = await openCheckout(c, business, job, due, pay);
  await sendBookingNotice(c.env, business, job, checkout.url);
  return c.json({
    job: presentJob(job),
    payment: { id: checkout.payment.id, amountCents: due, kind: pay, provider: checkout.provider, url: checkout.url },
  });
});

app.get("/api/public/payments/:id", async (c) => {
  const payment = await paymentById(c.env.DB, c.req.param("id"));
  if (!payment) fail(404, "Payment not found.");
  const business = await businessById(c.env.DB, payment.businessId);
  const job = business ? await jobById(c.env.DB, business.id, payment.jobId) : null;
  if (!business || !job) fail(404, "Payment not found.");
  return c.json({
    payment: {
      id: payment.id,
      amountCents: payment.amountCents,
      kind: payment.kind,
      status: payment.status,
      provider: payment.provider,
      businessName: business.name,
      brandColor: business.brandColor,
      slug: business.slug,
      publicToken: job.publicToken,
      label: `${payment.kind === "balance" ? "Remaining balance" : payment.kind === "full" ? "Full payment" : "Deposit"} for ${formatUsd(payment.amountCents)}`,
    },
  });
});

app.post("/api/public/payments/:id/complete", async (c) => {
  const payment = await paymentById(c.env.DB, c.req.param("id"));
  if (!payment) fail(404, "Payment not found.");
  if (payment.provider !== "mock") fail(400, "This payment has to be completed in Stripe.");
  const applied = await applyPayment(c.env.DB, payment.id);
  if (!applied) fail(404, "Payment not found.");
  const business = await businessById(c.env.DB, applied.job.businessId);
  if (business && applied.added > 0) await sendDepositNotice(c.env, business, applied.job, applied.added);
  return c.json({
    ok: true,
    confirmationPath: business ? `/b/${business.slug}/confirmed/${applied.job.publicToken}` : "/",
    job: presentJob(applied.job),
  });
});

app.post("/api/public/checkout/confirm", async (c) => {
  const body = await readBody(c);
  const payment = await paymentById(c.env.DB, text(body, "paymentId"));
  if (!payment) fail(404, "Payment not found.");
  const business = await businessById(c.env.DB, payment.businessId);
  if (!business?.stripeAccountId) fail(400, "Stripe is not connected.");
  const secret = filled(c.env.STRIPE_SECRET_KEY);
  if (!secret) fail(400, "Stripe is not configured.");
  const session = await retrieveCheckoutSession(secret, text(body, "sessionId"), business.stripeAccountId);
  if (session.metadata?.payment_id !== payment.id) fail(400, "That checkout does not match this payment.");
  if (session.payment_status !== "paid") return c.json({ paid: false });
  const applied = await applyPayment(c.env.DB, payment.id);
  if (applied && business && applied.added > 0) await sendDepositNotice(c.env, business, applied.job, applied.added);
  return c.json({ paid: true, job: applied ? presentJob(applied.job) : null });
});

app.get("/api/public/:slug/confirmation/:token", async (c) => {
  const found = await jobByToken(c.env.DB, c.req.param("slug"), c.req.param("token"));
  if (!found) fail(404, "Booking not found.");
  return c.json({
    businessName: found.business.name,
    brandColor: found.business.brandColor,
    phone: found.business.phone,
    job: presentJob(found.job),
  });
});

app.notFound((c) => {
  if (new URL(c.req.url).pathname.startsWith("/api/")) return c.json({ error: "Not found." }, 404);
  return c.notFound();
});

export default app;
