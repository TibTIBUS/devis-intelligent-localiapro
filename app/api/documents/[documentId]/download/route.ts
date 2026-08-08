import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const parsedDocumentId = z.uuid().safeParse((await params).documentId);
  if (!parsedDocumentId.success) {
    return NextResponse.json({ error: "Identifiant de document invalide." }, { status: 400 });
  }
  const documentId = parsedDocumentId.data;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: document, error } = await supabase
    .from("documents")
    .select("storage_bucket, storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !document) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const { data: signed, error: signedError } = await createAdminClient()
    .storage.from(document.storage_bucket).createSignedUrl(document.storage_path, 300);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "Lien de téléchargement indisponible." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
