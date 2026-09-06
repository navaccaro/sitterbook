import { availabilityBlocks, bookings } from "@/lib/mock-data";
import { canBookBlock } from "@/lib/scheduler";

const sampleBookingStart = "2026-09-11T20:30:00";
const sampleBookingEnd = "2026-09-11T22:00:00";

export default function ParentsPage() {
  const openBlocks = availabilityBlocks.filter((block) => block.status !== "booked");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Parents</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Available babysitting windows</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {openBlocks.map((block) => {
          const isValidBooking = canBookBlock(block, sampleBookingStart, sampleBookingEnd, bookings);

          return (
            <div key={block.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-slate-900">{block.label}</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {block.status}
                </span>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                {new Date(block.start).toLocaleString()} → {new Date(block.end).toLocaleString()}
              </p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                Candidate booking: 8:30 PM – 10:00 PM
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500">Availability check</span>
                <span className={isValidBooking ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                  {isValidBooking ? "Open" : "Conflict"}
                </span>
              </div>

              <button className="mt-5 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Reserve this block
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
