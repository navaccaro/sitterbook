"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AvailabilityBlock, Booking } from "@/lib/mock-data";
import { getBlockDurationHours } from "@/lib/scheduler";
import { googleCalendarUrl } from "@/lib/calendar";

type Draft = {
  label: string;
  date: string;
  startTime: string;
  endTime: string;
};

const emptyDraft: Draft = {
  label: "",
  date: "2026-09-14",
  startTime: "16:00",
  endTime: "20:00",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function blockToDraft(block: AvailabilityBlock): Draft {
  const start = new Date(block.start);
  const end = new Date(block.end);

  return {
    label: block.label,
    date: block.start.slice(0, 10),
    startTime: start.toTimeString().slice(0, 5),
    endTime: end.toTimeString().slice(0, 5),
  };
}

export default function DashboardPage() {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking");
  const [sitterId, setSitterId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const sessionResponse = await fetch("/api/session");
      const sessionData = sessionResponse.ok
        ? ((await sessionResponse.json()) as { session?: { userId?: string; role?: string } })
        : null;

      if (sessionData?.session?.role !== "sitter" || !sessionData.session.userId) {
        setAccessState("denied");
        return;
      }

      const currentSitterId = sessionData.session.userId;
      setSitterId(currentSitterId);

      const [nextBlocks, nextBookings] = await Promise.all([
        fetch("/api/availability").then((response) => response.json() as Promise<AvailabilityBlock[]>),
        fetch("/api/bookings").then((response) => response.json() as Promise<Booking[]>),
      ]);

      setBlocks(nextBlocks.filter((block) => block.sitterId === currentSitterId));
      setBookings(nextBookings);

      const firstBlock = nextBlocks
        .filter((block) => block.sitterId === currentSitterId)
        .sort((a, b) => a.start.localeCompare(b.start))[0];

      if (firstBlock) {
        setCalendarMonth(new Date(`${firstBlock.start.slice(0, 7)}-01T00:00:00`));
      }

      setAccessState("allowed");
    }

    void load();
  }, []);

  const sitterBookings = bookings.filter((booking) => booking.sitterId === sitterId);
  const activeSitterBookings = sitterBookings.filter((booking) => booking.status !== "cancelled");
  const bookedHours = activeSitterBookings.reduce((total, booking) => {
    return total + (new Date(booking.end).getTime() - new Date(booking.start).getTime()) / 3600000;
  }, 0);
  const openHours = blocks.reduce((total, block) => {
    return total + getBlockDurationHours(block);
  }, 0);

  if (accessState === "checking") {
    return (
      <main className="min-h-screen bg-[#f7f4f1] px-6 py-16 text-center text-[#53605a]">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-center justify-center gap-3">
            <Image src="/sitterbook-app-icon.svg" alt="SitterBook icon" width={40} height={40} className="h-10 w-10" />
            <Image src="/sitterbook-wordmark.svg" alt="SitterBook" width={180} height={44} className="h-8 w-auto" />
          </div>
          Checking sitter access…
        </div>
      </main>
    );
  }

  if (accessState === "denied") {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center bg-[#f7f4f1] px-6 py-16 text-center">
        <div className="w-full rounded-[2rem] border border-[#1a2d2a]/10 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center justify-center gap-3">
            <Image src="/sitterbook-app-icon.svg" alt="SitterBook icon" width={40} height={40} className="h-10 w-10" />
            <Image src="/sitterbook-wordmark.svg" alt="SitterBook" width={180} height={44} className="h-8 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-[#1a2d2a]">Sitter access required</h1>
          <p className="mt-3 text-[#53605a]">Sign in with an approved sitter account to manage availability.</p>
          <Link href="/auth" className="mt-6 inline-flex rounded-full bg-[#e86e52] px-5 py-3 text-sm font-semibold text-[#1a2d2a]">Go to sign-in</Link>
        </div>
      </main>
    );
  }

  function startNewBlock() {
    setEditingId(null);
    setDraft(emptyDraft);
    document.getElementById("availability-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function startEditing(block: AvailabilityBlock) {
    setEditingId(block.id);
    setDraft(blockToDraft(block));
    document.getElementById("availability-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function saveBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = `${draft.date}T${draft.startTime}:00`;
    const end = `${draft.date}T${draft.endTime}:00`;

    if (!draft.label.trim() || new Date(end) <= new Date(start)) {
      return;
    }

    const nextBlock = {
      ...(editingId ? { id: editingId } : {}),
      start,
      end,
      status: "open" as const,
      label: draft.label.trim(),
    };

    const response = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextBlock),
    });

    if (!response.ok) {
      return;
    }

    const saved = (await response.json()) as AvailabilityBlock;
    setBlocks((current) => {
      if (editingId) {
        return current.map((block) => (block.id === editingId ? saved : block));
      }

      return [...current, saved];
    });

    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function removeBlock(blockId: string) {
    if (activeSitterBookings.some((booking) => booking.availabilityId === blockId)) {
      return;
    }

    const response = await fetch(`/api/availability?id=${encodeURIComponent(blockId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      return;
    }

    setBlocks((current) => current.filter((block) => block.id !== blockId));
  }

  async function shareBlock(blockId: string) {
    const shareUrl = `${window.location.origin}/parents?availability=${blockId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      return;
    }

    setSharedId(blockId);
    window.setTimeout(() => setSharedId(null), 1800);
  }

  return (
    <main className="min-h-screen bg-[#f7f4f1]">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="flex items-center gap-3">
            <Image src="/sitterbook-app-icon.svg" alt="SitterBook icon" width={42} height={42} className="h-11 w-11" />
            <Image src="/sitterbook-wordmark.svg" alt="SitterBook" width={190} height={44} className="h-8 w-auto" />
          </div>
          <button onClick={startNewBlock} className="rounded-full bg-[#e86e52] px-5 py-3 text-sm font-semibold text-[#1a2d2a] shadow-lg shadow-[#e86e52]/20 transition hover:bg-[#ef876d]">
            + New availability
          </button>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Open this week</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{openHours}h</p>
            <p className="mt-1 text-sm text-emerald-600">{blocks.length} published windows</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Booked time</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{bookedHours}h</p>
            <p className="mt-1 text-sm text-violet-600">{activeSitterBookings.length} family bookings</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Next booking</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{activeSitterBookings[0]?.parentName ?? "No bookings"}</p>
            <p className="mt-1 text-sm text-slate-500">{activeSitterBookings[0] ? formatDate(activeSitterBookings[0].start) : "Your schedule is open"}</p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Monthly view</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Your availability at a glance</h2>
              <p className="mt-1 text-sm text-slate-500">See this month and step forward to plan next month.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Previous
              </button>
              <p className="min-w-32 text-center text-sm font-bold text-slate-900">
                {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                className="rounded-full bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
              >
                Next month
              </button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() + calendarMonth.getDay() }, (_, index) => {
              if (index < calendarMonth.getDay()) {
                return <div key={`empty-${index}`} className="min-h-24 rounded-2xl bg-slate-50/50" />;
              }

              const day = index - calendarMonth.getDay() + 1;
              const dateValue = dateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
              const dayBlocks = blocks.filter((block) => block.start.slice(0, 10) === dateValue);

              return (
                <div key={dateValue} className="min-h-24 rounded-2xl bg-slate-50 p-2 text-left">
                  <p className="text-sm font-bold text-slate-900">{day}</p>
                  <div className="mt-2 space-y-1">
                    {dayBlocks.length > 0 ? dayBlocks.map((block) => (
                      <a
                        key={block.id}
                        href={googleCalendarUrl(block.label, block.start, block.end, "SitterBook availability window")}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate rounded-lg bg-violet-600 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-violet-500"
                        title="Add to Google Calendar"
                      >
                        {formatTime(block.start)}
                      </a>
                    )) : <p className="text-xs text-slate-300">Open</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Published windows</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Open availability</h2>
              </div>
              <span className="text-sm text-slate-500">{blocks.length} total</span>
            </div>
            <div className="space-y-4">
              {[...blocks].sort((a, b) => a.start.localeCompare(b.start)).map((block) => {
                const blockBookings = activeSitterBookings.filter((booking) => booking.availabilityId === block.id);

                return (
                  <article key={block.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{block.label}</h3>
                          <span className={blockBookings.length > 0 ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700" : "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"}>
                            {blockBookings.length > 0 ? "Partially booked" : "Open"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-600">{formatDate(block.start)}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatTime(block.start)} – {formatTime(block.end)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left sm:text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reserved</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{blockBookings.length ? `${blockBookings.length} family` : "None yet"}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <button onClick={() => startEditing(block)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Edit window</button>
                      <button onClick={() => shareBlock(block.id)} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">{sharedId === block.id ? "Link copied" : "Share with families"}</button>
                      <a
                        href={googleCalendarUrl(block.label, block.start, block.end, "SitterBook availability window")}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Add to Google Calendar
                      </a>
                      <button onClick={() => removeBlock(block.id)} disabled={blockBookings.length > 0} className="rounded-full px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300">Remove</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="space-y-8">
            <section id="availability-form" className="rounded-3xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">{editingId ? "Update window" : "Add a window"}</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{editingId ? "Edit availability" : "Create availability"}</h2>
              <form onSubmit={saveBlock} className="mt-5 space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Window name
                  <input required value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none ring-violet-200 transition focus:ring-4" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Date
                  <input required type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none ring-violet-200 transition focus:ring-4" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Starts
                    <input required type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none ring-violet-200 transition focus:ring-4" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Ends
                    <input required type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none ring-violet-200 transition focus:ring-4" />
                  </label>
                </div>
                <button type="submit" className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">{editingId ? "Save changes" : "Publish availability"}</button>
                {editingId && <button type="button" onClick={startNewBlock} className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/70">Cancel editing</button>}
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Upcoming</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Confirmed bookings</h2>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">{activeSitterBookings.length}</span>
              </div>
              <div className="mt-5 space-y-3">
                {activeSitterBookings.map((booking) => (
                  <div key={booking.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{booking.parentName}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(booking.start)}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatTime(booking.start)} – {formatTime(booking.end)}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">{booking.status}</span>
                    </div>
                    {booking.notes && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"><span className="font-semibold">Family notes:</span> {booking.notes}</p>}
                    <a
                      href={googleCalendarUrl(`SitterBook: ${booking.parentName}`, booking.start, booking.end, "Confirmed SitterBook booking")}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Add booking to Google Calendar
                    </a>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
