export type RegistrationProvider = "google";
export type RegistrationStatus = "pending" | "approved" | "rejected";

export type RegistrationRequest = {
  id: string;
  name: string;
  email: string;
  provider: RegistrationProvider;
  status: RegistrationStatus;
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
  requestedAt: string;
};

export const seedRegistrationRequests: RegistrationRequest[] = [
  {
    id: "request-lopez",
    name: "The Lopez Family",
    email: "lopez@sitterbook.app",
    provider: "google",
    status: "pending",
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
    requestedAt: "2026-09-06T14:30:00.000Z",
  },
];
