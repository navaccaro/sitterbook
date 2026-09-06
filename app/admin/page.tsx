import { availabilityBlocks, bookings, users } from "@/lib/mock-data";

export default function AdminPage() {
  const pendingParents = users.filter((user) => user.role === "parent" && !user.approved);
  const sitterBlocks = availabilityBlocks.map((block) => ({
    ...block,
    bookedCount: bookings.filter((booking) => booking.availabilityId === block.id).length,
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Admin</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Approvals and schedule oversight</h1>
        </div>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Create sitter</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Parent approval queue</h2>
          <div className="mt-5 space-y-4">
            {pendingParents.length === 0 ? (
              <p className="text-sm text-slate-500">No pending approvals.</p>
            ) : (
              pendingParents.map((parent) => (
                <div key={parent.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{parent.name}</p>
                    <p className="text-sm text-slate-500">{parent.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Approve</button>
                    <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Review</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Availability overview</h2>
          <div className="mt-5 space-y-4">
            {sitterBlocks.map((block) => (
              <div key={block.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{block.label}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(block.start).toLocaleString()} → {new Date(block.end).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    {block.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <span>Booked windows</span>
                  <strong className="text-slate-900">{block.bookedCount}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
