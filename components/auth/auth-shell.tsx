import type { ReactNode } from "react";
import { CheckCircle2, Mic2, ShieldCheck } from "lucide-react";

import { AppBrand } from "@/components/layout/app-brand";

export function AuthShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto grid min-h-[calc(100svh-3rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-background shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="[&_span:last-child]:text-slate-400"><AppBrand href="/" /></div>
            <div className="mt-16 max-w-md space-y-4">
              <p className="text-sm font-medium text-emerald-400">Pensé pour les artisans</p>
              <h2 className="text-4xl font-semibold tracking-tight">Vos devis, vos clients et votre catalogue au même endroit.</h2>
              <p className="text-sm leading-6 text-slate-300">Une interface simple pour préparer, dicter et suivre vos devis sans perdre de temps.</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-slate-200">
            <p className="flex items-center gap-3"><Mic2 className="size-4 text-emerald-400" /> Création de devis à la voix</p>
            <p className="flex items-center gap-3"><CheckCircle2 className="size-4 text-emerald-400" /> Calculs et validations côté serveur</p>
            <p className="flex items-center gap-3"><ShieldCheck className="size-4 text-emerald-400" /> Espace sécurisé pour votre entreprise</p>
          </div>
        </aside>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md space-y-7">
            <div className="lg:hidden"><AppBrand href="/" /></div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
            </div>
            <div className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
