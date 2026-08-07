import type { User } from "@supabase/supabase-js";

type UserWithIdentities = Pick<User, "id" | "identities">;

export function hasConsistentIdentityOwnership(
  user: UserWithIdentities,
): boolean {
  const identities = user.identities ?? [];

  return identities.length > 0 && identities.every(
    (identity) => identity.user_id === user.id,
  );
}
