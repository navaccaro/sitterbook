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