import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { STATUS_LABEL, type JobStatus } from "../shared/status";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-pine text-paper hover:bg-pine-deep",
        brass: "bg-brass text-white hover:bg-brass-deep",
        outline: "border border-line bg-card text-ink hover:bg-paper",
        ghost: "text-ink hover:bg-black/5",
        danger: "bg-clay text-white hover:bg-[#732f27]",
      },
      size: {
        default: "h-11 px-4 text-sm",
        sm: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-card px-3 text-ink outline-none placeholder:text-muted/70 focus:border-pine",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("min-h-24 w-full rounded-xl border border-line bg-card px-3 py-2 text-ink outline-none focus:border-pine", className)}
      {...props}
    />
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", className)}>{children}</span>;
}

const statusClass: Record<JobStatus, string> = {
  booked: "bg-[#f4e4cf] text-brass-deep",
  en_route: "bg-foam text-pine-deep",
  done: "bg-[#e5eee4] text-moss",
  paid: "bg-pine text-paper",
  cancelled: "bg-black/5 text-muted",
};

export function StatusPill({ status }: { status: string }) {
  const known = status in statusClass ? (status as JobStatus) : "booked";
  const label = status in STATUS_LABEL ? STATUS_LABEL[status as JobStatus] : status;
  return <Badge className={statusClass[known]}>{label}</Badge>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-[#f8e8e4] px-3 py-2 text-sm text-clay">{children}</p>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card px-5 py-10 text-center">
      <p className="display text-2xl text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
    </div>
  );
}
