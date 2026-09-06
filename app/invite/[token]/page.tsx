"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

const pendingInviteStorageKey = "sitterbook.pendingInvite";

type Status = "checking" | "signed-out" | "not-approved" | "joined" | "error";

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [sitterName, setSitterName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const inviteResponse = await fetch(`/api/invites/${token}`);

      if (!inviteResponse.ok) {
        setStatus("error");
        setErrorMessage("This invite link is no longer valid.");
        return;
      }

      const invite = (await inviteResponse.json()) as { sitterName: string };
      setSitterName(invite.sitterName);

      const sessionResponse = await fetch("/api/session");

      if (!sessionResponse.ok) {
        window.localStorage.setItem(pendingInviteStorageKey, token);
        setStatus("signed-out");
        return;
      }

      const sessionData = (await sessionResponse.json()) as { status: string };

      if (sessionData.status !== "approved") {
        window.localStorage.setItem(pendingInviteStorageKey, token);
        setStatus("not-approved");
        return;
      }

      const acceptResponse = await fetch(`/api/invites/${token}`, { method: "POST" });

      if (!acceptResponse.ok) {
        const data = (await acceptResponse.json()) as { error?: string };
        setStatus("error");
        setErrorMessage(data.error ?? "Unable to join this circle.");
        return;
      }

      window.localStorage.removeItem(pendingInviteStorageKey);
      setStatus("joined");
      window.setTimeout(() => router.replace("/parents"), 1200);
    }

    void run();
  }, [token, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center bg-[#f7f4f1] px-6 py-16">
      <div className="w-full rounded-[2rem] border border-[#1a2d2a]/10 bg-white p-8 text-center shadow-sm">
        <div className="mb-5 flex items-center justify-center gap-3">
          <Logo className="h-8" />
        </div>

        {status === "checking" && <h1 className="mt-3 text-2xl font-bold text-[#1a2d2a]">Checking your invite…</h1>}

        {status === "joined" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e86e52]">Welcome</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1a2d2a]">You&apos;re connected with {sitterName}.</h1>
            <p className="mt-4 text-lg text-[#53605a]">Taking you to your availability…</p>
          </>
        )}

        {status === "signed-out" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e86e52]">You&apos;re invited</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1a2d2a]">Join {sitterName}&apos;s circle on SitterBook.</h1>
            <p className="mt-4 text-lg text-[#53605a]">Sign in to connect. We&apos;ll add {sitterName} to your circle right after.</p>
            <Link href="/auth" className="mt-8 inline-flex rounded-full bg-[#e86e52] px-6 py-3 text-sm font-semibold text-[#1a2d2a] transition hover:bg-[#ef876d]">Go to sign-in</Link>
          </>
        )}

        {status === "not-approved" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e86e52]">Almost there</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1a2d2a]">Your family&apos;s approval is still pending.</h1>
            <p className="mt-4 text-lg text-[#53605a]">Once an admin approves your family, we&apos;ll connect you with {sitterName} automatically.</p>
            <Link href="/auth" className="mt-8 inline-flex rounded-full bg-[#e86e52] px-6 py-3 text-sm font-semibold text-[#1a2d2a] transition hover:bg-[#ef876d]">Check your status</Link>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Invite unavailable</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1a2d2a]">{errorMessage}</h1>
            <Link href="/" className="mt-8 inline-flex rounded-full bg-[#e86e52] px-6 py-3 text-sm font-semibold text-[#1a2d2a] transition hover:bg-[#ef876d]">Return home</Link>
          </>
        )}
      </div>
    </main>
  );
}
