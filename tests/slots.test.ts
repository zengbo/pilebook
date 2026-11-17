import { describe, expect, it } from "vitest";
import { availableSlots, type BusyJob } from "../src/shared/slots";

const techs = ["casey", "morgan"];

function slots(overrides: Partial<Parameters<typeof availableSlots>[0]> = {}) {
  return availableSlots({
    openMin: 8 * 60,
    closeMin: 17 * 60,
    durationMin: 60,
    stepMin: 30,
    bufferMin: 15,
    techIds: techs,
    busy: [],
    earliestStartMin: 0,
    ...overrides,
  });
}

function starts(busy: BusyJob[] = [], extra: Partial<Parameters<typeof availableSlots>[0]> = {}) {
  return slots({ busy, ...extra }).map((slot) => slot.startMin);
}

describe("slot availability", () => {
  it("returns nothing on a closed day", () => {
    expect(slots({ openMin: null, closeMin: null })).toEqual([]);
  });

  it("stops the last slot when the job would run past close", () => {
    const open = starts();
    expect(open[0]).toBe(8 * 60);
    expect(open.at(-1)).toBe(16 * 60);
    expect(open).not.toContain(16 * 60 + 30);
  });

  it("blocks a single tech and still offers the other", () => {
    const busy: BusyJob[] = [{ startMin: 9 * 60, endMin: 11 * 60, techId: "casey" }];
    const openings = slots({ busy, techIds: techs }).filter((slot) => slot.startMin === 9 * 60);
    expect(openings).toEqual([{ startMin: 9 * 60, techId: "morgan" }]);
  });

  it("hides a slot when every tech is busy", () => {
    const busy: BusyJob[] = [
      { startMin: 9 * 60, endMin: 11 * 60, techId: "casey" },
      { startMin: 9 * 60, endMin: 11 * 60, techId: "morgan" },
    ];
    expect(starts(busy)).not.toContain(9 * 60);
    expect(starts(busy)).not.toContain(11 * 60);
    expect(starts(busy)).toContain(11 * 60 + 30);
  });

  it("keeps a buffer between jobs and snaps to the 30 minute grid", () => {
    const busy: BusyJob[] = [{ startMin: 9 * 60, endMin: 10 * 60, techId: "casey" }];
    const oneTech = starts(busy, { techIds: ["casey"] });
    expect(oneTech).not.toContain(10 * 60);
    expect(oneTech).toContain(10 * 60 + 30);

    const late: BusyJob[] = [{ startMin: 9 * 60, endMin: 10 * 60 + 20, techId: "casey" }];
    const afterLate = starts(late, { techIds: ["casey"] });
    expect(afterLate).not.toContain(10 * 60 + 30);
    expect(afterLate).toContain(11 * 60);
  });

  it("treats an unassigned job as using one tech of capacity", () => {
    const busy: BusyJob[] = [{ startMin: 13 * 60, endMin: 15 * 60, techId: null }];
    const atOne = slots({ busy }).find((slot) => slot.startMin === 13 * 60);
    expect(atOne?.techId).toBe("casey");
    const bothTaken: BusyJob[] = [
      { startMin: 13 * 60, endMin: 15 * 60, techId: null },
      { startMin: 13 * 60, endMin: 14 * 60, techId: "morgan" },
    ];
    expect(starts(bothTaken)).not.toContain(13 * 60);
  });

  it("respects lead time and aligns to the step", () => {
    const open = starts([], { earliestStartMin: 8 * 60 + 10 });
    expect(open[0]).toBe(8 * 60 + 30);
  });

  it("returns nothing when the job has no duration or no crew", () => {
    expect(slots({ durationMin: 0 })).toEqual([]);
    expect(slots({ techIds: [] })).toEqual([]);
  });

  it("allows a job that ends exactly at close", () => {
    expect(starts([], { durationMin: 120 })).toContain(15 * 60);
    expect(starts([], { durationMin: 120 })).not.toContain(15 * 60 + 30);
  });
});
