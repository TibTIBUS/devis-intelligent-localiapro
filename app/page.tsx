import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Folders,
  Hammer,
  Mic2,
  Send,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppBrand } from "@/components/layout/app-brand";
import { Button } from "@/components/ui/button";
import { formatEuroAmount } from "@/lib/billing/format";
import { getStripePlanPricing, isStripeConfigured } from "@/lib/billing/stripe";
import { TRIAL_DAYS } from "@/lib/billing/trial";

// Les tarifs sont peu volatils : on les relit auprès de Stripe une fois par
// heure plutôt qu'à chaque visite, pour ne jamais afficher un montant écrit
// en dur qui pourrait diverger de ce qui est réellement débité.
export const revalidate = 3600;

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nalto-app.netlify.app";

export const metadata: Metadata = {
  alternates: { canonical: appUrl },
  description:
    "Nalto est le logiciel de devis terrain des artisans du bâtiment. Dictez les travaux sur le chantier, Nalto prépare les lignes du devis avec votre catalogue et vos tarifs. Vous vérifiez avant d’envoyer.",
  openGraph: {
    description: "Dictez les travaux sur le chantier. Nalto prépare le devis. Vous vérifiez avant d’envoyer.",
    locale: "fr_FR",
    siteName: "Nalto",
    title: "Nalto — Le devis terrain des artisans du bâtiment",
    type: "website",
    url: appUrl,
  },
  robots: { follow: true, index: true },
  title: { absolute: "Nalto — Le devis terrain des artisans du bâtiment" },
  twitter: {
    card: "summary",
    description: "Dictez les travaux sur le chantier. Nalto prépare le devis. Vous vérifiez avant d’envoyer.",
    title: "Nalto — Le devis terrain des artisans du bâtiment",
  },
};

const problems = [
  { text: "Notes papier, téléphone, mémoire… il faut ensuite tout remettre au propre.", title: "Tout ressaisir le soir" },
  { text: "Quantités, options et détails du chantier deviennent plus difficiles à retrouver quelques heures plus tard.", title: "Retrouver les bonnes informations" },
  { text: "Plus le devis attend, plus vous perdez du temps administratif et ralentissez votre réponse au client.", title: "Envoyer le devis trop tard" },
];

const steps = [
  { icon: Mic2, number: "01", text: "Décrivez les travaux comme vous le feriez à un collègue.", title: "Dictez" },
  { icon: CheckCircle2, number: "02", text: "Nalto prépare les lignes à partir de votre catalogue et de vos tarifs. Vous gardez la main sur les quantités, prix, TVA et libellés.", title: "Vérifiez" },
  { icon: Send, number: "03", text: "Finalisez le devis et partagez un PDF professionnel avec votre client.", title: "Envoyez" },
];

const control = [
  { text: "Nalto utilise votre catalogue et vos tarifs.", title: "Vos prix" },
  { text: "Chaque quantité peut être vérifiée et corrigée.", title: "Vos quantités" },
  { text: "Vous contrôlez les taux appliqués aux lignes du devis.", title: "Votre TVA" },
  { text: "Vous pouvez modifier les prestations avant la finalisation.", title: "Vos libellés" },
];

const benefits = [
  { description: "Ce que vous avez déjà dit sur le chantier n’a pas besoin d’être retapé une deuxième fois.", icon: Mic2, title: "Moins de ressaisie" },
  { description: "Le travail administratif avance pendant que vous êtes encore chez le client.", icon: Clock3, title: "Des devis commencés plus tôt" },
  { description: "Retrouvez vos prestations et tarifs sans repartir de zéro à chaque devis.", icon: BookOpen, title: "Votre catalogue toujours disponible" },
  { description: "Clients, chantiers et devis restent accessibles dans votre espace Nalto.", icon: Folders, title: "Tout au même endroit" },
  { description: "Finalisez un PDF avec les informations de votre entreprise, votre logo et les mentions nécessaires.", icon: FileText, title: "Un document professionnel" },
];

const trades = [
  "Électriciens",
  "Plombiers",
  "Maçons",
  "Peintres",
  "Menuisiers",
  "Couvreurs",
  "Carreleurs",
  "Chauffagistes",
  "Entreprises de rénovation",
];

export default async function Home() {
  const stripeConfigured = isStripeConfigured();
  const pricing = stripeConfigured ? await getStripePlanPricing().catch(() => null) : null;
  const monthlyLabel = formatEuroAmount(pricing?.monthly.unit_amount ?? null);
  const annualLabel = formatEuroAmount(pricing?.annual.unit_amount ?? null);
  const hasPricing = Boolean(monthlyLabel && annualLabel);

  const faqs: [string, string][] = [
    ["Est-ce que Nalto fixe mes prix ?", "Non. Nalto travaille avec votre catalogue et vos tarifs : aucun prix n’est inventé ni recalculé de son propre chef."],
    ["Puis-je modifier ce que Nalto prépare ?", "Oui. Le devis reste modifiable tant qu’il est en brouillon : quantités, TVA, prix, libellés et informations du client."],
    ["Suis-je obligé d’utiliser la voix ?", "Non. La voix accélère la saisie sur le terrain, mais l’interface classique reste disponible pour créer et modifier vos devis."],
    ["Est-ce adapté à mon métier ?", "Nalto est pensé pour les artisans du bâtiment : électricité, plomberie, maçonnerie, peinture, menuiserie, couverture, carrelage, chauffage et rénovation."],
    ["Est-ce que Nalto envoie le devis sans ma validation ?", "Non. L’envoi est toujours une action que vous déclenchez vous-même, après avoir vérifié les lignes du devis."],
    [
      "Combien coûte Nalto ?",
      hasPricing
        ? `${monthlyLabel} HT par mois, ou ${annualLabel} HT par an. Un essai gratuit de ${TRIAL_DAYS} jours est inclus, sans carte bancaire.`
        : `Un essai gratuit de ${TRIAL_DAYS} jours est disponible, sans carte bancaire. Les tarifs d’abonnement sont détaillés une fois votre espace créé.`,
    ],
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    applicationCategory: "BusinessApplication",
    description: "Logiciel de devis terrain pour les artisans du bâtiment : dictez les travaux sur le chantier, Nalto prépare les lignes du devis.",
    name: "Nalto",
    offers: hasPricing
      ? [
          { "@type": "Offer", name: "Abonnement mensuel", price: (pricing?.monthly.unit_amount ?? 0) / 100, priceCurrency: "EUR" },
          { "@type": "Offer", name: "Abonnement annuel", price: (pricing?.annual.unit_amount ?? 0) / 100, priceCurrency: "EUR" },
        ]
      : undefined,
    operatingSystem: "Web",
    url: appUrl,
  };

  return (
    <main className="min-h-svh bg-[#F5F1E8] text-[#18201C]">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} type="application/ld+json" />
      <header className="sticky top-0 z-40 border-b border-[#DCD8CF] bg-[#F5F1E8]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppBrand href="/" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#626A64] md:flex">
            <a className="hover:text-[#17382D]" href="#fonctionnement">Fonctionnement</a>
            <a className="hover:text-[#17382D]" href="#benefices">Bénéfices</a>
            <a className="hover:text-[#17382D]" href="#tarifs">Tarifs</a>
            <a className="hover:text-[#17382D]" href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/connexion">Se connecter</Link></Button>
            <Link className="hidden h-9 items-center justify-center rounded-xl bg-[#E8672E] px-4 text-sm font-semibold text-white transition hover:bg-[#D95E27] sm:inline-flex" href="/inscription">Essayer Nalto gratuitement</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
        <div className="max-w-2xl space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D8CDBD] bg-[#FFFCF6] px-3 py-1.5 text-xs font-semibold text-[#17382D]"><Hammer className="size-3.5 text-[#E8672E]" /> Le devis terrain des artisans du bâtiment</span>
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-[#17382D] sm:text-6xl">Dictez les travaux. Nalto prépare le devis.</h1>
            <p className="max-w-xl text-lg leading-8 text-[#626A64]">Depuis le chantier, décrivez simplement les travaux à réaliser. Nalto prépare les lignes du devis avec vos tarifs. Vous vérifiez tout avant de l’envoyer.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-6 text-sm font-semibold text-white transition hover:bg-[#D95E27]" href="/inscription">Essayer Nalto gratuitement <ArrowRight className="size-4" /></Link>
            <Button asChild size="lg" variant="outline"><a href="#fonctionnement">Voir comment ça marche</a></Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#626A64]">
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#397255]" /> Vos prix restent les vôtres</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#397255]" /> Tout reste modifiable</span>
            <span className="flex items-center gap-2"><FileText className="size-4 text-[#397255]" /> PDF professionnel</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[#D8CDBD]/35 blur-3xl" />
          <article className="overflow-hidden rounded-3xl border border-[#315247] bg-[#17382D] shadow-xl">
            <div className="border-b border-white/10 px-5 py-4 text-[#F5F1E8]"><p className="text-xs font-medium text-[#F5F1E8]/60">Devis en cours</p><p className="font-semibold">Rénovation électrique — Martin</p></div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="rounded-2xl border border-white/10 bg-white/7 p-4 text-[#F5F1E8]"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-[#E8672E] text-white"><Mic2 className="size-5" /></span><div><p className="text-xs text-[#F5F1E8]/55">Vous dites</p><p className="mt-0.5 text-sm font-medium">« Ajoute 6 prises, 3 interrupteurs et 8 spots dans le séjour. »</p></div></div></div>
              <div className="rounded-2xl bg-[#FFFCF6] p-4 text-[#18201C]"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#626A64]">Nalto prépare</p><span className="rounded-full bg-[#ECE7DD] px-2.5 py-1 text-xs font-medium text-[#17382D]">TVA 20 %</span></div>{[{ label: "Prise de courant", qty: "6 u." }, { label: "Interrupteur simple", qty: "3 u." }, { label: "Spot LED encastré", qty: "8 u." }].map((line) => <div className="flex items-center justify-between border-t border-[#DCD8CF] py-3 first:border-t-0" key={line.label}><p className="text-sm font-medium">{line.label}</p><p className="text-sm text-[#626A64]">{line.qty}</p></div>)}</div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-[#F5F1E8]"><CheckCircle2 className="size-5 shrink-0 text-[#E8672E]" /><p className="text-sm">Rien n’est envoyé automatiquement. Vous vérifiez chaque ligne avant de finaliser.</p></div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-[#DCD8CF] bg-[#17382D] px-4 py-14 text-[#F5F1E8] sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Le problème terrain</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Le devis ne devrait pas commencer une fois rentré chez vous.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#F5F1E8]/70">Quand vous quittez le chantier, vous avez encore les travaux, les quantités et les échanges avec le client en tête. Pourtant, le devis attend souvent le soir ou le lendemain. Nalto vous permet de commencer immédiatement, pendant que toutes les informations sont encore fraîches.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{problems.map(({ text, title }) => <div className="rounded-2xl border border-white/10 bg-white/5 p-5" key={title}><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#F5F1E8]/65">{text}</p></div>)}</div>
        </div>
      </section>

      <section className="bg-[#ECE7DD] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">La démonstration</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Vous parlez. Le devis se construit.</h2><p className="mt-4 max-w-xl text-base leading-7 text-[#626A64]">Vous pouvez demander plusieurs éléments dans la même phrase. Nalto ajoute ce qu’il comprend, avec votre catalogue et vos tarifs.</p></div>
          <div className="rounded-3xl bg-[#17382D] p-6 text-[#F5F1E8] shadow-xl"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full bg-[#E8672E]"><Mic2 className="size-6" /></span><div><p className="text-xs uppercase tracking-[0.16em] text-[#F5F1E8]/50">Vous dites</p><p className="mt-1 font-medium">« Ajoute 4 prises, 2 va-et-vient et passe les spots à 10 % de TVA. »</p></div></div><div className="mt-5 rounded-2xl bg-[#F5F1E8] p-4 text-[#18201C]"><p className="text-sm font-semibold text-[#17382D]">Nalto prépare</p><p className="mt-2 text-sm text-[#626A64]">4 prises, 2 va-et-vient et les spots à 10 % de TVA sont ajoutés au devis.</p></div><p className="mt-4 text-sm font-medium text-[#F5F1E8]/80">Rien n’est envoyé automatiquement. Vous vérifiez chaque ligne avant de finaliser le devis.</p></div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="fonctionnement">
        <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Comment ça marche</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Du chantier au devis en trois étapes.</h2></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{steps.map(({ icon: Icon, number, text, title }) => <article className="rounded-3xl border border-[#DCD8CF] bg-[#FFFCF6] p-6" key={number}><div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#17382D] text-[#F5F1E8]"><Icon className="size-5" /></span><span className="text-sm font-semibold text-[#E8672E]">{number}</span></div><h3 className="mt-6 text-xl font-semibold text-[#17382D]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#626A64]">{text}</p></article>)}</div>
      </section>

      <section className="border-y border-[#DCD8CF] bg-[#FFFCF6] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Le contrôle reste à l’artisan</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Nalto prépare. Vous décidez.</h2><p className="mt-4 text-base leading-7 text-[#626A64]">Votre devis reste votre devis. Nalto accélère la préparation, mais vous gardez le dernier mot avant l’envoi.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{control.map(({ text, title }) => <div className="rounded-2xl border border-[#DCD8CF] bg-white p-5" key={title}><h3 className="font-semibold text-[#17382D]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#626A64]">{text}</p></div>)}</div>
          <p className="mt-8 text-sm font-semibold text-[#17382D]">Aucun devis ne part sans que vous l’ayez vérifié et validé.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="benefices">
        <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Un outil de terrain</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Moins d’administratif une fois la journée terminée.</h2></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{benefits.map(({ description, icon: Icon, title }) => <article className="rounded-2xl border border-[#DCD8CF] bg-[#FFFCF6] p-5" key={title}><span className="inline-flex rounded-xl bg-[#17382D] p-2.5 text-[#F5F1E8]"><Icon className="size-5" /></span><h3 className="mt-4 text-lg font-semibold text-[#17382D]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#626A64]">{description}</p></article>)}</div>
      </section>

      <section className="bg-[#ECE7DD] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex items-center gap-2 text-[#E8672E]"><Users className="size-4" /><p className="text-sm font-semibold uppercase tracking-[0.18em]">Pour qui est Nalto ?</p></div>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Pensé pour les artisans qui font leurs devis sur le terrain.</h2>
          <div className="mt-8 flex flex-wrap gap-3">{trades.map((trade) => <span className="rounded-full border border-[#D8CDBD] bg-[#FFFCF6] px-4 py-2 text-sm font-medium text-[#17382D]" key={trade}>{trade}</span>)}</div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="tarifs">
        <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Tarif</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Un outil simple. Un prix clair.</h2><p className="mt-4 text-base leading-7 text-[#626A64]">{TRIAL_DAYS} jours d’essai gratuit, sans carte bancaire. Vous décidez ensuite si vous continuez.</p></div>

        {hasPricing ? (
          <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
            <div className="rounded-3xl border border-[#17382D]/15 bg-[#FFFCF6] p-6 text-center sm:p-7">
              <p className="text-sm font-semibold text-[#E8672E]">Mensuel</p>
              <div className="mt-3 flex items-end justify-center gap-2"><span className="text-4xl font-semibold tracking-tight text-[#17382D]">{monthlyLabel}</span><span className="pb-1 text-sm text-[#626A64]">HT / mois</span></div>
              <p className="mt-2 text-sm text-[#626A64]">Sans engagement annuel.</p>
            </div>
            <div className="rounded-3xl border-2 border-[#17382D] bg-[#17382D] p-6 text-center text-[#F5F1E8] sm:p-7">
              <p className="text-sm font-semibold text-[#F5F1E8]/75">Annuel</p>
              <div className="mt-3 flex items-end justify-center gap-2"><span className="text-4xl font-semibold tracking-tight">{annualLabel}</span><span className="pb-1 text-sm text-[#F5F1E8]/65">HT / an</span></div>
              <p className="mt-2 text-sm text-[#F5F1E8]/70">2 mois offerts par rapport au mensuel.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-[#D8CDBD] bg-[#FFFCF6] p-6 text-center sm:p-7">
            <p className="text-base font-semibold text-[#17382D]">Créez votre espace pour voir le tarif détaillé</p>
            <p className="mt-2 text-sm leading-6 text-[#626A64]">L’essai gratuit de {TRIAL_DAYS} jours reste accessible sans carte bancaire dès la création de votre compte.</p>
          </div>
        )}

        <div className="mt-8 flex justify-center"><Link className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-6 text-sm font-semibold text-white transition hover:bg-[#D95E27]" href="/inscription">Essayer Nalto gratuitement <ArrowRight className="size-4" /></Link></div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="faq">
        <div className="text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">FAQ</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D]">Les réponses essentielles.</h2></div>
        <div className="mt-10 divide-y divide-[#DCD8CF] border-y border-[#DCD8CF]">{faqs.map(([question, answer]) => <details className="group py-5" key={question}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#17382D]"><span>{question}</span><span className="text-[#E8672E] transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-[#626A64]">{answer}</p></details>)}</div>
      </section>

      <section className="border-y border-[#DCD8CF] bg-[#FFFCF6] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 rounded-3xl bg-[#17382D] p-7 text-[#F5F1E8] sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[#E8672E]"><Hammer className="size-4" /><p className="text-sm font-semibold uppercase tracking-[0.18em]">Commencer</p></div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Votre prochain devis peut commencer sur le chantier.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F5F1E8]/70">Dictez les travaux, vérifiez les lignes préparées par Nalto et finalisez votre devis sans attendre d’être rentré.</p>
            <p className="mt-3 text-sm font-medium text-[#F5F1E8]/80">Vous gardez le contrôle jusqu’à l’envoi.</p>
          </div>
          <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-6 text-sm font-semibold text-white transition hover:bg-[#D95E27]" href="/inscription">Essayer Nalto gratuitement <ArrowRight className="size-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-[#DCD8CF] px-4 py-8 text-sm text-[#626A64] sm:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold uppercase tracking-[0.2em] text-[#17382D]">NALTO</span><span>Du chantier au devis, sans repasser au bureau.</span><span>Une création Localia.</span></div></footer>
    </main>
  );
}
