import { Buffer } from "node:buffer";

import { Image as ImageIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoUploadForm } from "@/components/organization/logo-upload-form";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { uploadOrganizationLogo } from "@/lib/storage/actions";
import { getOrganizationLogoPath, organizationAssetsBucket } from "@/lib/storage/organization-logo";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationLogoPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const { data: logoFile } = await supabase.storage
    .from(organizationAssetsBucket)
    .download(getOrganizationLogoPath(organizationId));

  let logoDataUrl: string | null = null;
  if (logoFile) {
    const bytes = Buffer.from(await logoFile.arrayBuffer());
    logoDataUrl = `data:${logoFile.type || "image/png"};base64,${bytes.toString("base64")}`;
  }

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-primary">Entreprise</p>
            <h1 className="text-3xl font-semibold tracking-tight">Logo de l’entreprise</h1>
            <p className="text-sm text-muted-foreground">Le logo enregistré est utilisé sur vos devis et dans votre espace de travail.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-lg border border-border bg-background px-3 py-2 font-medium hover:bg-muted" href="/entreprise/informations-legales">Informations légales</Link>
            <Link className="rounded-lg border border-border bg-background px-3 py-2 font-medium hover:bg-muted" href="/entreprise/assurances">Assurances</Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><ImageIcon className="size-5" /></span><div><h2 className="text-xl font-semibold">Logo actuel</h2><p className="text-sm text-muted-foreground">Aperçu du fichier associé à votre entreprise.</p></div></div>
            {logoDataUrl ? (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-muted/20 p-6">
                <div aria-label="Logo actuel de l’entreprise" className="h-44 w-full bg-contain bg-center bg-no-repeat" role="img" style={{ backgroundImage: `url(${logoDataUrl})` }} />
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center"><ImageIcon className="size-10 text-muted-foreground" /><p className="mt-3 font-medium">Aucun logo enregistré</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Ajoutez un logo pour personnaliser vos prochains devis.</p></div>
            )}
          </section>

          <section className="h-fit rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Sparkles className="size-5" /></span><div><h2 className="text-xl font-semibold">{logoDataUrl ? "Remplacer le logo" : "Ajouter un logo"}</h2><p className="text-sm text-muted-foreground">JPEG, PNG ou WebP, 2 Mo maximum.</p></div></div>
            <LogoUploadForm action={uploadOrganizationLogo} />
            <p className="mt-4 text-xs leading-5 text-muted-foreground">Le remplacement conserve le même emplacement sécurisé : vos prochains documents utiliseront automatiquement le nouveau logo.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
