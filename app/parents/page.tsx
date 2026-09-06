"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { useEffect, useState } from "react";
import type { AvailabilityBlock, Booking } from "@/lib/mock-data";
import { canBookBlock } from "@/lib/scheduler";
import { googleCalendarUrl } from "@/lib/calendar";

type CandidateTimes = {
  start: string;
  end: string;
};

type FamilyProfile = {
  id: string;
  name: string;
  email: string;
};

type FamilyConnection = {
  id: string;
  status: "pending" | "active";
  counterpartName: string;
  counterpartEmail: string;
};

const pendingInviteStorageKey = "sitterbook.pendingInvite";


function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

function defaultCandidateTimes(block: AvailabilityBlock): CandidateTimes {
  const startHour = Number(block.start.slice(11, 13));
  const endHour = Math.min(startHour + 2, Number(block.end.slice(11, 13)));

  return {
    start: block.start.slice(11, 16),
    end: `${String(endHour).padStart(2, "0")}:00`,
  };
}

export default function ParentsPage() {
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [currentBookings, setCurrentBookings] = useState<Booking[]>([]);
  const [candidateTimes, setCandidateTimes] = useState<Record<string, CandidateTimes>>({});
  const [bookingNotes, setBookingNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [familyProfile, setFamilyProfile] = useState<FamilyProfile | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [connections, setConnections] = useState<FamilyConnection[]>([]);
  const [connectSitterEmail, setConnectSitterEmail] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sessionResponse = await fetch("/api/session");

        if (!sessionResponse.ok) {
          setIsApproved(false);
          return;
        }

        const sessionData = (await sessionResponse.json()) as {
          session: { userId: string; name: string; email: string };
          status: string;
        };
        const storedFamily: FamilyProfile = {
          id: sessionData.session.userId,
          name: sessionData.session.name,
          email: sessionData.session.email,
        };
        const requests = (await fetch(`/api/registrations?email=${encodeURIComponent(storedFamily.email)}`).then((response) =>
          response.json() as Promise<Array<{ email: string; status: string }>>
        ));
        const currentRequest =
          requests.find((request) => normaliseEmail(request.email) === normaliseEmail(storedFamily.email)) ?? {
            email: storedFamily.email,
            status: "pending",
          };

        if (currentRequest.status !== "approved") {
          setIsApproved(false);
          return;
        }

        setFamilyProfile(storedFamily);
        setIsApproved(true);

        const pendingInviteToken = window.localStorage.getItem(pendingInviteStorageKey);

        if (pendingInviteToken) {
          const acceptResponse = await fetch(`/api/invites/${pendingInviteToken}`, { method: "POST" });

          if (acceptResponse.ok) {
            window.localStorage.removeItem(pendingInviteStorageKey);
          }
        }

        const [nextAvailability, nextBookings, nextConnections] = await Promise.all([
          fetch("/api/availability").then((response) => response.json() as Promise<AvailabilityBlock[]>),
          fetch("/api/bookings").then((response) => response.json() as Promise<Booking[]>),
          fetch("/api/connections").then((response) => response.json() as Promise<FamilyConnection[]>),
        ]);

        setAvailability(nextAvailability);
        setCurrentBookings(nextBookings);
        setConnections(nextConnections);
        setCandidateTimes(
          Object.fromEntries(
            nextAvailability.map((block) => [block.id, defaultCandidateTimes(block)]),
          ),
        );
      } catch {
        setIsApproved(false);
      }
    }

    void load();
  }, []);

  if (isApproved === null) {
    return (
      <main className="min-h-screen bg-[#f7f4f1] px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <Logo className="h-8" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e86e52]">Parents</p>
          <h1 className="mt-3 text-3xl font-bold text-[#1a2d2a]">Checking family access…</h1>
        </div>
      </main>
    );
  }

  if (!isApproved) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center bg-[#f7f4f1] px-6 py-16">
        <div className="w-full rounded-[2rem] border border-[#1a2d2a]/10 bg-white p-8 text-center shadow-sm">
          <div className="mb-5 flex items-center justify-center gap-3">
            <Logo className="h-8" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e86e52]">Access required</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-[#1a2d2a]">Family approval is still pending.</h1>
          <p className="mt-4 text-lg text-[#53605a]">Your request must be approved before you can browse sitter windows and reserve time.</p>
          <Link href="/auth" className="mt-8 inline-flex rounded-full bg-[#e86e52] px-6 py-3 text-sm font-semibold text-[#1a2d2a] transition hover:bg-[#ef876d]">Go to sign-in</Link>
        </div>
      </main>
    );
  }

  function handleSignOut() {
    void fetch("/api/session", { method: "DELETE" });
    setFamilyProfile(null);
    setIsApproved(false);
  }

  const openBlocks = availability.filter((block) => block.status !== "booked");

  async function reserveBlock(block: AvailabilityBlock) {
    if (!familyProfile) {
      setMessage("Please sign in again before reserving a block.");
      return;
    }

    const times = candidateTimes[block.id];
    const candidateStart = `${block.start.slice(0, 10)}T${times.start}:00`;
    const candidateEnd = `${block.start.slice(0, 10)}T${times.end}:00`;

    if (!canBookBlock(block, candidateStart, candidateEnd, currentBookings)) {
      setMessage(`${block.label} is no longer available for that time.`);
      return;
    }

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockId: block.id,
        parentId: familyProfile.id,
        parentName: familyProfile.name,
        parentEmail: familyProfile.email,
        start: candidateStart,
        end: candidateEnd,
        notes: bookingNotes[block.id]?.trim() ?? "",
      }),
    });

    if (!response.ok) {
      setMessage(`${block.label} is no longer available for that time.`);
      return;
    }

    const nextBooking = (await response.json()) as Booking;
    setCurrentBookings((current) => [...current, nextBooking]);
    setMessage(`Reserved ${times.start} – ${times.end} on ${block.label}.`);
  }

  async function releaseReservation(bookingId: string) {
    if (!familyProfile) {
      return;
    }

    const response = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: bookingId,
        parentId: familyProfile.id,
        parentEmail: familyProfile.email,
      }),
    });

    if (!response.ok) {
      return;
    }

    setCurrentBookings((current) => current.filter((booking) => booking.id !== bookingId));
    setMessage("Reservation released. That time is available again.");
  }

  async function syncCalendar() {
    setIsSyncingCalendar(true);
    const response = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await response.json()) as { synced?: number; message?: string; error?: string };
    setMessage(response.ok ? `${data.synced ?? 0} booking${data.synced === 1 ? "" : "s"} synced to Google Calendar.` : data.error ?? "Calendar sync failed.");
    setIsSyncingCalendar(false);
  }

  async function requestSitterConnection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConnectError(null);

    if (!connectSitterEmail.trim()) {
      return;
    }

    setIsConnecting(true);
    const response = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sitterEmail: connectSitterEmail.trim() }),
    });
    const data = (await response.json()) as FamilyConnection & { error?: string };
    setIsConnecting(false);

    if (!response.ok) {
      setConnectError(data.error ?? "Unable to send that connection request.");
      return;
    }

    setConnections((current) => [...current, data]);
    setConnectSitterEmail("");
  }

  return (
    <main className="mx-auto max-w-6xl bg-[#f7f4f1] px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-9" />
        </div>
        <div className="flex items-center gap-3 rounded-full border border-[#1a2d2a]/10 bg-white px-4 py-2 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a847d]">Family</p>
            <p className="text-sm font-semibold text-[#1a2d2a]">{familyProfile?.name ?? "Your family"}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-full border border-[#1a2d2a]/15 px-3 py-1.5 text-xs font-semibold text-[#1a2d2a] transition hover:bg-[#f7f4f1]"
          >
            Sign out
          </button>
          <button
            onClick={syncCalendar}
            disabled={isSyncingCalendar}
            className="rounded-full bg-[#e86e52] px-3 py-1.5 text-xs font-semibold text-[#1a2d2a] transition hover:bg-[#ef876d] disabled:cursor-wait disabled:opacity-60"
          >
            {isSyncingCalendar ? "Syncing…" : "Sync calendar"}
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className="mb-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>
      )}

      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Your circle</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Connect with a sitter you know</h2>
        <p className="mt-2 text-sm text-slate-500">Enter a sitter&apos;s email to send a connection request. Once they accept, you&apos;ll see their availability here.</p>
        <form onSubmit={requestSitterConnection} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            placeholder="sitter@example.com"
            value={connectSitterEmail}
            onChange={(event) => setConnectSitterEmail(event.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4"
          />
          <button
            type="submit"
            disabled={isConnecting}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isConnecting ? "Sending…" : "Send request"}
          </button>
        </form>
        {connectError && <p className="mt-2 text-sm text-rose-600">{connectError}</p>}

        {connections.length > 0 && (
          <div className="mt-4 space-y-2">
            {connections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{connection.counterpartName}</p>
                  <p className="text-xs text-slate-500">{connection.counterpartEmail}</p>
                </div>
                <span className={connection.status === "active" ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"}>
                  {connection.status === "active" ? "Connected" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {openBlocks.map((block) => {
          const times = candidateTimes[block.id];
          const candidateStart = `${block.start.slice(0, 10)}T${times.start}:00`;
          const candidateEnd = `${block.start.slice(0, 10)}T${times.end}:00`;
          const isValidBooking = new Date(candidateEnd) > new Date(candidateStart) && canBookBlock(block, candidateStart, candidateEnd, currentBookings);
          const activeBlockBookings = currentBookings.filter(
            (booking) => booking.availabilityId === block.id && booking.status !== "cancelled",
          );
          const ownReservation = activeBlockBookings.find(
            (booking) => familyProfile && booking.parentId === familyProfile.id,
          );

          return (
            <div key={block.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-slate-900">{block.label}</p>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {activeBlockBookings.length > 0 ? "partially booked" : "open"}
                </span>
              </div>

              <p className="mt-4 text-sm text-slate-500">
                {new Date(block.start).toLocaleString()} → {new Date(block.end).toLocaleString()}
              </p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-700">Choose your time</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-slate-500">
                    Starts
                    <input
                      type="time"
                      min={block.start.slice(11, 16)}
                      max={block.end.slice(11, 16)}
                      value={times.start}
                      onChange={(event) => setCandidateTimes((current) => ({
                        ...current,
                        [block.id]: { ...current[block.id], start: event.target.value },
                      }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-500">
                    Ends
                    <input
                      type="time"
                      min={block.start.slice(11, 16)}
                      max={block.end.slice(11, 16)}
                      value={times.end}
                      onChange={(event) => setCandidateTimes((current) => ({
                        ...current,
                        [block.id]: { ...current[block.id], end: event.target.value },
                      }))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
                    />
                  </label>
                </div>
              </div>

              <label className="mt-4 block text-xs font-medium text-slate-500">
                Notes for the sitter <span className="font-normal text-slate-400">(optional)</span>
                <textarea
                  rows={3}
                  value={bookingNotes[block.id] ?? ""}
                  onChange={(event) => setBookingNotes((current) => ({ ...current, [block.id]: event.target.value }))}
                  className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none ring-violet-200 focus:ring-4"
                />
              </label>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500">Availability check</span>
                <span className={isValidBooking ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                  {isValidBooking ? "Open" : "Conflict"}
                </span>
              </div>

              {ownReservation ? (
                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => releaseReservation(ownReservation.id)}
                    className="w-full rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    Release your reservation
                  </button>
                  <a
                    href={googleCalendarUrl(`SitterBook: ${ownReservation.parentName}`, ownReservation.start, ownReservation.end, `Confirmed booking with ${block.label}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full rounded-full border border-emerald-200 px-4 py-2 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Add to Google Calendar
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => reserveBlock(block)}
                  disabled={!isValidBooking}
                  className="mt-5 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isValidBooking ? "Reserve this block" : "Unavailable"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
