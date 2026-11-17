import { US_TIMEZONES, type HoursDay } from "../src/shared/defaults";
import type { PriceBook, QuoteRequest } from "../src/shared/quote";
import { fail } from "./errors";

export function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(400, "Expected an object.");
  return value as Record<string, unknown>;
}

export function text(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export function emailOf(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) fail(400, "Enter a valid email.");
  return email;
}

export function personName(value: string, label = "Name"): string {
  if (value.length < 2 || value.length > 80) fail(400, `${label} should be 2–80 characters.`);
  return value;
}

export function phoneOf(value: string, required: boolean): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits && !required) return null;
  if (digits.length < 10 || digits.length > 15) fail(400, "Enter a phone number with at least 10 digits.");
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : value.trim();
}

export function zipOf(value: string): string {
  if (!/^\d{5}$/.test(value)) fail(400, "Use a 5-digit US zip code.");
  return value;
}

export function stateOf(value: string): string {
  const state = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) fail(400, "Use a 2-letter state code.");
  return state;
}

export function slugOf(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(400, "Use a short link made of letters, numbers, and dashes.");
  return slug;
}

export function colorOf(value: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) fail(400, "Brand color should be a hex code like #1f6b5a.");
  return value.toLowerCase();
}

export function timezoneOf(value: string): string {
  if (!(US_TIMEZONES as readonly string[]).includes(value)) fail(400, "Pick a US timezone.");
  return value;
}

export function moneyField(value: unknown, label: string, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) fail(400, `${label} must be a whole number of cents from 0 to ${max}.`);
  return n;
}

export function minuteField(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 480) fail(400, `${label} must be between 0 and 480 minutes.`);
  return n;
}

export function quoteRequestFrom(body: Record<string, unknown>, zip: string): QuoteRequest {
  return {
    rooms: Number(body.rooms ?? 0),
    hallways: Number(body.hallways ?? 0),
    stairFlights: Number(body.stairFlights ?? 0),
    openSqft: Number(body.openSqft ?? 0),
    sofas: Number(body.sofas ?? 0),
    loveseats: Number(body.loveseats ?? 0),
    chairs: Number(body.chairs ?? 0),
    rugsSmall: Number(body.rugsSmall ?? 0),
    rugsMedium: Number(body.rugsMedium ?? 0),
    rugsLarge: Number(body.rugsLarge ?? 0),
    petOdor: body.petOdor === true,
    protector: body.protector === true,
    deodorizer: body.deodorizer === true,
    zip,
  };
}

export function hoursFrom(value: unknown): HoursDay[] {
  if (!Array.isArray(value) || value.length !== 7) fail(400, "Include all seven days.");
  const days = value.map((entry) => {
    const row = asObject(entry);
    const weekday = Number(row.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) fail(400, "Weekday must be 0–6.");
    const closed = row.closed === true;
    const openMin = Number(row.openMin);
    const closeMin = Number(row.closeMin);
    if (!Number.isInteger(openMin) || !Number.isInteger(closeMin) || openMin < 0 || closeMin > 24 * 60) {
      fail(400, "Hours must be minutes from midnight.");
    }
    if (!closed && openMin >= closeMin) fail(400, "Closing time has to be after opening time.");
    return { weekday, closed, openMin, closeMin };
  });
  const seen = new Set(days.map((day) => day.weekday));
  if (seen.size !== 7) fail(400, "Include each weekday once.");
  if (days.every((day) => day.closed)) fail(400, "Stay open at least one day.");
  return days.sort((a, b) => a.weekday - b.weekday);
}

export function zonesFrom(value: unknown): Array<{ zip: string; travelFeeCents: number }> {
  if (!Array.isArray(value) || value.length === 0) fail(400, "Add at least one zip code.");
  if (value.length > 80) fail(400, "80 zip codes is the limit for now.");
  const zones = value.map((entry) => {
    const row = asObject(entry);
    return { zip: zipOf(text(row, "zip")), travelFeeCents: moneyField(row.travelFeeCents ?? 0, "Travel fee", 50000) };
  });
  const unique = new Set(zones.map((zone) => zone.zip));
  if (unique.size !== zones.length) fail(400, "Each zip code should appear once.");
  return zones;
}

export function priceBookFrom(body: Record<string, unknown>): PriceBook {
  return {
    roomCents: moneyField(body.roomCents, "Room price", 200000),
    hallwayCents: moneyField(body.hallwayCents, "Hallway price", 200000),
    stairFlightCents: moneyField(body.stairFlightCents, "Stair price", 200000),
    sqftCents: moneyField(body.sqftCents, "Square-foot price", 1000),
    sofaCents: moneyField(body.sofaCents, "Sofa price", 200000),
    loveseatCents: moneyField(body.loveseatCents, "Loveseat price", 200000),
    chairCents: moneyField(body.chairCents, "Chair price", 200000),
    rugSmallCents: moneyField(body.rugSmallCents, "Small rug price", 200000),
    rugMediumCents: moneyField(body.rugMediumCents, "Medium rug price", 200000),
    rugLargeCents: moneyField(body.rugLargeCents, "Large rug price", 200000),
    petOdorPerAreaCents: moneyField(body.petOdorPerAreaCents, "Pet odor price", 100000),
    protectorPerAreaCents: moneyField(body.protectorPerAreaCents, "Protector price", 100000),
    deodorizerFlatCents: moneyField(body.deodorizerFlatCents, "Deodorizer price", 100000),
    minJobCents: moneyField(body.minJobCents, "Minimum job", 500000),
    roomMinutes: minuteField(body.roomMinutes, "Room time"),
    hallwayMinutes: minuteField(body.hallwayMinutes, "Hallway time"),
    stairFlightMinutes: minuteField(body.stairFlightMinutes, "Stair time"),
    sqftBlockMinutes: minuteField(body.sqftBlockMinutes, "Open-area time"),
    sofaMinutes: minuteField(body.sofaMinutes, "Sofa time"),
    loveseatMinutes: minuteField(body.loveseatMinutes, "Loveseat time"),
    chairMinutes: minuteField(body.chairMinutes, "Chair time"),
    rugSmallMinutes: minuteField(body.rugSmallMinutes, "Small rug time"),
    rugMediumMinutes: minuteField(body.rugMediumMinutes, "Medium rug time"),
    rugLargeMinutes: minuteField(body.rugLargeMinutes, "Large rug time"),
    addonBufferMinutes: minuteField(body.addonBufferMinutes, "Add-on time"),
  };
}
