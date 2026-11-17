CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL
);

CREATE TABLE magic_links (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  brand_color TEXT NOT NULL DEFAULT '#1f6b5a',
  tagline TEXT,
  deposit_percent INTEGER NOT NULL DEFAULT 30,
  allow_full_payment INTEGER NOT NULL DEFAULT 1,
  buffer_min INTEGER NOT NULL DEFAULT 15,
  plan TEXT NOT NULL DEFAULT 'trial',
  stripe_account_id TEXT,
  stripe_ready INTEGER NOT NULL DEFAULT 0,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE service_zips (
  business_id TEXT NOT NULL,
  zip TEXT NOT NULL,
  travel_fee_cents INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, zip)
);

CREATE TABLE business_hours (
  business_id TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  open_min INTEGER,
  close_min INTEGER,
  closed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, weekday)
);

CREATE TABLE price_books (
  business_id TEXT PRIMARY KEY,
  room_cents INTEGER NOT NULL,
  hallway_cents INTEGER NOT NULL,
  stair_flight_cents INTEGER NOT NULL,
  sqft_cents INTEGER NOT NULL,
  sofa_cents INTEGER NOT NULL,
  loveseat_cents INTEGER NOT NULL,
  chair_cents INTEGER NOT NULL,
  rug_small_cents INTEGER NOT NULL,
  rug_medium_cents INTEGER NOT NULL,
  rug_large_cents INTEGER NOT NULL,
  pet_odor_per_area_cents INTEGER NOT NULL,
  protector_per_area_cents INTEGER NOT NULL,
  deodorizer_flat_cents INTEGER NOT NULL,
  min_job_cents INTEGER NOT NULL,
  room_minutes INTEGER NOT NULL,
  hallway_minutes INTEGER NOT NULL,
  stair_flight_minutes INTEGER NOT NULL,
  sqft_block_minutes INTEGER NOT NULL,
  sofa_minutes INTEGER NOT NULL,
  loveseat_minutes INTEGER NOT NULL,
  chair_minutes INTEGER NOT NULL,
  rug_small_minutes INTEGER NOT NULL,
  rug_medium_minutes INTEGER NOT NULL,
  rug_large_minutes INTEGER NOT NULL,
  addon_buffer_minutes INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE techs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  color TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  public_token TEXT NOT NULL UNIQUE,
  business_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT NOT NULL,
  quote_json TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  deposit_due_cents INTEGER NOT NULL,
  paid_cents INTEGER NOT NULL DEFAULT 0,
  tech_id TEXT,
  notes TEXT,
  reminder_sent_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  business_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  job_id TEXT,
  channel TEXT NOT NULL,
  kind TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_jobs_business_start ON jobs (business_id, starts_at);
CREATE INDEX idx_jobs_business_status ON jobs (business_id, status);
CREATE INDEX idx_customers_business ON customers (business_id);
CREATE INDEX idx_customers_email ON customers (business_id, email);
CREATE INDEX idx_techs_business ON techs (business_id);
CREATE INDEX idx_payments_job ON payments (job_id);
CREATE INDEX idx_payments_ref ON payments (provider_ref);
CREATE INDEX idx_notifications_business ON notifications (business_id, created_at);
CREATE INDEX idx_magic_email ON magic_links (email);
