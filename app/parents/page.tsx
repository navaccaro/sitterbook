"use client";

import { useState } from "react";
import { availabilityBlocks, bookings } from "@/lib/mock-data";
import type { AvailabilityBlock, Booking } from "@/lib/mock-data";
import { canBookBlock } from "@/lib/scheduler";

type CandidateTimes = {
  start: string;
  end: string;
};

function defaultCandidateTimes(block: AvailabilityBlock): CandidateTimes {
  const startHour = Number(block.start.slice(11, 13));
  const endHour = Math.min(startHour + 2, Number(block.end.slice(11, 13)));

  return {
    start: block.start.slice(11, 16),
    end: `${String(endHour).padStart(2, "0")}:00`,
  };
}

export default function ParentsPage() {
  const openBlocks = availabilityBlocks.filter((block) => block.status !== "booked");
  const [currentBookings, setCurrentBookings] = useState(bookings);
  const [candidateTimes, setCandidateTimes] = useState<Record<string, CandidateTimes>>(() =>
    Object.fromEntries(openBlocks.map((block) => [block.id, defaultCandidateTimes(block)])),
  );
  const [message, setMessage] = useState<string | null>(null);

  function reserveBlock(block: AvailabilityBlock) {
    const times = candidateTimes[block.id];
    const candidateStart = `${block.start.slice(0, 10)}T${times.start}:00`;
    const candidateEnd = `${block.start.slice(0, 10)}T${times.end}:00`;

    if (new Date(candidateEnd) <= new Date(candidateStart) || !canBookBlock(block, candidateStart, candidateEnd, currentBookings)) {
      setMessage(`${block.label} is no longer available for that time.`);
      return;
    }

    const nextBooking: Booking = {
      id: `booking-${block.id}-${currentBookings.length}`,
      availabilityId: block.id,
      parentId: "parent-1",
      sitterId: block.sitterId,
      start: candidateStart,
      end: candidateEnd,
      status: "confirmed",
      parentName: "The Smiths",
    };

    setCurrentBookings((current) => [...current, nextBooking]);
    setMessage(`Reserved ${times.start} – ${times.end} on ${block.label}.`);
  }

  function releaseReservation(bookingId: string) {
    setCurrentBookings((current) => current.filter((booking) => booking.id !== bookingId));
    setMessage("Reservation released. That time is available again.");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Parents</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Available babysitting windows</h1>
        {message && <p role="status" className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {openBlocks.map((block) => {
          const times = candidateTimes[block.id];
          const candidateStart = `${block.start.slice(0, 10)}T${times.start}:00`;
          const candidateEnd = `${block.start.slice(0, 10)}T${times.end}:00`;
          const isValidBooking = new Date(candidateEnd) > new Date(candidateStart) && canBookBlock(block, candidateStart, candidateEnd, currentBookings);
          const ownReservation = currentBookings.find(
            (booking) =>
              booking.availabilityId === block.id &&
              booking.parentId === "parent-1",
          );

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

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500">Availability check</span>
                <span className={isValidBooking ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
                  {isValidBooking ? "Open" : "Conflict"}
                </span>
              </div>

              {ownReservation ? (
                <button
                  onClick={() => releaseReservation(ownReservation.id)}
                  className="mt-5 w-full rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  Release your reservation
                </button>
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
