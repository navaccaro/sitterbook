export type RegistrationProvider = "google";
export type RegistrationStatus = "pending" | "approved" | "rejected";

export type RegistrationRequest = {
  id: string;
  name: string;
  email: string;
  provider: RegistrationProvider;
  status: RegistrationStatus;
  requestedAt: string;
};

export const registrationStorageKey = "sitterbook.registrationRequests";
export const registrationEvent = "sitterbook:registrations";

export const demoRegistrationRequests: RegistrationRequest[] = [
  {
    id: "request-lopez",
    name: "The Lopez Family",
    email: "lopez@example.com",
    provider: "google",
    status: "pending",
    requestedAt: "2026-09-06T14:30:00.000Z",
  },
];

function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export function readRegistrationRequests(): RegistrationRequest[] {
  if (typeof window === "undefined") {
    return demoRegistrationRequests;
  }

  const stored = window.localStorage.getItem(registrationStorageKey);

  if (!stored) {
    return demoRegistrationRequests;
  }

  try {
    const parsed = JSON.parse(stored) as RegistrationRequest[];
    return Array.isArray(parsed) ? parsed : demoRegistrationRequests;
  } catch {
    return demoRegistrationRequests;
  }
}

export function writeRegistrationRequests(requests: RegistrationRequest[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(registrationStorageKey, JSON.stringify(requests));
  window.dispatchEvent(new Event(registrationEvent));
}

export function getRegistrationRequestByEmail(email: string) {
  return readRegistrationRequests().find(
    (request) => normaliseEmail(request.email) === normaliseEmail(email),
  );
}

export function isFamilyApproved(email: string) {
  return getRegistrationRequestByEmail(email)?.status === "approved";
}

export function upsertRegistrationRequest(
  profile: { name: string; email: string },
  provider: RegistrationProvider = "google",
): RegistrationRequest {
  const requests = readRegistrationRequests();
  const email = normaliseEmail(profile.email);
  const existing = requests.find((request) => normaliseEmail(request.email) === email);

  if (existing) {
    const updated: RegistrationRequest = {
      ...existing,
      name: profile.name.trim() || existing.name,
      email: existing.email,
      provider,
    };
    const nextRequests = requests.map((request) =>
      request.id === existing.id ? updated : request,
    );

    writeRegistrationRequests(nextRequests);
    return updated;
  }

  const nextRequest: RegistrationRequest = {
    id: `request-${Date.now()}`,
    name: profile.name.trim(),
    email: profile.email.trim(),
    provider,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };

  writeRegistrationRequests([...requests, nextRequest]);
  return nextRequest;
}

export function updateRegistrationStatus(
  requestId: string,
  status: RegistrationStatus,
) {
  const requests = readRegistrationRequests();
  const current = requests.find((request) => request.id === requestId);

  if (!current) {
    return null;
  }

  const updated = { ...current, status };
  writeRegistrationRequests(
    requests.map((request) => (request.id === requestId ? updated : request)),
  );
  return updated;
}