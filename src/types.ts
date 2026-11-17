import type { HoursDay } from "./shared/defaults";
import type { PriceBook, Quote, TravelZone } from "./shared/quote";

export type { HoursDay, PriceBook, Quote, TravelZone };

export type Tech = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  color: string;
  active: boolean;
};

export type Business = {
  id: string;
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
  paymentsMode: "mock" | "stripe";
  hours: HoursDay[];
  zips: TravelZone[];
  priceBook: PriceBook | null;
  plan?: string;
  stripeReady?: boolean;
  stripeAccountId?: string | null;
  onboardingComplete?: boolean;
  techs?: Tech[];
};

export type User = { id: string; email: string; name: string };

export type Job = {
  id: string;
  publicToken: string;
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
  balanceCents: number;
  techId: string | null;
  techName: string | null;
  techColor: string | null;
  notes: string | null;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  jobCount?: number;
  lifetimeCents?: number;
  lastStartsAt?: string | null;
};

export type Notice = {
  id: string;
  channel: string;
  kind: string;
  toAddress: string;
  subject: string | null;
  body: string;
  status: string;
  createdAt: string;
  jobId: string | null;
};

export type Selection = {
  rooms: number;
  hallways: number;
  stairFlights: number;
  openSqft: number;
  sofas: number;
  loveseats: number;
  chairs: number;
  rugsSmall: number;
  rugsMedium: number;
  rugsLarge: number;
  petOdor: boolean;
  protector: boolean;
  deodorizer: boolean;
  zip: string;
};
