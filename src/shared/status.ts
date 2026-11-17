export const JOB_STATUSES = ["booked", "en_route", "done", "paid", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABEL: Record<JobStatus, string> = {
  booked: "Booked",
  en_route: "En route",
  done: "Done",
  paid: "Paid",
  cancelled: "Cancelled",
};

export function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value);
}
