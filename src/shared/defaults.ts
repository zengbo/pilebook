import type { PriceBook } from "./quote";

export const TECH_COLORS = ["#b56b2f", "#1d4e89", "#1f6b5a", "#8d4034", "#3f5c46", "#6b4c9a"];

export const US_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export const SLOT_STEP_MIN = 30;
export const LEAD_TIME_MIN = 120;
export const BOOKING_HORIZON_DAYS = 45;

export function defaultPriceBook(): PriceBook {
  return {
    roomCents: 6900,
    hallwayCents: 3900,
    stairFlightCents: 4900,
    sqftCents: 45,
    sofaCents: 12900,
    loveseatCents: 8900,
    chairCents: 4500,
    rugSmallCents: 5900,
    rugMediumCents: 9900,
    rugLargeCents: 14900,
    petOdorPerAreaCents: 3500,
    protectorPerAreaCents: 2500,
    deodorizerFlatCents: 2900,
    minJobCents: 14900,
    roomMinutes: 35,
    hallwayMinutes: 15,
    stairFlightMinutes: 25,
    sqftBlockMinutes: 20,
    sofaMinutes: 30,
    loveseatMinutes: 25,
    chairMinutes: 15,
    rugSmallMinutes: 20,
    rugMediumMinutes: 30,
    rugLargeMinutes: 40,
    addonBufferMinutes: 10,
  };
}

export type HoursDay = {
  weekday: number;
  closed: boolean;
  openMin: number;
  closeMin: number;
};

export function defaultHours(): HoursDay[] {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    if (weekday === 0) return { weekday, closed: true, openMin: 480, closeMin: 1020 };
    if (weekday === 6) return { weekday, closed: false, openMin: 540, closeMin: 840 };
    return { weekday, closed: false, openMin: 480, closeMin: 1020 };
  });
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
