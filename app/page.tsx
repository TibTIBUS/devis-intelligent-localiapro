import { ArrowRight, BookOpen, CheckCircle2, FileText, Mic2, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { AppBrand } from "@/components/layout/app-brand";
import { Button } from "@/components/ui/button";

const benefits = [
  { description: "Dictez vos prestations depuis votre smartphone et confirmez avant chaque action.", icon: Mic2, title: "Créez vos devis à la voix" },
  { description: "Centralisez les coordonnées et les chantiers de vos clients dans un espace simple.", icon: Users, title: "Retrouvez vos clients" },
  { description: "Enregistrez vos prestations et leurs prix pour les retrouver rapidement dans vos devis.", icon: BookOpen, title: "Réutilisez votre catalogue" },
];

export default function Home() {
  return (
    <main className="min-h-svh bg-muted/20">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppBrand href="/" />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/connexion">Se connecter</Link></Button>
            <Button asChild className="hidden sm:inline-flex"><Link href="/inscription">Créer mon compte</Link></Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
        <div className="max-w-2xl space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"><Mic2 className="size-3.5" /> Pensé pour les artisans du bâtiment</span>
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Le devis professionnel qui se construit avec vous.</h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">Créez vos devis au bureau ou à la voix depuis votre smartphone, retrouvez vos clients et utilisez votre propre catalogue de prestations.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/inscription">Créer mon espace <ArrowRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/connexion">J’ai déjà un compte</Link></Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Calculs déterministes</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600" /> Données sécurisées</span>
            <span className="flex items-center gap-2"><FileText className="size-4 text-emerald-600" /> PDF professionnel</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-emerald-100/50 blur-3xl" />
          <article className="overflow-hidden rounded-3xl border border-border bg-background shadow-xl shadow-slate-200/60">
            <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="text-xs font-medium text-muted-foreground">Devis en cours</p><p className="font-semibold">Rénovation électrique — Martin</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Brouillon</span></div>
            <div className="space-y-4 p-5 sm:p-6">
              {[{ label: "Prise de courant", qty: "5 unités", total: "225,00 €" }, { label: "Tableau électrique", qty: "1 forfait", total: "780,00 €" }, { label: "Main-d’œuvre", qty: "8 heures", total: "440,00 €" }].map((line) => <div className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-border p-4" key={line.label}><div><p className="font-medium">{line.label}</p><p className="mt-1 text-xs text-muted-foreground">{line.qty}</p></div><p className="font-semibold">{line.total}</p></div>)}
              <div className="rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-center justify-between text-sm text-slate-300"><span>Total HT</span><span>1 445,00 €</span></div><div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-lg font-semibold"><span>Total TTC</span><span>1 734,00 €</span></div></div>
              <div className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-4 py-4 text-white"><span className="flex size-10 items-center justify-center rounded-full bg-white/15"><Mic2 className="size-5" /></span><div><p className="font-semibold">Continuez à la voix</p><p className="text-xs text-emerald-50">Ajoutez une prestation et voyez le devis évoluer.</p></div></div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-border bg-background">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8 lg:py-16">
          {benefits.map(({ description, icon: Icon, title }) => <article className="rounded-2xl border border-border p-5 shadow-sm" key={title}><span className="inline-flex rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" /></span><h2 className="mt-4 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></article>)}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>Devis Intelligent by Localiapro.fr</span><span>Un outil conçu pour simplifier le quotidien des artisans.</span></footer>
    </main>
  );
}
