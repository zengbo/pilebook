export type PriceBook = {
  roomCents: number;
  hallwayCents: number;
  stairFlightCents: number;
  sqftCents: number;
  sofaCents: number;
  loveseatCents: number;
  chairCents: number;
  rugSmallCents: number;
  rugMediumCents: number;
  rugLargeCents: number;
  petOdorPerAreaCents: number;
  protectorPerAreaCents: number;
  deodorizerFlatCents: number;
  minJobCents: number;
  roomMinutes: number;
  hallwayMinutes: number;
  stairFlightMinutes: number;
  sqftBlockMinutes: number;
  sofaMinutes: number;
  loveseatMinutes: number;
  chairMinutes: number;
  rugSmallMinutes: number;
  rugMediumMinutes: number;
  rugLargeMinutes: number;
  addonBufferMinutes: number;
};

export type QuoteRequest = {
  rooms?: number;
  hallways?: number;
  stairFlights?: number;
  openSqft?: number;
  sofas?: number;
  loveseats?: number;
  chairs?: number;
  rugsSmall?: number;
  rugsMedium?: number;
  rugsLarge?: number;
  petOdor?: boolean;
  protector?: boolean;
  deodorizer?: boolean;
  zip?: string;
};

export type QuoteLine = {
  key: string;
  label: string;
  qty: number;
  unitCents: number;
  totalCents: number;
};

export type TravelZone = {
  zip: string;
  travelFeeCents: number;
};

export type Quote = {
  lines: QuoteLine[];
  serviceCents: number;
  travelFeeCents: number;
  totalCents: number;
  minimumAppliedCents: number;
  durationMin: number;
  serviceable: boolean;
  outOfArea: boolean;
  warnings: string[];
  normalized: Required<Omit<QuoteRequest, "zip">> & { zip: string };
};

function qty(value: unknown, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.floor(n)));
}

function flag(value: unknown): boolean {
  return value === true || value === 1 || value === "true";
}

function line(key: string, label: string, count: number, unitCents: number): QuoteLine | null {
  if (count <= 0 || unitCents < 0) return null;
  return { key, label, qty: count, unitCents, totalCents: count * unitCents };
}

export function quote(input: QuoteRequest | null | undefined, book: PriceBook, zones: TravelZone[]): Quote {
  const src = input ?? {};
  const normalized = {
    rooms: qty(src.rooms, 40),
    hallways: qty(src.hallways, 20),
    stairFlights: qty(src.stairFlights, 20),
    openSqft: qty(src.openSqft, 20000),
    sofas: qty(src.sofas, 15),
    loveseats: qty(src.loveseats, 15),
    chairs: qty(src.chairs, 30),
    rugsSmall: qty(src.rugsSmall, 20),
    rugsMedium: qty(src.rugsMedium, 20),
    rugsLarge: qty(src.rugsLarge, 20),
    petOdor: flag(src.petOdor),
    protector: flag(src.protector),
    deodorizer: flag(src.deodorizer),
    zip: String(src.zip ?? "").trim(),
  };

  const lines: QuoteLine[] = [];
  const push = (entry: QuoteLine | null) => {
    if (entry && entry.totalCents > 0) lines.push(entry);
  };

  push(line("rooms", "Room", normalized.rooms, book.roomCents));
  push(line("hallways", "Hallway", normalized.hallways, book.hallwayCents));
  push(line("stairs", "Stair flight", normalized.stairFlights, book.stairFlightCents));
  push(line("sqft", "Open area (sq ft)", normalized.openSqft, book.sqftCents));
  push(line("sofas", "Sofa", normalized.sofas, book.sofaCents));
  push(line("loveseats", "Loveseat", normalized.loveseats, book.loveseatCents));
  push(line("chairs", "Chair", normalized.chairs, book.chairCents));
  push(line("rugsSmall", "Small area rug", normalized.rugsSmall, book.rugSmallCents));
  push(line("rugsMedium", "Medium area rug", normalized.rugsMedium, book.rugMediumCents));
  push(line("rugsLarge", "Large area rug", normalized.rugsLarge, book.rugLargeCents));

  const carpetAreas =
    normalized.rooms +
    normalized.hallways +
    normalized.stairFlights +
    normalized.rugsSmall +
    normalized.rugsMedium +
    normalized.rugsLarge;
  const upholsteryPieces = normalized.sofas + normalized.loveseats + normalized.chairs;
  const petAreas = carpetAreas > 0 ? carpetAreas : upholsteryPieces;
  const warnings: string[] = [];

  if (normalized.petOdor && petAreas > 0) {
    push(line("pet", "Pet odor treatment", petAreas, book.petOdorPerAreaCents));
  }
  if (normalized.protector && carpetAreas > 0) {
    push(line("protector", "Stain protector", carpetAreas, book.protectorPerAreaCents));
  } else if (normalized.protector) {
    warnings.push("Stain protector is priced per carpeted area. Add a room, hallway, stairs, or rug.");
  }
  if (normalized.deodorizer) {
    push(line("deodorizer", "Deodorizer", 1, book.deodorizerFlatCents));
  }

  let serviceCents = lines.reduce((sum, item) => sum + item.totalCents, 0);
  const hasService = lines.length > 0;
  let minimumAppliedCents = 0;
  if (hasService && serviceCents < book.minJobCents) {
    minimumAppliedCents = book.minJobCents - serviceCents;
    lines.push({
      key: "minimum",
      label: "Minimum job adjustment",
      qty: 1,
      unitCents: minimumAppliedCents,
      totalCents: minimumAppliedCents,
    });
    serviceCents += minimumAppliedCents;
  }

  let travelFeeCents = 0;
  let outOfArea = false;
  if (normalized.zip) {
    const zone = zones.find((item) => item.zip === normalized.zip);
    if (!zone) {
      outOfArea = true;
      warnings.push(`We don't travel to ${normalized.zip} yet.`);
    } else if (zone.travelFeeCents > 0 && hasService) {
      travelFeeCents = zone.travelFeeCents;
      lines.push({
        key: "travel",
        label: `Travel fee (${normalized.zip})`,
        qty: 1,
        unitCents: travelFeeCents,
        totalCents: travelFeeCents,
      });
    }
  }

  let durationMin = 0;
  if (hasService) {
    durationMin += normalized.rooms * book.roomMinutes;
    durationMin += normalized.hallways * book.hallwayMinutes;
    durationMin += normalized.stairFlights * book.stairFlightMinutes;
    if (normalized.openSqft > 0) {
      durationMin += Math.ceil(normalized.openSqft / 100) * book.sqftBlockMinutes;
    }
    durationMin += normalized.sofas * book.sofaMinutes;
    durationMin += normalized.loveseats * book.loveseatMinutes;
    durationMin += normalized.chairs * book.chairMinutes;
    durationMin += normalized.rugsSmall * book.rugSmallMinutes;
    durationMin += normalized.rugsMedium * book.rugMediumMinutes;
    durationMin += normalized.rugsLarge * book.rugLargeMinutes;
    if (normalized.petOdor || normalized.protector || normalized.deodorizer) {
      durationMin += book.addonBufferMinutes;
    }
    if (durationMin < 30) durationMin = 30;
  }

  return {
    lines,
    serviceCents,
    travelFeeCents,
    totalCents: serviceCents + travelFeeCents,
    minimumAppliedCents,
    durationMin,
    serviceable: hasService && !outOfArea,
    outOfArea,
    warnings,
    normalized,
  };
}
