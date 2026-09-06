"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RegistrationRequest } from "@/lib/registration";

type Profile = {
  name: string;
  email: string;
  primaryContactName: string;
  primaryPhone: string;
  secondaryContactName: string;
  secondaryPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  additionalInfo: string;
};

function emptyProfile(name: string, email: string): Profile {
  return {
    name,
    email,
    primaryContactName: "",
    primaryPhone: "",
    secondaryContactName: "",
    secondaryPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    additionalInfo: "",
  };
}

async function fetchRegistrationByEmail(email: string) {
  const requests = await fetch("/api/registrations").then((response) =>
    response.json() as Promise<RegistrationRequest[]>,
  );

  return requests.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export default function AuthPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [request, setRequest] = useState<RegistrationRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      const response = await fetch("/api/session");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { session: Profile & { role?: string }; status: string };

      if (data.session.role === "admin") {
        router.replace("/admin");
        return;
      }

      if (data.session.role === "sitter") {
        router.replace("/dashboard");
        return;
      }

      const currentRequest = await fetchRegistrationByEmail(data.session.email);

      if (data.status === "approved") {
        router.replace("/parents");
        return;
      }

      setProfile(currentRequest ? { ...emptyProfile(currentRequest.name, currentRequest.email), ...currentRequest } : emptyProfile(data.session.name, data.session.email));
      setRequest(currentRequest);
    }

    void restoreSession();
  }, [router]);

  async function continueWithGoogle() {
    const nextProfile = emptyProfile("The New Family", "newfamily@sitterbook.app");
    const existing = await fetchRegistrationByEmail(nextProfile.email);

    if (existing?.status === "approved") {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });

      if (response.ok) {
        router.replace("/parents");
      }
      return;
    }

    setProfile(nextProfile);
    setRequest(existing ?? null);
  }

  function continueWithDemoProfile() {
    void continueWithGoogle();
  }

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, provider: "google" }),
    });

    const nextRequest = (await response.json()) as RegistrationRequest;
    const sessionResponse = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setRequest(nextRequest);
    if (nextRequest.status === "approved" && sessionResponse.ok) {
      router.replace("/parents");
    }
    setIsSubmitting(false);
  }

  const isApproved = request?.status === "approved";

  return (
    <main className="min-h-screen bg-[#f7f4f1] px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="SitterBook home">
            <Image src="/sitterbook-app-icon.svg" alt="SitterBook icon" width={40} height={40} className="h-10 w-10" />
            <Image src="/sitterbook-wordmark.svg" alt="SitterBook" width={180} height={44} className="h-8 w-auto" />
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#53605a] transition hover:text-[#1a2d2a]">Back home</Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e86e52]">Family access</p>
            <h1 className="mt-4 max-w-lg text-4xl font-black tracking-[-0.05em] text-[#1a2d2a] sm:text-5xl">Join a trusted babysitting circle.</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-[#53605a]">Sign in with the account your family uses. An admin reviews each new family before booking access is enabled.</p>
            <div className="mt-8 space-y-3 text-sm text-[#53605a]">
              <p className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dfece5] font-bold text-[#1a2d2a]">1</span>Sign in with Google</p>
              <p className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dfece5] font-bold text-[#1a2d2a]">2</span>Admin reviews your request</p>
              <p className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dfece5] font-bold text-[#1a2d2a]">3</span>Book once your family is approved</p>
            </div>
          </div>

          <section className="mx-auto w-full max-w-md rounded-[2rem] border border-[#1a2d2a]/10 bg-white p-7 shadow-[0_24px_60px_rgba(26,45,42,0.10)] sm:p-9">
            {isApproved ? (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfece5] text-xl text-[#1a2d2a]">✓</span>
                <h2 className="mt-6 text-2xl font-bold text-[#1a2d2a]">You&apos;re approved</h2>
                <p className="mt-3 leading-7 text-[#53605a]">Your family can now browse open sitter windows and request a booking.</p>
                <Link href="/parents" className="mt-7 block rounded-xl bg-[#e86e52] px-4 py-3 text-center text-sm font-semibold text-[#1a2d2a] transition hover:bg-[#ef876d]">Explore availability</Link>
              </div>
            ) : request ? (
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2ead7] text-xl text-[#1a2d2a]">⌛</span>
                <h2 className="mt-6 text-2xl font-bold text-[#1a2d2a]">Approval is pending</h2>
                <p className="mt-3 leading-7 text-[#53605a]">We sent your request to the SitterBook admin. You&apos;ll be able to book once your family is approved.</p>
                <div className="mt-6 rounded-2xl bg-[#f7f4f1] p-4">
                  <p className="font-semibold text-[#1a2d2a]">{request.name}</p>
                  <p className="mt-1 text-sm text-[#53605a]">{request.email}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#e86e52]">Pending review</p>
                </div>
                <Link href="/" className="mt-6 block text-center text-sm font-semibold text-[#53605a] transition hover:text-[#1a2d2a]">Return home</Link>
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
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="text-sm font-semibold text-slate-900">Primary contact</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input required aria-label="Primary contact name" value={profile.primaryContactName} onChange={(event) => setProfile({ ...profile, primaryContactName: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                    <input required type="tel" aria-label="Primary contact phone" value={profile.primaryPhone} onChange={(event) => setProfile({ ...profile, primaryPhone: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                  </div>
                </div>
                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-900">Secondary contact <span className="font-normal text-slate-400">(optional)</span></p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input aria-label="Secondary contact name" value={profile.secondaryContactName} onChange={(event) => setProfile({ ...profile, secondaryContactName: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                    <input type="tel" aria-label="Secondary contact phone" value={profile.secondaryPhone} onChange={(event) => setProfile({ ...profile, secondaryPhone: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                  </div>
                </div>
                <div className="mt-5">
                  <p className="text-sm font-semibold text-slate-900">Home address</p>
                  <div className="mt-3 space-y-3">
                    <input required aria-label="Street address" value={profile.addressLine1} onChange={(event) => setProfile({ ...profile, addressLine1: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                    <input aria-label="Apartment or unit" value={profile.addressLine2} onChange={(event) => setProfile({ ...profile, addressLine2: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.9fr)]">
                      <input required aria-label="City" value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} className="min-w-0 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                      <input required aria-label="State" value={profile.state} onChange={(event) => setProfile({ ...profile, state: event.target.value })} className="min-w-0 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                      <input required aria-label="Postal code" value={profile.postalCode} onChange={(event) => setProfile({ ...profile, postalCode: event.target.value })} className="min-w-0 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                    </div>
                  </div>
                </div>
                <label className="mt-5 block text-sm font-semibold text-slate-700">
                  Anything the sitter should know? <span className="font-normal text-slate-400">(optional)</span>
                  <textarea rows={3} value={profile.additionalInfo} onChange={(event) => setProfile({ ...profile, additionalInfo: event.target.value })} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none ring-violet-200 focus:ring-4" />
                </label>
                <button disabled={isSubmitting} className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">Send approval request</button>
              </form>
            ) : (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Welcome</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Sign in to get started</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">New families are held for admin approval before they can make bookings.</p>
                <a href="/api/auth/google" className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"><span className="text-base font-bold text-blue-300">G</span> Continue with Google</a>
                <button onClick={continueWithDemoProfile} className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Use development profile</button>
                <p className="mt-5 text-center text-xs leading-5 text-slate-400">Google OAuth requires credentials in the server environment. Development access remains available locally.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}