import Link from "next/link";

import { Button } from "@/components/ui/button";

const benefits = [
  {
    title: "Des devis professionnels",
    description: "Présentez vos prestations et vos totaux dans un document clair.",
  },
  {
    title: "Un espace simple",
    description: "Retrouvez vos clients, votre catalogue et vos devis au même endroit.",
  },
  {
    title: "Pensé pour les artisans",
    description: "Gagnez du temps sur l'administratif et concentrez-vous sur vos chantiers.",
  },
];

export default function Home() {
  return (
    <main className="min-h-svh bg-muted/30">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <Link className="text-base font-semibold tracking-tight" href="/">
          Localiapro.fr
        </Link>
        <Button asChild variant="outline">
          <Link href="/connexion">Se connecter</Link>
        </Button>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-20">
        <div className="max-w-2xl space-y-8">
          <div className="space-y-5">
            <p className="text-sm font-medium text-muted-foreground">
              Devis Intelligent · Localiapro.fr
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Des devis clairs, créés en quelques minutes.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Préparez vos devis, retrouvez vos clients et gardez vos prestations
              organisées dans un espace conçu pour les artisans du bâtiment.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/inscription">Créer mon compte</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/connexion">J&apos;ai déjà un compte</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Un espace sécurisé pour commencer simplement.
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between border-b pb-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Votre espace</p>
              <p className="mt-1 text-xl font-semibold">Devis du jour</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              En préparation
            </span>
          </div>
          <div className="space-y-4 py-6">
            {[
              ["Client", "Maison Martin"],
              ["Prestation", "Rénovation de salle de bains"],
              ["Total HT", "2 480,00 €"],
            ].map(([label, value]) => (
              <div className="flex items-start justify-between gap-4" key={label}>
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-right text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
            Vos informations restent organisées pour vous aider à avancer plus vite.
          </div>
        </div>
      </section>

      <section className="border-t bg-background">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-14 sm:grid-cols-3 lg:px-8 lg:py-16">
          {benefits.map((benefit) => (
            <article className="space-y-2" key={benefit.title}>
              <h2 className="font-semibold tracking-tight">{benefit.title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{benefit.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8 text-sm text-muted-foreground lg:px-8">
        Devis Intelligent par Localiapro.fr
      </footer>
    </main>
  );
}
