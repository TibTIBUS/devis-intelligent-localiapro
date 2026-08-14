import { Buffer } from "node:buffer";

import { redirect } from "next/navigation";

import { LogoUploadForm } from "@/components/organization/logo-upload-form";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { uploadOrganizationLogo } from "@/lib/storage/actions";
import {
  getOrganizationLogoPath,
  organizationAssetsBucket,
} from "@/lib/storage/organization-logo";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationLogoPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  const { data: logoFile } = await supabase.storage
    .from(organizationAssetsBucket)
    .download(getOrganizationLogoPath(organizationId));

  let logoDataUrl: string | null = null;
  if (logoFile) {
    const bytes = Buffer.from(await logoFile.arrayBuffer());
    logoDataUrl = `data:${logoFile.type || "image/png"};base64,${bytes.toString("base64")}`;
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Logo de l’entreprise</h1>
          <p className="text-sm text-muted-foreground">
            Ce logo sera utilisé sur vos prochains devis.
          </p>
        </div>

        {logoDataUrl ? (
          <section className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold">Logo actuel</p>
              <p className="text-xs text-muted-foreground">Le logo enregistré est bien associé à votre entreprise.</p>
            </div>
            <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-muted/20 p-4">
              <div
                aria-label="Logo actuel de l’entreprise"
                className="h-32 w-full bg-contain bg-center bg-no-repeat"
                role="img"
                style={{ backgroundImage: `url(${logoDataUrl})` }}
              />
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Aucun logo enregistré pour le moment.
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-base font-semibold">{logoDataUrl ? "Remplacer le logo" : "Ajouter un logo"}</h2>
          <LogoUploadForm action={uploadOrganizationLogo} />
        </div>
      </section>
    </main>
  );
}
