# Pilebook

Booking, quoting, scheduling, and deposits for US carpet-cleaning businesses with 1–10 techs. One back office for the owner, one public page for the customer.

Pilebook runs on Cloudflare Workers with [D1](https://developers.cloudflare.com/d1/) (SQLite). The UI is React, served as static assets from the same Worker. Money is meant to settle on the cleaning company’s own Stripe Connect account. This MVP does not charge shops for the software.

## What you can click through

- Marketing site for the product, with the intended $49 / $99 / $199 plans (billing is a stub).
- Owner sign-up with email and password, or a magic link.
- Onboarding: business name, zip codes and travel fees, hours, techs.
- Carpet price book: rooms, hallways, stairs, square feet, upholstery, rugs, add-ons, minimum job, deposit percent.
- Public booking page at `/b/<slug>` with an instant quote, open slots, and a deposit or full payment.
- Embeddable snippet for the shop’s existing website.
- Owner calendar (day and week), tech assignment, job statuses, customers, balance collection, and a revenue summary.
- Email confirmation and a 24-hour reminder. The dev provider prints mail to the log and the Messages screen. SMS is behind an interface and is never sent.

A demo shop is seeded so the whole path works without signing up:

| | |
| --- | --- |
| Owner | `demo@northloop.example` |
| Password | `demo-clean-2026` |
| Booking page | `/b/north-loop` |

## Local development

Node 22+.

```bash
npm install
npm run setup    # local D1 migrations + demo shop
npm run dev      # http://127.0.0.1:4471
```

`npm run setup` writes `.dev.vars` if you don’t have one. That file turns on the dev magic-link preview and leaves Stripe blank, so checkout is simulated. The card form never sends the number to the server.

```bash
npm test         # quote calculator and slot availability
npm run typecheck
```

### Environment

Copy `.dev.vars.example` to `.dev.vars` for local overrides. Wrangler reads it instead of the committed `vars` when you run `npm run dev`.

| Name | Purpose |
| --- | --- |
| `EMAIL_PROVIDER` | `console` (default) logs email. `resend` sends through Resend when `RESEND_API_KEY` is set. |
| `RESEND_API_KEY` | Optional. Secret. |
| `RESEND_FROM` | From address, for example `Pilebook <bookings@yourdomain.com>`. |
| `DEV_EXPOSE_MAGIC_LINK` | `1` returns the magic link in the API response and opens `POST /api/dev/reminders`. Set this to `0` on any public deploy. |
| `APP_ORIGIN` | Used in links generated outside a request, including reminder cron. Example: `https://pilebook.example.com`. |
| `STRIPE_SECRET_KEY` | Optional test secret (`sk_test_...`). Without it, payments are simulated. |
| `STRIPE_WEBHOOK_SECRET` | Optional. Verifies `POST /api/stripe/webhook`. |

Do not put live keys in the repo. For a deployed Worker, set secrets with `wrangler secret put` rather than `vars`.

Stripe, when configured, uses Connect Express. Checkout is a direct charge on the connected account (`Stripe-Account`), so the customer’s card payment goes to the cleaning business. There is no platform fee in this MVP.

### Reminders

A cron trigger runs at minute 15 of every hour and emails customers whose job starts 23–25 hours later. Locally:

```bash
# requires DEV_EXPOSE_MAGIC_LINK=1
curl -X POST http://127.0.0.1:4471/api/dev/reminders
```

## Deploy

The `database_id` in `wrangler.jsonc` is a local placeholder. Create a real database before the first deploy and paste its id into the config.

```bash
npx wrangler d1 create pilebook
# put the returned database_id into wrangler.jsonc
npx wrangler d1 migrations apply pilebook --remote
npm run deploy
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put RESEND_API_KEY
```

Set `DEV_EXPOSE_MAGIC_LINK` to `0` and `APP_ORIGIN` to the public URL in `wrangler.jsonc` before you deploy. Point a Stripe test webhook at `https://<your-worker>/api/stripe/webhook` for `checkout.session.completed`.

Seed data is local-only. Don’t run `scripts/seed.mjs` against production.

## Tests

`npm test` covers the quote calculator (minimum job, travel on top of the minimum, per-area add-ons, out-of-area zips) and slot availability (closed days, crew capacity, buffers, lead time).

## Before charging real customers

- Turn on subscription billing for the $49 / $99 / $199 plans and enforce the tech limits.
- Stripe live mode, Connect onboarding review, and a real webhook secret. Refunds are manual today.
- A verified sending domain (Resend or [Cloudflare Email Service](https://developers.cloudflare.com/email-service/)).
- SMS only after US 10DLC registration. The `SmsProvider` in `worker/mailer.ts` is the seam; it currently records a skipped message.
- Set `DEV_EXPOSE_MAGIC_LINK` to `0`.
- Staff logins for techs, password reset beyond the magic link, and cancellation rules.
- Sales tax, if you need it. Card data stays on Stripe Checkout when keys are present; the demo form is not a card processor.
- Custom domains per shop (today the public page is `/b/<slug>`; [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/) is the path for `book.theirshop.com`).
- Turnstile on the public booking form, D1 backups, and a stricter lock around double-booking than the current read-then-insert.
- Terms, privacy, and a written cancellation policy.
