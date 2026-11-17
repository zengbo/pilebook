import { formatMinutes } from "../shared/time";
import { WEEKDAYS, type HoursDay } from "../shared/defaults";
import type { TravelZone } from "../shared/quote";
import { formatUsd } from "../shared/money";
import { Input } from "./ui";

const TIMES = Array.from({ length: 29 }, (_, index) => 6 * 60 + index * 30);

export function Qty({
  label,
  hint,
  value,
  onChange,
  price,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  price?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/80 py-3">
      <div>
        <p className="font-medium">{label}</p>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {price ? <span className="hidden text-sm text-muted sm:inline">{price}</span> : null}
        <button type="button" className="h-9 w-9 rounded-full border border-line bg-card" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Fewer ${label}`}>
          −
        </button>
        <span className="w-8 text-center tabular-nums">{value}</span>
        <button type="button" className="h-9 w-9 rounded-full bg-pine text-paper" onClick={() => onChange(value + 1)} aria-label={`More ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

export function HoursEditor({ hours, onChange }: { hours: HoursDay[]; onChange: (hours: HoursDay[]) => void }) {
  function update(weekday: number, patch: Partial<HoursDay>) {
    onChange(hours.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)));
  }
  return (
    <div className="space-y-2">
      {hours.map((day) => (
        <div key={day.weekday} className="grid grid-cols-[7rem_auto_1fr] items-center gap-2 sm:grid-cols-[8rem_5rem_1fr_1fr]">
          <span className="text-sm font-medium">{WEEKDAYS[day.weekday]}</span>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={!day.closed} onChange={(event) => update(day.weekday, { closed: !event.target.checked })} />
            Open
          </label>
          <select
            className="h-10 rounded-xl border border-line bg-card px-2 disabled:opacity-40"
            disabled={day.closed}
            value={day.openMin}
            onChange={(event) => update(day.weekday, { openMin: Number(event.target.value) })}
            aria-label={`${WEEKDAYS[day.weekday]} opens`}
          >
            {TIMES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatMinutes(minutes)}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-line bg-card px-2 disabled:opacity-40"
            disabled={day.closed}
            value={day.closeMin}
            onChange={(event) => update(day.weekday, { closeMin: Number(event.target.value) })}
            aria-label={`${WEEKDAYS[day.weekday]} closes`}
          >
            {TIMES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatMinutes(minutes)}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function ZipEditor({ zones, onChange }: { zones: TravelZone[]; onChange: (zones: TravelZone[]) => void }) {
  return (
    <div className="space-y-2">
      {zones.map((zone, index) => (
        <div key={index} className="grid grid-cols-[1fr_8rem_auto] gap-2">
          <Input
            inputMode="numeric"
            maxLength={5}
            autoComplete="off"
            placeholder="55401"
            aria-label={`Zip code ${index + 1}`}
            value={zone.zip}
            onChange={(event) => onChange(zones.map((item, i) => (i === index ? { ...item, zip: event.target.value.replace(/\D/g, "").slice(0, 5) } : item)))}
          />
          <Input
            inputMode="decimal"
            aria-label={`Travel fee for ${zone.zip || "zip"}`}
            value={(zone.travelFeeCents / 100).toFixed(2)}
            onChange={(event) => {
              const dollars = Number(event.target.value);
              const cents = Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
              onChange(zones.map((item, i) => (i === index ? { ...item, travelFeeCents: Math.max(0, cents) } : item)));
            }}
          />
          <button type="button" className="px-2 text-sm text-clay" onClick={() => onChange(zones.filter((_, i) => i !== index))} disabled={zones.length === 1}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="text-sm font-medium text-pine" onClick={() => onChange([...zones, { zip: "", travelFeeCents: 0 }])}>
        Add zip code
      </button>
      <p className="text-xs text-muted">Travel fee is added after the minimum job price. {zones[0] ? `Example: ${formatUsd(zones[0].travelFeeCents)}.` : ""}</p>
    </div>
  );
}
