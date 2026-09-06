import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/secrets";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a value using the development fallback key", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
    vi.stubEnv("NODE_ENV", "test");

    const encrypted = encryptSecret("super-secret-token");
    expect(encrypted).not.toBe("super-secret-token");
    expect(decryptSecret(encrypted)).toBe("super-secret-token");
  });

  it("round-trips a value using an explicit TOKEN_ENCRYPTION_KEY", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "a-configured-secret");

    const encrypted = encryptSecret("access-token-value");
    expect(decryptSecret(encrypted)).toBe("access-token-value");
  });

  it("produces different ciphertext for the same value on repeated calls", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "a-configured-secret");

    const first = encryptSecret("same-value");
    const second = encryptSecret("same-value");

    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe("same-value");
    expect(decryptSecret(second)).toBe("same-value");
  });

  it("throws when configured in production without TOKEN_ENCRYPTION_KEY", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => encryptSecret("anything")).toThrow("TOKEN_ENCRYPTION_KEY must be configured in production.");
  });

  it("throws on a malformed encrypted value", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "a-configured-secret");

    expect(() => decryptSecret("not-a-valid-payload")).toThrow("Invalid encrypted secret.");
    expect(() => decryptSecret("v1:onlytwo")).toThrow("Invalid encrypted secret.");
  });

  it("fails to decrypt a value produced with a different key", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "key-one");
    const encrypted = encryptSecret("value");

    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "key-two");
    expect(() => decryptSecret(encrypted)).toThrow();
  });
});
