import { ArrowRight, BookOpen, CheckCircle2, FileText, Mic2, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { AppBrand } from "@/components/layout/app-brand";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    description: "Dictez les travaux depuis votre smartphone. Nalto structure les lignes que vous gardez ensuite sous contrôle.",
    icon: Mic2,
    title: "Parlez plutôt que saisir",
  },
  {
    description: "Centralisez les coordonnées et les chantiers de vos clients dans un espace simple.",
    icon: Users,
    title: "Retrouvez vos clients",
  },
  {
    description: "Enregistrez vos prestations et vos prix pour les réutiliser rapidement dans chaque devis.",
    icon: BookOpen,
    title: "Travaillez avec vos tarifs",
  },
];

export default function Home() {
  return (
    <main className="min-h-svh bg-[#F5F1E8]">
      <header className="border-b border-border bg-[#F5F1E8]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppBrand href="/" />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/connexion">Se connecter</Link></Button>
            <Link
              className="hidden h-9 items-center justify-center rounded-xl bg-[#E8672E] px-4 text-sm font-semibold text-white transition hover:bg-[#D95E27] sm:inline-flex"
              href="/inscription"
            >
              Essayer Nalto
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
        <div className="max-w-2xl space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D8CDBD] bg-[#FFFCF6] px-3 py-1.5 text-xs font-semibold text-[#17382D]">
            <Mic2 className="size-3.5 text-[#E8672E]" /> Pensé pour les artisans du bâtiment
          </span>
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-[#17382D] sm:text-6xl">
              Vos devis se font sur le chantier.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Dictez les travaux depuis votre téléphone. Nalto transforme vos mots en devis structuré, prêt à vérifier et envoyer.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-6 text-sm font-semibold text-white transition hover:bg-[#D95E27]"
              href="/inscription"
            >
              Créer mon premier devis <ArrowRight className="size-4" />
            </Link>
            <Button asChild size="lg" variant="outline"><Link href="/connexion">J’ai déjà un compte</Link></Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#397255]" /> Vos prix restent les vôtres</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#397255]" /> Données sécurisées</span>
            <span className="flex items-center gap-2"><FileText className="size-4 text-[#397255]" /> PDF professionnel</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[#D8CDBD]/35 blur-3xl" />
          <article className="overflow-hidden rounded-3xl border border-[#315247] bg-[#17382D] shadow-xl">
            <div className="border-b border-white/10 px-5 py-4 text-[#F5F1E8]">
              <p className="text-xs font-medium text-[#F5F1E8]/60">Devis en cours</p>
              <p className="font-semibold">Rénovation électrique — Martin</p>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="rounded-2xl border border-white/10 bg-white/7 p-4 text-[#F5F1E8]">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#E8672E] text-white"><Mic2 className="size-5" /></span>
                  <div>
                    <p className="text-xs text-[#F5F1E8]/55">Vous dites</p>
                    <p className="mt-0.5 text-sm font-medium">« Ajoute 6 prises, 3 interrupteurs et 8 spots. »</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#FFFCF6] p-4 text-[#18201C]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#626A64]">Lignes du devis</p>
                  <span className="rounded-full bg-[#ECE7DD] px-2.5 py-1 text-xs font-medium text-[#17382D]">TVA 20 %</span>
                </div>
                {[{ label: "Prise de courant", qty: "6 u." }, { label: "Interrupteur simple", qty: "3 u." }, { label: "Spot LED encastré", qty: "8 u." }].map((line) => (
                  <div className="flex items-center justify-between border-t border-border py-3 first:border-t-0" key={line.label}>
                    <p className="text-sm font-medium">{line.label}</p>
                    <p className="text-sm text-muted-foreground">{line.qty}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-[#F5F1E8]">
                <CheckCircle2 className="size-5 shrink-0 text-[#E8672E]" />
                <p className="text-sm">Le devis avance pendant que vous êtes encore sur le terrain.</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-border bg-[#FFFCF6]">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8 lg:py-16">
          {benefits.map(({ description, icon: Icon, title }) => (
            <article className="rounded-2xl border border-border bg-[#F5F1E8] p-5" key={title}>
              <span className="inline-flex rounded-xl bg-[#17382D] p-2.5 text-[#F5F1E8]"><Icon className="size-5" /></span>
              <h2 className="mt-4 text-lg font-semibold text-[#17382D]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span className="font-semibold uppercase tracking-[0.2em] text-[#17382D]">NALTO</span>
        <span>Du chantier au devis, sans repasser au bureau.</span>
        <span>Une création Localia.</span>
      </footer>
    </main>
  );
}
