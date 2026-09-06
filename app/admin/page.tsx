"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AvailabilityBlock, Booking } from "@/lib/mock-data";
import type { RegistrationRequest } from "@/lib/registration";

function readJson<T>(url: string): Promise<T> {
  return fetch(url).then((response) => response.json() as Promise<T>);
}

export default function AdminPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    async function load() {
      const [nextRequests, nextAvailability, nextBookings] = await Promise.all([
        readJson<RegistrationRequest[]>("/api/registrations"),
        readJson<AvailabilityBlock[]>("/api/availability"),
        readJson<Booking[]>("/api/bookings"),
      ]);

      setRequests(nextRequests);
      setAvailability(nextAvailability);
      setBookings(nextBookings);
    }

    void load();
  }, []);

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const sitterBlocks = availability.map((block) => ({
    ...block,
    bookedCount: bookings.filter((booking) => booking.availabilityId === block.id).length,
  }));

  async function updateRequest(requestId: string, status: "approved" | "rejected") {
    const response = await fetch("/api/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId, status }),
    });

    if (response.ok) {
      const nextRequests = await readJson<RegistrationRequest[]>("/api/registrations");
      setRequests(nextRequests);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Admin</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Approvals and oversight</h1>
            <p className="mt-2 max-w-xl text-slate-600">Review new family requests before they can browse and reserve sitter time.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Preview sign-in</Link>
            <Link href="/dashboard" className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">Sitter dashboard</Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Pending family requests</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pendingRequests.length}</p>
            <p className="mt-1 text-sm text-amber-600">Needs your review</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Approved families</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{requests.filter((request) => request.status === "approved").length}</p>
            <p className="mt-1 text-sm text-emerald-600">Ready to book</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Open sitter windows</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{sitterBlocks.length}</p>
            <p className="mt-1 text-sm text-violet-600">Across the circle</p>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Access control</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Family approval queue</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{pendingRequests.length} pending</span>
            </div>
            <div className="mt-5 space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-700">The approval queue is clear.</div>
              ) : pendingRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{request.name}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{request.provider} OAuth</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{request.email}</p>
                      <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-700">Primary:</span> {request.primaryContactName} · {request.primaryPhone}</p>
                        {request.secondaryContactName && <p><span className="font-semibold text-slate-700">Secondary:</span> {request.secondaryContactName} · {request.secondaryPhone}</p>}
                        <p className="sm:col-span-2"><span className="font-semibold text-slate-700">Address:</span> {[request.addressLine1, request.addressLine2, request.city, request.state, request.postalCode].filter(Boolean).join(", ")}</p>
                      </div>
                      {request.additionalInfo && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="font-semibold text-slate-700">Additional info:</span> {request.additionalInfo}</p>}
                      <p className="mt-3 text-xs text-slate-400">Requested {new Date(request.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateRequest(request.id, "rejected")} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">Reject</button>
                      <button onClick={() => updateRequest(request.id, "approved")} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500">Approve family</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Schedule health</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Availability overview</h2>
            <div className="mt-5 space-y-3">
              {sitterBlocks.map((block) => (
                <div key={block.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{block.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{new Date(block.start).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-violet-700">{block.status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-500">
                    <span>Booked windows</span>
                    <strong className="text-slate-900">{block.bookedCount}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {requests.some((request) => request.status !== "pending") && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">History</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Recent decisions</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {requests.filter((request) => request.status !== "pending").map((request) => (
                <div key={request.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <span className="font-semibold text-slate-900">{request.name}</span>
                  <span className={request.status === "approved" ? "ml-2 font-semibold text-emerald-600" : "ml-2 font-semibold text-rose-600"}>{request.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}