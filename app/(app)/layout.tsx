import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppNav } from "@/components/layout/app-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) {
    redirect("/connexion");
  }

  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
