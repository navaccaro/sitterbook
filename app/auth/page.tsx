"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  demoRegistrationRequests,
  registrationStorageKey,
  type RegistrationRequest,
} from "@/lib/registration";

type Profile = {
  name: string;
  email: string;
};

const authStorageKey = "sitterbook.authenticatedFamily";

function readRequests() {
  const stored = window.localStorage.getItem(registrationStorageKey);

  if (!stored) {
    return demoRegistrationRequests;
  }

  try {
    return JSON.parse(stored) as RegistrationRequest[];
  } catch {
    return demoRegistrationRequests;
  }
}

function saveRequests(requests: RegistrationRequest[]) {
  window.localStorage.setItem(registrationStorageKey, JSON.stringify(requests));
}

export default function AuthPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [request, setRequest] = useState<RegistrationRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function restoreSession() {
      const storedSession = window.localStorage.getItem(authStorageKey);

      if (!storedSession) {
        return;
      }

      try {
        const session = JSON.parse(storedSession) as RegistrationRequest;
        const currentRequest = readRequests().find((item) => item.email === session.email) ?? session;

        if (currentRequest.status === "approved") {
          router.replace("/parents");
          return;
        }

        setProfile({ name: currentRequest.name, email: currentRequest.email });
        setRequest(currentRequest);
      } catch {
        window.localStorage.removeItem(authStorageKey);
      }
    }

    restoreSession();
    window.addEventListener("storage", restoreSession);

    return () => window.removeEventListener("storage", restoreSession);
  }, [router]);

  function continueWithGoogle() {
    const nextProfile = { name: "The New Family", email: "new.family@example.com" };
    const existing = readRequests().find((item) => item.email === nextProfile.email);

    if (existing?.status === "approved") {
      window.localStorage.setItem(authStorageKey, JSON.stringify(existing));
      router.replace("/parents");
      return;
    }

    setProfile(nextProfile);
    setRequest(existing ?? null);
  }

  function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setIsSubmitting(true);
    const existing = readRequests().find((item) => item.email === profile.email);

    if (existing?.status === "approved") {
      window.localStorage.setItem(authStorageKey, JSON.stringify(existing));
      setRequest(existing);
      router.replace("/parents");
      setIsSubmitting(false);
      return;
    }

    const nextRequest: RegistrationRequest = existing ?? {
      id: `request-${Date.now()}`,
      name: profile.name,
      email: profile.email,
      provider: "google",
      status: "pending",
      requestedAt: new Date().toISOString(),
    };
    const nextRequests = existing
      ? readRequests().map((item) => (item.id === existing.id ? { ...item, name: profile.name, status: "pending" as const } : item))
      : [...readRequests(), nextRequest];

    saveRequests(nextRequests);
    window.localStorage.setItem(authStorageKey, JSON.stringify(nextRequest));
    setRequest(nextRequest);
    setIsSubmitting(false);
  }

  const isApproved = request?.status === "approved";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f5ff,_#f4f7ff_42%,_#eef2ff_100%)] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">SB</span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">SitterBook</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-500 transition hover:text-slate-900">Back home</Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-600">Family access</p>
            <h1 className="mt-4 max-w-lg text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Join a trusted babysitting circle.</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">Sign in with the account your family uses. An admin reviews each new family before booking access is enabled.</p>
            <div className="mt-8 space-y-3 text-sm text-slate-600">
              <p className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">1</span>Sign in with Google</p>
              <p className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">2</span>Admin reviews your request</p>
              <p className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">3</span>Book once your family is approved</p>
            </div>
          </div>

          <section className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:p-9">
            {isApproved ? (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</span>
                <h2 className="mt-6 text-2xl font-bold text-slate-900">You&apos;re approved</h2>
                <p className="mt-3 leading-7 text-slate-600">Your family can now browse open sitter windows and request a booking.</p>
                <Link href="/parents" className="mt-7 block rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700">Explore availability</Link>
              </div>
            ) : request ? (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700">⌛</span>
                <h2 className="mt-6 text-2xl font-bold text-slate-900">Approval is pending</h2>
                <p className="mt-3 leading-7 text-slate-600">We sent your request to the SitterBook admin. You&apos;ll be able to book once your family is approved.</p>
                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{request.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{request.email}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-600">Pending review</p>
                </div>
                <Link href="/" className="mt-6 block text-center text-sm font-semibold text-slate-500 transition hover:text-slate-900">Return home</Link>
              </div>
            ) : profile ? (
              <form onSubmit={submitRegistration}>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Google profile</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Confirm your family details</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">These details will be shared with the admin reviewing your access request.</p>
                <label className="mt-6 block text-sm font-semibold text-slate-700">
                  Family name
                  <input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                </label>
                <label className="mt-4 block text-sm font-semibold text-slate-700">
                  Google email
                  <input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                </label>
                <button disabled={isSubmitting} className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">Send approval request</button>
              </form>
            ) : (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Welcome</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Sign in to get started</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">New families are held for admin approval before they can make bookings.</p>
                <button onClick={continueWithGoogle} className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"><span className="text-base font-bold text-blue-600">G</span> Continue with Google</button>
                <p className="mt-5 text-center text-xs leading-5 text-slate-400">OAuth demo mode. Connect Google credentials before production use.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}