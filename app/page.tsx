import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Join your circle",
    description: "Sign in with Google and request access to your family’s private sitter network.",
  },
  {
    number: "02",
    title: "Choose a window",
    description: "See exactly who is available, when they can help, and how much time you need.",
  },
  {
    number: "03",
    title: "Know it’s handled",
    description: "Get a clear confirmation and keep the plan handy on everyone’s calendar.",
  },
];

const upcomingWindows = [
  { day: "Fri", date: "11", time: "4:00 – 11:00 PM", sitter: "Charlotte", tone: "bg-coral" },
  { day: "Sat", date: "12", time: "1:00 – 4:00 PM", sitter: "Charlotte", tone: "bg-yellow" },
  { day: "Sun", date: "13", time: "6:00 – 10:00 PM", sitter: "Emma", tone: "bg-mint" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf7] text-[#18231f]">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-[#18231f]/15 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e86e52] text-sm font-black text-[#18231f]">
              <span>SB</span>
            </div>
            <div>
              <p className="text-xl font-black tracking-[-0.04em]">SitterBook</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#53605a] sm:flex">
            <Link href="#how-it-works" className="transition hover:text-[#e86e52]">How it works</Link>
            <Link href="/parents" className="transition hover:text-[#e86e52]">Browse availability</Link>
          </nav>
          <Link href="/auth" className="rounded-full bg-[#18231f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#304039]">
            Get started <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section className="grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:pb-28 lg:pt-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#e86e52]">
              <span className="h-2 w-2 rounded-full bg-[#e86e52]" />
              Your family’s sitter circle
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.065em] text-[#18231f] sm:text-6xl lg:text-8xl">
              More time for <span className="text-[#e86e52]">yourself.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[#53605a] sm:text-xl">
              Find a trusted sitter, book the time that fits, and get back to the things that make your family yours.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth" className="rounded-full bg-[#e86e52] px-6 py-3.5 text-center text-sm font-bold text-[#18231f] transition hover:bg-[#ef876d]">
                Find a sitter <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/parents" className="rounded-full border border-[#18231f]/20 px-6 py-3.5 text-center text-sm font-bold text-[#18231f] transition hover:bg-white">
                See open times
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm font-semibold text-[#53605a]">
              <span className="flex -space-x-2" aria-hidden="true">
                <span className="h-8 w-8 rounded-full border-2 border-[#fbfaf7] bg-[#f2bf69]" />
                <span className="h-8 w-8 rounded-full border-2 border-[#fbfaf7] bg-[#91b6a3]" />
                <span className="h-8 w-8 rounded-full border-2 border-[#fbfaf7] bg-[#d88f7a]" />
              </span>
              Made for the people who keep family life moving.
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -right-5 -top-8 h-28 w-28 rounded-full bg-[#f2bf69] opacity-70 blur-2xl" />
            <div className="relative rounded-[2rem] border border-[#18231f]/15 bg-[#fffdf8] p-5 shadow-[12px_16px_0_#dce7dd] sm:p-7">
              <div className="mb-7 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#7a847d]">September 2026</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Open this week</h2>
                </div>
                <span className="rounded-full bg-[#dce7dd] px-3 py-1.5 text-xs font-bold text-[#47705a]">3 windows</span>
              </div>

              <div className="space-y-3">
                {upcomingWindows.map((slot) => (
                  <div
                    key={slot.day}
                    className="flex items-center gap-4 rounded-2xl border border-[#18231f]/10 bg-white px-4 py-4"
                  >
                    <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${slot.tone}`}>
                      <span className="text-[10px] font-bold uppercase">{slot.day}</span>
                      <span className="text-lg font-black leading-4">{slot.date}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{slot.time}</p>
                      <p className="mt-1 text-sm text-[#7a847d]">with {slot.sitter}</p>
                    </div>
                    <span className="text-lg text-[#e86e52]" aria-hidden="true">→</span>
                  </div>
                ))}
              </div>
              <Link href="/parents" className="mt-5 block text-center text-sm font-bold text-[#e86e52] transition hover:text-[#b9513b]">View all availability <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t border-[#18231f]/15 py-16 lg:py-20">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#e86e52]">Simple by design</p>
              <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.05em] sm:text-4xl">A little less logistics. A lot more life.</h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-[#53605a]">A private, parent-first way to coordinate care with people you already trust.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="border-t-2 border-[#18231f] pt-5">
                <p className="text-sm font-black text-[#e86e52]">{step.number}</p>
                <h3 className="mt-8 text-xl font-black tracking-[-0.03em]">{step.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-6 text-[#53605a]">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
