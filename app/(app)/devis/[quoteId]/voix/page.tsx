import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { VoiceQuoteAssistant } from "@/components/voice/voice-quote-assistant";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function VoiceQuoteEditorPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .maybeSingle();
  if (error || !quote) notFound();

  return (
    <main className="flex min-h-svh flex-col">
      <div className="px-4 pt-4">
        <Link className="text-sm font-medium underline" href={`/devis/${quoteId}`}>Revenir à l’éditeur complet</Link>
      </div>
      <VoiceQuoteAssistant quoteId={quoteId} />
    </main>
  );
}
