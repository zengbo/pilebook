export type BusyJob = {
  startMin: number;
  endMin: number;
  techId: string | null;
};

export type SlotOpening = {
  startMin: number;
  techId: string;
};

export type SlotQuery = {
  openMin: number | null;
  closeMin: number | null;
  durationMin: number;
  stepMin: number;
  bufferMin: number;
  techIds: string[];
  busy: BusyJob[];
  earliestStartMin: number;
};

function overlaps(start: number, end: number, job: BusyJob, bufferMin: number): boolean {
  return start < job.endMin + bufferMin && job.startMin < end + bufferMin;
}

export function availableSlots(input: SlotQuery): SlotOpening[] {
  const { openMin, closeMin, durationMin, stepMin, bufferMin, techIds, busy, earliestStartMin } = input;
  if (openMin == null || closeMin == null) return [];
  if (durationMin <= 0 || stepMin <= 0) return [];
  if (techIds.length === 0) return [];
  if (closeMin <= openMin) return [];

  const first = Math.max(openMin, earliestStartMin);
  if (first > closeMin) return [];
  const aligned = openMin + Math.ceil((first - openMin) / stepMin) * stepMin;
  const openings: SlotOpening[] = [];

  for (let start = aligned; start + durationMin <= closeMin; start += stepMin) {
    const end = start + durationMin;
    const free = techIds.filter(
      (techId) => !busy.some((job) => job.techId === techId && overlaps(start, end, job, bufferMin)),
    );
    const unassigned = busy.filter((job) => job.techId == null && overlaps(start, end, job, bufferMin)).length;
    if (free.length - unassigned >= 1 && free[0]) {
      openings.push({ startMin: start, techId: free[0] });
    }
  }

  return openings;
}
