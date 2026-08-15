import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

export function TrialBanner({ daysRemaining, expired }: { daysRemaining: number; expired: boolean }) {
  return (
    <div
      className={
        expired
          ? "flex flex-wrap items-center justify-center gap-2 bg-destructive px-4 py-2.5 text-center text-sm font-medium text-white"
          : "flex flex-wrap items-center justify-center gap-2 bg-[#E8672E] px-4 py-2.5 text-center text-sm font-medium text-white"
      }
    >
      {expired ? <AlertTriangle className="size-4 shrink-0" /> : <Clock className="size-4 shrink-0" />}
      <span>
        {expired
          ? "Votre période d’essai gratuite de 14 jours est terminée. Choisissez un abonnement pour continuer à créer et finaliser des devis."
          : daysRemaining <= 1
            ? "Votre essai gratuit se termine aujourd’hui."
            : `Il vous reste ${daysRemaining} jours d’essai gratuit.`}
      </span>
      <Link className="underline underline-offset-2 hover:no-underline" href="/abonnement">
        {expired ? "Choisir un abonnement" : "Voir les abonnements"}
      </Link>
    </div>
  );
}
