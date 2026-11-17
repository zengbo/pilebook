import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSession } from "../session";
import { Wordmark } from "./Mark";

const links = [
  ["/app", "Today"],
  ["/app/calendar", "Calendar"],
  ["/app/customers", "Customers"],
  ["/app/pricing", "Price book"],
  ["/app/messages", "Messages"],
  ["/app/settings", "Settings"],
];

export function Shell({ children }: { children: ReactNode }) {
  const { business, setSession } = useSession();
  const navigate = useNavigate();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setSession(null, null);
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-card md:min-h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <NavLink to="/app" className="inline-flex">
            <Wordmark />
          </NavLink>
          <button className="text-sm text-muted md:mt-6 md:block" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
        <p className="hidden px-4 text-sm text-muted md:block">{business?.name}</p>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:mt-4 md:block md:space-y-1 md:px-3">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/app"}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-2 text-sm md:block ${isActive ? "bg-pine text-paper" : "text-ink hover:bg-paper"}`
              }
            >
              {label}
            </NavLink>
          ))}
          {business ? (
            <a className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-pine md:block" href={`/b/${business.slug}`}>
              Booking page
            </a>
          ) : null}
        </nav>
      </aside>
      <main className="px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}
