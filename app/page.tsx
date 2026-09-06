import Link from "next/link";

const features = [
  {
    title: "Create availability blocks",
    description:
      "Sitters can post open time windows for evenings, weekends, and school breaks in a few clicks.",
  },
  {
    title: "Approve family access",
    description:
      "Parents join with Google sign-in, then wait for a trusted approval before they can book.",
  },
  {
    title: "Book and reserve time",
    description:
      "Families reserve a sub-block inside a sitter's open window, without overlapping anyone else's booking.",
  },
  {
    title: "Calendar-ready confirmation",
    description:
      "Bookings can trigger calendar invites so everyone sees the finalized plan in one place.",
  },
];

const schedule = [
  { label: "Friday", time: "4:00 PM - 12:00 AM", person: "Charlotte" },
  { label: "Saturday", time: "2:00 PM - 8:00 PM", person: "Emma" },
  { label: "Sunday", time: "6:00 PM - 9:30 PM", person: "Charlotte" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f5ff,_#f4f7ff_42%,_#eef2ff_100%)] text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-5 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
              SB
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">SitterBook</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <Link href="/dashboard" className="transition hover:text-violet-600">Availability</Link>
            <Link href="/parents" className="transition hover:text-violet-600">Bookings</Link>
            <Link href="/dashboard" className="transition hover:text-violet-600">Calendar</Link>
          </nav>
          <Link href="/auth" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700">
            Sign in
          </Link>
        </header>

        <section className="grid items-center gap-10 pb-16 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Family scheduling made easy
            </span>
            <h1 className="mt-6 max-w-xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Book babysitting time without the chaos.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              SitterBook helps sitters publish open time blocks and lets approved families reserve the exact windows they need, with clear calendars and easy confirmations.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="rounded-full bg-violet-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-500">
                Create availability
              </Link>
              <Link href="/parents" className="rounded-full border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
                Explore bookings
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              <span>Google OAuth</span>
              <span>•</span>
              <span>Approval flow</span>
              <span>•</span>
              <span>Calendar invites</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
            <div className="rounded-[1.5rem] bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">This week</p>
                  <h2 className="text-xl font-bold text-slate-900">Availability</h2>
                </div>
                <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Open
                </div>
              </div>

              <div className="space-y-3">
                {schedule.map((slot) => (
                  <div
                    key={slot.label}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                      <p className="text-sm text-slate-500">{slot.time}</p>
                    </div>
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      {slot.person}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">A cleaner way to manage babysitting.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-sm font-bold text-violet-700">
                  0{index + 1}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
