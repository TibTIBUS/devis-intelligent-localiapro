import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-xl space-y-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Localiapro.fr
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Devis Intelligent
        </h1>
        <p className="text-balance text-base text-muted-foreground sm:text-lg">
          Le socle de l’application est prêt. Les parcours métier seront ajoutés
          ticket par ticket.
        </p>
        <Button type="button" disabled>
          Bientôt disponible
        </Button>
      </section>
    </main>
  );
}
