"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { useEffect, useState, type FormEvent } from "react";
import type { AvailabilityBlock, Booking, User } from "@/lib/mock-data";
import type { RegistrationRequest } from "@/lib/registration";

function readJson<T>(url: string): Promise<T> {
  return fetch(url).then((response) => response.json() as Promise<T>);
}

export default function AdminPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sitters, setSitters] = useState<User[]>([]);
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking");
  const [sitterName, setSitterName] = useState("");
  const [sitterEmail, setSitterEmail] = useState("");
  const [sitterFormError, setSitterFormError] = useState<string | null>(null);

  async function reloadSitters() {
    setSitters(await readJson<User[]>("/api/sitters"));
  }

  useEffect(() => {
    async function load() {
      const sessionResponse = await fetch("/api/session");
      const sessionData = sessionResponse.ok
        ? (await sessionResponse.json()) as { session?: { role?: string } }
        : null;

      if (sessionData?.session?.role !== "admin") {
        setAccessState("denied");
        return;
      }

      const [nextRequests, nextAvailability, nextBookings, nextSitters] = await Promise.all([
        readJson<RegistrationRequest[]>("/api/registrations"),
        readJson<AvailabilityBlock[]>("/api/availability"),
        readJson<Booking[]>("/api/bookings"),
        readJson<User[]>("/api/sitters"),
      ]);

      setRequests(nextRequests);
      setAvailability(nextAvailability);
      setBookings(nextBookings);
      setSitters(nextSitters);
      setAccessState("allowed");
    }

    void load();
  }, []);

  if (accessState === "checking") {
    return (
      <main className="min-h-screen bg-[#f7f4f1] px-6 py-16 text-center text-[#53605a]">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-center justify-center gap-3">
            <Logo className="h-8" />
          </div>
          Checking administrator access…
        </div>
      </main>
    );
  }

  if (accessState === "denied") {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center bg-[#f7f4f1] px-6 py-16 text-center">
        <div className="w-full rounded-[2rem] border border-[#1a2d2a]/10 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center justify-center gap-3">
            <Logo className="h-8" />
          </div>
          <h1 className="text-3xl font-bold text-[#1a2d2a]">Administrator access required</h1>
          <p className="mt-3 text-[#53605a]">Sign in with an approved administrator account to manage family requests.</p>
          <Link href="/auth" className="mt-6 inline-flex rounded-full bg-[#e86e52] px-5 py-3 text-sm font-semibold text-[#1a2d2a]">Go to sign-in</Link>
        </div>
      </main>
    );
  }

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

  async function addSitter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSitterFormError(null);

    const response = await fetch("/api/sitters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sitterName, email: sitterEmail }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setSitterFormError(body.error ?? "Unable to add sitter.");
      return;
    }

    setSitterName("");
    setSitterEmail("");
    await reloadSitters();
  }

  async function toggleSitterApproved(sitterId: string, approved: boolean) {
    const response = await fetch("/api/sitters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sitterId, approved }),
    });

    if (response.ok) {
      await reloadSitters();
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4f1]">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="flex items-center gap-3">
            <Logo className="h-9" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth" className="rounded-full border border-[#1a2d2a]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#1a2d2a] transition hover:bg-[#f7f4f1]">Preview sign-in</Link>
            <Link href="/dashboard" className="rounded-full bg-[#1a2d2a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#304039]">Sitter dashboard</Link>
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

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Team</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Manage sitters</h2>

          <form onSubmit={addSitter} className="mt-5 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500" htmlFor="sitter-name">Name</label>
              <input
                id="sitter-name"
                value={sitterName}
                onChange={(event) => setSitterName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500" htmlFor="sitter-email">Email</label>
              <input
                id="sitter-email"
                type="email"
                value={sitterEmail}
                onChange={(event) => setSitterEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <button type="submit" className="rounded-full bg-[#1a2d2a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#304039]">Add sitter</button>
          </form>
          {sitterFormError && <p className="mt-2 text-sm text-rose-600">{sitterFormError}</p>}

          <div className="mt-5 space-y-3">
            {sitters.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No sitters yet. Add one above.</div>
            ) : sitters.map((sitter) => (
              <div key={sitter.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-900">{sitter.name}</p>
                  <p className="text-sm text-slate-500">{sitter.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={sitter.approved ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500"}>
                    {sitter.approved ? "Active" : "Deactivated"}
                  </span>
                  <button
                    onClick={() => toggleSitterApproved(sitter.id, !sitter.approved)}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#1a2d2a]/30 hover:bg-[#f7f4f1]"
                  >
                    {sitter.approved ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

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