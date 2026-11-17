import { describe, expect, it } from "vitest";
import { defaultPriceBook } from "../src/shared/defaults";
import { depositCents } from "../src/shared/money";
import { quote } from "../src/shared/quote";

const book = defaultPriceBook();
const zones = [
  { zip: "55401", travelFeeCents: 0 },
  { zip: "55404", travelFeeCents: 1500 },
];

describe("quote calculator", () => {
  it("applies the minimum job price and adds travel on top", () => {
    const result = quote({ rooms: 1, zip: "55404" }, book, zones);
    expect(result.minimumAppliedCents).toBe(book.minJobCents - book.roomCents);
    expect(result.serviceCents).toBe(book.minJobCents);
    expect(result.travelFeeCents).toBe(1500);
    expect(result.totalCents).toBe(book.minJobCents + 1500);
    expect(result.lines.map((line) => line.key)).toEqual(["rooms", "minimum", "travel"]);
    expect(result.serviceable).toBe(true);
  });

  it("skips the minimum once the service subtotal clears it", () => {
    const result = quote({ rooms: 3 }, book, zones);
    expect(result.serviceCents).toBe(book.roomCents * 3);
    expect(result.minimumAppliedCents).toBe(0);
    expect(result.lines.some((line) => line.key === "minimum")).toBe(false);
  });

  it("does not invent a minimum for an empty selection", () => {
    const result = quote({}, book, zones);
    expect(result.totalCents).toBe(0);
    expect(result.durationMin).toBe(0);
    expect(result.serviceable).toBe(false);
    expect(result.lines).toHaveLength(0);
  });

  it("prices pet odor per carpeted area and protector the same way", () => {
    const result = quote({ rooms: 2, stairFlights: 1, petOdor: true, protector: true }, book, zones);
    const pet = result.lines.find((line) => line.key === "pet");
    const protector = result.lines.find((line) => line.key === "protector");
    expect(pet?.qty).toBe(3);
    expect(pet?.totalCents).toBe(3 * book.petOdorPerAreaCents);
    expect(protector?.qty).toBe(3);
  });

  it("prices pet odor on upholstery when there is no carpet", () => {
    const result = quote({ sofas: 1, chairs: 2, petOdor: true }, book, zones);
    expect(result.lines.find((line) => line.key === "pet")?.qty).toBe(3);
  });

  it("warns instead of charging protector when nothing is carpeted", () => {
    const result = quote({ sofas: 1, protector: true }, book, zones);
    expect(result.lines.some((line) => line.key === "protector")).toBe(false);
    expect(result.warnings.some((warning) => warning.includes("Stain protector"))).toBe(true);
  });

  it("charges deodorizer once and open area by the square foot", () => {
    const result = quote({ openSqft: 250, deodorizer: true, zip: "55401" }, book, zones);
    expect(result.lines.find((line) => line.key === "sqft")?.totalCents).toBe(250 * book.sqftCents);
    expect(result.lines.find((line) => line.key === "deodorizer")?.totalCents).toBe(book.deodorizerFlatCents);
    expect(result.travelFeeCents).toBe(0);
    expect(result.durationMin).toBe(Math.ceil(250 / 100) * book.sqftBlockMinutes + book.addonBufferMinutes);
  });

  it("blocks zips outside the service area", () => {
    const result = quote({ rooms: 2, zip: "10001" }, book, zones);
    expect(result.outOfArea).toBe(true);
    expect(result.serviceable).toBe(false);
    expect(result.travelFeeCents).toBe(0);
    expect(result.lines.some((line) => line.key === "travel")).toBe(false);
  });

  it("clamps negative and fractional quantities", () => {
    const result = quote({ rooms: -3, hallways: 1.9, sofas: Number.NaN }, book, zones);
    expect(result.normalized.rooms).toBe(0);
    expect(result.normalized.hallways).toBe(1);
    expect(result.normalized.sofas).toBe(0);
  });

  it("rounds a deposit without exceeding the job total", () => {
    expect(depositCents(17400, 30)).toBe(5220);
    expect(depositCents(100, 100)).toBe(100);
    expect(depositCents(0, 30)).toBe(0);
  });
});
