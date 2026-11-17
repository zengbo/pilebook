import { Link } from "react-router-dom";
import { Wordmark } from "../components/Mark";
import { formatUsd } from "../shared/money";

const tiers = [
  {
    name: "Starter",
    price: 49,
    detail: "For the owner who still runs the wand.",
    points: ["Booking page and instant quotes", "1 tech on the calendar", "Email confirmations"],
  },
  {
    name: "Growth",
    price: 99,
    detail: "The plan most 2–5 person crews will land on.",
    points: ["Up to 5 techs", "24-hour reminders", "Balance collection links"],
    featured: true,
  },
  {
    name: "Crew",
    price: 199,
    detail: "When the second van is already on the road.",
    points: ["Up to 10 techs", "Embed the booker on your site", "Zip-by-zip travel fees"],
  },
];

export function Marketing({ missing = false }: { missing?: boolean }) {
  return (
    <div className="pile-bg min-h-screen">
      <div className="stripe-rule" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Wordmark />
        <nav className="flex items-center gap-2 text-sm">
          <a href="#pricing" className="hidden px-3 py-2 text-muted sm:inline">
            Pricing
          </a>
          <Link to="/login" className="px-3 py-2">
            Sign in
          </Link>
          <Link to="/signup" className="rounded-full bg-pine px-4 py-2 text-paper">
            Start free
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20">
        {missing ? <p className="mb-6 text-sm text-clay">That page isn’t on the schedule. The front door is right here.</p> : null}
        <section className="grid items-end gap-10 py-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-brass-deep">Carpet · upholstery · rugs</p>
            <h1 className="display mt-3 max-w-xl text-5xl leading-[1.02] text-ink sm:text-6xl">
              Quote the job before you put the truck in drive.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Pilebook is the booking page and back office for US carpet-cleaning crews of 1–10 techs. Rooms, stairs, sofas, and zip fees — priced the way you already quote. Customers pick a slot and leave a deposit. You see the job on the calendar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/signup" className="rounded-full bg-brass px-5 py-3 text-white">
                Open your shop
              </Link>
              <Link to="/b/north-loop" className="rounded-full border border-line bg-card px-5 py-3">
                Book the demo cleaner
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">No generic field-service bloat. Not for plumbers, pest, or HVAC.</p>
          </div>
          <aside className="rounded-3xl bg-pine-deep p-5 text-paper shadow-xl">
            <p className="text-sm text-[#d5ebe4]">North Loop Carpet Co. · live quote</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between"><span>2 rooms</span><span>{formatUsd(13800)}</span></li>
              <li className="flex justify-between"><span>1 stair flight</span><span>{formatUsd(4900)}</span></li>
              <li className="flex justify-between"><span>Pet odor · 3 areas</span><span>{formatUsd(10500)}</span></li>
              <li className="flex justify-between text-[#d5ebe4]"><span>Travel · 55404</span><span>{formatUsd(1500)}</span></li>
            </ul>
            <div className="mt-4 flex items-end justify-between border-t border-white/15 pt-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#d5ebe4]">On the truck about</p>
                <p className="display text-3xl">2 hr</p>
              </div>
              <p className="display text-4xl">{formatUsd(30700)}</p>
            </div>
            <p className="mt-4 rounded-2xl bg-white/10 px-3 py-2 text-sm">Tomorrow 10:00 AM is open for Casey.</p>
          </aside>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Price it like a cleaner", "Per room, hallway, flight of stairs, square foot, sofa, and rug size. Minimum job and a travel fee by zip."],
            ["2", "Send one booking link", "Customers build the quote, pick a slot that fits your hours and the crew already on the board, and pay a deposit."],
            ["3", "Run the day from one calendar", "Assign a tech, mark en route, and collect whatever is left when the carpets are dry."],
          ].map(([step, title, body]) => (
            <article key={step} className="rounded-3xl border border-line bg-card p-5">
              <p className="display text-3xl text-brass">{step}</p>
              <h2 className="mt-2 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="display text-4xl">Built for the quote you give in the driveway.</h2>
            <p className="mt-3 text-muted">Housecall Pro and Jobber can run a plumbing company. Pilebook only knows carpet, upholstery, and rugs — so the price book is the whole product, not a blank line-item form.</p>
          </div>
          <ul className="space-y-3 text-sm">
            {[
              "Service area is a list of zip codes, each with its own trip fee.",
              "Slot times respect job length, a buffer, and how many techs are still free.",
              "Stripe Connect sends the card payment to the cleaning business. Pilebook does not sit on the money.",
              "Email confirmations and a 24-hour reminder. SMS is wired up and intentionally not sent.",
              "An iframe snippet if the shop already has a website.",
            ].map((item) => (
              <li key={item} className="rounded-2xl bg-card px-4 py-3">{item}</li>
            ))}
          </ul>
        </section>

        <section id="pricing" className="mt-16">
          <h2 className="display text-4xl">Straightforward monthly pricing.</h2>
          <p className="mt-2 max-w-2xl text-muted">$49, $99, and $199 are where this is headed. Billing is not turned on. Every account in this MVP is a free trial, and the limits below are not enforced yet.</p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {tiers.map((tier) => (
              <article key={tier.name} className={`rounded-3xl border p-5 ${tier.featured ? "border-pine bg-pine text-paper" : "border-line bg-card"}`}>
                <p className="text-sm uppercase tracking-[0.14em]">{tier.name}</p>
                <p className="display mt-3 text-5xl">${tier.price}<span className="text-lg">/mo</span></p>
                <p className={`mt-2 text-sm ${tier.featured ? "text-[#d5ebe4]" : "text-muted"}`}>{tier.detail}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {tier.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            ["Do you take a cut of the job?", "Not in this MVP. Connect checkout charges the customer on the cleaning company’s Stripe account."],
            ["Can I drop it on my current site?", "Yes. Settings includes an iframe snippet for /b/your-shop/embed."],
            ["Will you text my customers?", "The SMS interface is there. Nothing is sent. US 10DLC registration is a later project."],
          ].map(([q, a]) => (
            <article key={q} className="rounded-3xl border border-line bg-card p-5">
              <h3 className="font-semibold">{q}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{a}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className="border-t border-line px-5 py-8 text-sm text-muted">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Wordmark />
          <p>Independent software for carpet cleaners. Demo shop: North Loop Carpet Co.</p>
        </div>
      </footer>
    </div>
  );
}
