import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { hasConsistentIdentityOwnership } from "@/lib/auth/identities";

function createUser(
  identities: NonNullable<User["identities"]>,
): Pick<User, "id" | "identities"> {
  return {
    id: "86c5f998-3a01-4fc9-9ac4-7581f48bd30f",
    identities,
  };
}

describe("hasConsistentIdentityOwnership", () => {
  it("keeps email/password and Google identities on one canonical user", () => {
    const user = createUser([
      {
        id: "artisan@example.com",
        identity_id: "6172de06-b71c-4521-a0a8-bc687567f03e",
        provider: "email",
        user_id: "86c5f998-3a01-4fc9-9ac4-7581f48bd30f",
      },
      {
        id: "google-user-id",
        identity_id: "31f7a335-28f2-48c6-90e4-1d05f4fc0cbb",
        provider: "google",
        user_id: "86c5f998-3a01-4fc9-9ac4-7581f48bd30f",
      },
    ]);

    expect(hasConsistentIdentityOwnership(user)).toBe(true);
  });

  it("rejects an identity attached to a different user", () => {
    const user = createUser([
      {
        id: "google-user-id",
        identity_id: "31f7a335-28f2-48c6-90e4-1d05f4fc0cbb",
        provider: "google",
        user_id: "9c266f2d-a23f-4e5b-bfed-14f750d8bb75",
      },
    ]);

    expect(hasConsistentIdentityOwnership(user)).toBe(false);
  });

  it("rejects an account without an authentication identity", () => {
    expect(hasConsistentIdentityOwnership(createUser([]))).toBe(false);
  });
});
