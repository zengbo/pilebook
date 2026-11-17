import { safeEqual } from "../src/shared/password";

export type CheckoutInput = {
  secretKey: string;
  stripeAccountId: string;
  amountCents: number;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  paymentId: string;
  jobId: string;
};

function filled(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function stripeReady(env: Env, accountId: string | null, ready: boolean): boolean {
  return Boolean(filled(env.STRIPE_SECRET_KEY) && accountId && !accountId.startsWith("acct_mock") && ready);
}

async function stripeRequest<T>(secret: string, path: string, body: URLSearchParams | null, accountId?: string, method = "POST"): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${secret}` };
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (accountId) headers["Stripe-Account"] = accountId;
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers,
    body: body ? body.toString() : undefined,
  });
  const payload = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe returned ${response.status}`);
  }
  return payload;
}

export async function createExpressAccount(secret: string, email: string): Promise<string> {
  const params = new URLSearchParams({
    type: "express",
    country: "US",
    email,
    "capabilities[card_payments][requested]": "true",
    "capabilities[transfers][requested]": "true",
    business_type: "individual",
  });
  const account = await stripeRequest<{ id: string }>(secret, "accounts", params);
  return account.id;
}

export async function createAccountLink(secret: string, accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
  const params = new URLSearchParams({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  const link = await stripeRequest<{ url: string }>(secret, "account_links", params);
  return link.url;
}

export async function accountChargesEnabled(secret: string, accountId: string): Promise<boolean> {
  const account = await stripeRequest<{ charges_enabled?: boolean }>(secret, `accounts/${accountId}`, null, undefined, "GET");
  return Boolean(account.charges_enabled);
}

export async function createCheckoutSession(input: CheckoutInput): Promise<{ id: string; url: string }> {
  const params = new URLSearchParams({
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.paymentId,
    "metadata[payment_id]": input.paymentId,
    "metadata[job_id]": input.jobId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": input.productName,
  });
  return stripeRequest<{ id: string; url: string }>(input.secretKey, "checkout/sessions", params, input.stripeAccountId);
}

export async function retrieveCheckoutSession(
  secret: string,
  sessionId: string,
  accountId: string,
): Promise<{ id: string; payment_status: string; metadata?: { payment_id?: string } }> {
  return stripeRequest(secret, `checkout/sessions/${sessionId}`, null, accountId, "GET");
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeSignature(secret: string, payload: string, header: string | undefined): Promise<boolean> {
  if (!header) return false;
  const timestamp = header
    .split(",")
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  if (!timestamp) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = hex(new Uint8Array(mac));
  return header
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .some((part) => safeEqual(part.slice(3), expected));
}
