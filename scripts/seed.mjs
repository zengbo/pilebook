import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { defaultHours, defaultPriceBook } from "../src/shared/defaults.ts";
import { depositCents } from "../src/shared/money.ts";
import { hashPassword } from "../src/shared/password.ts";
import { quote } from "../src/shared/quote.ts";
import { addDays, combineLocal, localToday } from "../src/shared/time.ts";

const zones = [
  { zip: "55401", travelFeeCents: 0 },
  { zip: "55402", travelFeeCents: 0 },
  { zip: "55403", travelFeeCents: 1000 },
  { zip: "55404", travelFeeCents: 1500 },
  { zip: "55405", travelFeeCents: 2000 },
  { zip: "55406", travelFeeCents: 2500 },
];
const book = defaultPriceBook();
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const today = localToday("America/Chicago");
const tomorrow = addDays(today, 1);
const past = addDays(today, -4);
const now = new Date().toISOString();
const password = await hashPassword("demo-clean-2026");

function jobQuote(input) {
  return quote(input, book, zones);
}

const jobs = [
  {
    id: "job_priya_today",
    token: "tok_priya_today",
    customer: "cus_priya",
    input: { rooms: 2, hallways: 1, zip: "55404" },
    date: today,
    start: 9 * 60,
    tech: "tech_casey",
    status: "booked",
    pay: "deposit",
    address: "1840 Stevens Ave",
    city: "Minneapolis",
    notes: "Dog will be in the yard.",
  },
  {
    id: "job_chris_today",
    token: "tok_chris_today",
    customer: "cus_chris",
    input: { sofas: 1, chairs: 2, zip: "55401" },
    date: today,
    start: 13 * 60,
    tech: "tech_morgan",
    status: "booked",
    pay: "deposit",
    address: "250 Marquette Ave",
    city: "Minneapolis",
    notes: null,
  },
  {
    id: "job_helen_tomorrow",
    token: "tok_helen_tomorrow",
    customer: "cus_helen",
    input: { rooms: 3, stairFlights: 1, petOdor: true, protector: true, zip: "55405" },
    date: tomorrow,
    start: 10 * 60,
    tech: null,
    status: "booked",
    pay: "unpaid",
    address: "4100 Xerxes Ave S",
    city: "Minneapolis",
    notes: "Alarm code in the message.",
  },
  {
    id: "job_priya_past",
    token: "tok_priya_past",
    customer: "cus_priya",
    input: { rooms: 1, deodorizer: true, zip: "55404" },
    date: past,
    start: 9 * 60,
    tech: "tech_casey",
    status: "paid",
    pay: "full",
    address: "1840 Stevens Ave",
    city: "Minneapolis",
    notes: null,
  },
  {
    id: "job_block_casey",
    token: "tok_block_casey",
    customer: "cus_chris",
    input: { rooms: 2, zip: "55401" },
    date: tomorrow,
    start: 15 * 60,
    tech: "tech_casey",
    status: "booked",
    pay: "deposit",
    address: "250 Marquette Ave",
    city: "Minneapolis",
    notes: null,
  },
  {
    id: "job_block_morgan",
    token: "tok_block_morgan",
    customer: "cus_helen",
    input: { sofas: 1, zip: "55403" },
    date: tomorrow,
    start: 15 * 60,
    tech: "tech_morgan",
    status: "booked",
    pay: "deposit",
    address: "90 Washington Ave S",
    city: "Minneapolis",
    notes: null,
  },
];

const statements = [];
statements.push(`DELETE FROM notifications WHERE business_id = 'biz_north_loop';`);
statements.push(`DELETE FROM payments WHERE business_id = 'biz_north_loop';`);
statements.push(`DELETE FROM jobs WHERE business_id = 'biz_north_loop';`);
statements.push(`DELETE FROM customers WHERE business_id = 'biz_north_loop';`);
statements.push(`DELETE FROM techs WHERE business_id = 'biz_north_loop';`);
statements.push(`DELETE FROM business_hours WHERE business_id = 'biz_north_loop';`);
statements.push(`DELETE FROM service_zips WHERE business_id = 'biz_north_loop';`);
statements.push(`DELETE FROM price_books WHERE business_id = 'biz_north_loop';`);
statements.push(`DELETE FROM sessions WHERE user_id = 'usr_demo_north_loop';`);
statements.push(`DELETE FROM businesses WHERE id = 'biz_north_loop';`);
statements.push(`DELETE FROM users WHERE id = 'usr_demo_north_loop';`);

statements.push(
  `INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('usr_demo_north_loop', 'demo@northloop.example', 'Riley Chen', ${q(password)}, ${q(now)});`,
);
statements.push(
  `INSERT INTO businesses (
    id, owner_user_id, name, slug, phone, email, city, state, timezone, brand_color, tagline,
    deposit_percent, allow_full_payment, buffer_min, plan, stripe_account_id, stripe_ready, onboarding_complete, created_at
  ) VALUES (
    'biz_north_loop', 'usr_demo_north_loop', 'North Loop Carpet Co.', 'north-loop', '(612) 555-0144', 'hello@northloop.example',
    'Minneapolis', 'MN', 'America/Chicago', '#145e56', 'Carpet, upholstery, and area rugs across downtown Minneapolis.',
    30, 1, 15, 'trial', 'acct_mock_northloop', 1, 1, ${q(now)}
  );`,
);

for (const day of defaultHours()) {
  statements.push(
    `INSERT INTO business_hours (business_id, weekday, open_min, close_min, closed) VALUES ('biz_north_loop', ${day.weekday}, ${day.openMin}, ${day.closeMin}, ${day.closed ? 1 : 0});`,
  );
}
for (const zone of zones) {
  statements.push(
    `INSERT INTO service_zips (business_id, zip, travel_fee_cents) VALUES ('biz_north_loop', '${zone.zip}', ${zone.travelFeeCents});`,
  );
}

const priceColumns = [
  ["room_cents", book.roomCents],
  ["hallway_cents", book.hallwayCents],
  ["stair_flight_cents", book.stairFlightCents],
  ["sqft_cents", book.sqftCents],
  ["sofa_cents", book.sofaCents],
  ["loveseat_cents", book.loveseatCents],
  ["chair_cents", book.chairCents],
  ["rug_small_cents", book.rugSmallCents],
  ["rug_medium_cents", book.rugMediumCents],
  ["rug_large_cents", book.rugLargeCents],
  ["pet_odor_per_area_cents", book.petOdorPerAreaCents],
  ["protector_per_area_cents", book.protectorPerAreaCents],
  ["deodorizer_flat_cents", book.deodorizerFlatCents],
  ["min_job_cents", book.minJobCents],
  ["room_minutes", book.roomMinutes],
  ["hallway_minutes", book.hallwayMinutes],
  ["stair_flight_minutes", book.stairFlightMinutes],
  ["sqft_block_minutes", book.sqftBlockMinutes],
  ["sofa_minutes", book.sofaMinutes],
  ["loveseat_minutes", book.loveseatMinutes],
  ["chair_minutes", book.chairMinutes],
  ["rug_small_minutes", book.rugSmallMinutes],
  ["rug_medium_minutes", book.rugMediumMinutes],
  ["rug_large_minutes", book.rugLargeMinutes],
  ["addon_buffer_minutes", book.addonBufferMinutes],
];
statements.push(
  `INSERT INTO price_books (business_id, ${priceColumns.map(([column]) => column).join(", ")}) VALUES ('biz_north_loop', ${priceColumns.map(([, value]) => value).join(", ")});`,
);
statements.push(
  `INSERT INTO techs (id, business_id, name, email, phone, color, active) VALUES ('tech_casey', 'biz_north_loop', 'Casey Brooks', 'casey@northloop.example', '(612) 555-0160', '#b56b2f', 1);`,
);
statements.push(
  `INSERT INTO techs (id, business_id, name, email, phone, color, active) VALUES ('tech_morgan', 'biz_north_loop', 'Morgan Diaz', 'morgan@northloop.example', '(612) 555-0161', '#1d4e89', 1);`,
);
statements.push(
  `INSERT INTO customers (id, business_id, name, email, phone, address, city, state, zip, created_at) VALUES ('cus_priya', 'biz_north_loop', 'Priya Shah', 'priya@example.com', '(612) 555-0172', '1840 Stevens Ave', 'Minneapolis', 'MN', '55404', ${q(now)});`,
);
statements.push(
  `INSERT INTO customers (id, business_id, name, email, phone, address, city, state, zip, created_at) VALUES ('cus_chris', 'biz_north_loop', 'Chris Alvarez', 'chris@example.com', '(612) 555-0190', '250 Marquette Ave', 'Minneapolis', 'MN', '55401', ${q(now)});`,
);
statements.push(
  `INSERT INTO customers (id, business_id, name, email, phone, address, city, state, zip, created_at) VALUES ('cus_helen', 'biz_north_loop', 'Helen Brooks', 'helen@example.com', '(612) 555-0118', '4100 Xerxes Ave S', 'Minneapolis', 'MN', '55405', ${q(now)});`,
);

for (const item of jobs) {
  const priced = jobQuote(item.input);
  const deposit = depositCents(priced.totalCents, 30);
  const paid = item.pay === "full" ? priced.totalCents : item.pay === "deposit" ? deposit : 0;
  const paymentStatus = paid >= priced.totalCents ? "paid" : paid > 0 ? "deposit_paid" : "unpaid";
  const starts = combineLocal(item.date, item.start);
  const ends = combineLocal(item.date, item.start + priced.durationMin);
  statements.push(
    `INSERT INTO jobs (
      id, public_token, business_id, customer_id, status, payment_status, starts_at, ends_at, duration_min,
      address, city, state, zip, quote_json, total_cents, deposit_due_cents, paid_cents, tech_id, notes, reminder_sent_at, created_at
    ) VALUES (
      ${q(item.id)}, ${q(item.token)}, 'biz_north_loop', ${q(item.customer)}, ${q(item.status)}, ${q(paymentStatus)},
      ${q(starts)}, ${q(ends)}, ${priced.durationMin}, ${q(item.address)}, ${q(item.city)}, 'MN', ${q(item.input.zip)},
      ${q(JSON.stringify(priced))}, ${priced.totalCents}, ${deposit}, ${paid}, ${item.tech ? q(item.tech) : "NULL"},
      ${item.notes ? q(item.notes) : "NULL"}, NULL, ${q(item.date === past ? `${past}T15:00:00.000Z` : now)}
    );`,
  );
  if (paid > 0) {
    statements.push(
      `INSERT INTO payments (id, job_id, business_id, amount_cents, kind, status, provider, provider_ref, created_at) VALUES (
        ${q(`pay_${item.id}`)}, ${q(item.id)}, 'biz_north_loop', ${paid}, ${q(item.pay === "full" ? "full" : "deposit")}, 'paid', 'mock', NULL, ${q(item.date === past ? `${past}T16:00:00.000Z` : now)}
      );`,
    );
  }
}

statements.push(
  `INSERT INTO notifications (id, business_id, job_id, channel, kind, to_address, subject, body, status, created_at) VALUES (
    'note_priya_today', 'biz_north_loop', 'job_priya_today', 'email', 'confirmation', 'priya@example.com',
    'You''re on the schedule with North Loop Carpet Co.',
    'Hi Priya Shah,\n\nNorth Loop Carpet Co. has your carpet cleaning on the books.',
    'logged', ${q(now)}
  );`,
);

const file = "/tmp/pilebook-seed.sql";
writeFileSync(file, statements.join("\n"));
execSync(`npx wrangler d1 execute pilebook --local --file=${file}`, { stdio: "inherit" });
console.log(`Seeded North Loop Carpet Co. for ${today}. Login demo@northloop.example / demo-clean-2026`);
