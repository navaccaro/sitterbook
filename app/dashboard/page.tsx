import { availabilityBlocks, bookings, getUserById } from "@/lib/mock-data";

export default function DashboardPage() {
  const sitterBlocks = availabilityBlocks.filter((block) => block.sitterId === "charlotte");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Sitter dashboard</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Charlotte&apos;s schedule</h1>
        </div>
        <button className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white">New availability</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Open availability</h2>
          <div className="mt-5 space-y-4">
            {sitterBlocks.map((block) => (
              <div key={block.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{block.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(block.start).toLocaleString()} → {new Date(block.end).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    {block.status}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Edit</button>
                  <button className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Share</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Confirmed bookings</h2>
          <div className="mt-5 space-y-4">
            {bookings.filter((booking) => booking.sitterId === "charlotte").map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{booking.parentName}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(booking.start).toLocaleString()} → {new Date(booking.end).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    {booking.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Contact: {getUserById(booking.parentId)?.email ?? "family@example.com"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
