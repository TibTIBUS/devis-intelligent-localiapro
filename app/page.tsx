import { ArrowRight, BookOpen, CheckCircle2, FileText, Mic2, Send, ShieldCheck, Users, WandSparkles } from "lucide-react";
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
  {
    description: "Gardez la main sur les quantités, la TVA, les prix et les lignes avant de finaliser.",
    icon: CheckCircle2,
    title: "Vérifiez avant d’envoyer",
  },
  {
    description: "Générez un document professionnel avec vos informations, votre logo et vos mentions.",
    icon: FileText,
    title: "Envoyez un vrai devis",
  },
  {
    description: "Vos données restent rattachées à votre entreprise et protégées par les règles d’accès de l’application.",
    icon: ShieldCheck,
    title: "Travaillez dans votre espace",
  },
];

const steps = [
  { icon: Mic2, number: "01", title: "Parlez", text: "Sur le chantier, dictez ce que vous venez de décider avec votre client." },
  { icon: CheckCircle2, number: "02", title: "Vérifiez", text: "Nalto structure le devis avec votre catalogue, vos prix et vos paramètres." },
  { icon: Send, number: "03", title: "Envoyez", text: "Relisez, finalisez et partagez un PDF professionnel depuis le même espace." },
];

const faqs = [
  ["Est-ce que Nalto fixe mes prix ?", "Non. Nalto travaille avec votre catalogue et vos tarifs. Les calculs du devis restent déterministes côté serveur."],
  ["Puis-je modifier ce que j’ai dicté ?", "Oui. Le devis reste modifiable tant qu’il est en brouillon : quantités, TVA, prix, libellés et informations du client."],
  ["Est-ce uniquement pour la voix ?", "Non. La voix accélère la saisie sur le terrain, mais vous pouvez aussi créer et modifier vos devis avec l’interface classique."],
  ["Mes devis portent-ils la marque Nalto ?", "Votre entreprise reste l’identité principale du devis. Nalto intervient seulement de manière discrète comme outil de création."],
];

export default function Home() {
  return (
    <main className="min-h-svh bg-[#F5F1E8] text-[#18201C]">
      <header className="sticky top-0 z-40 border-b border-[#DCD8CF] bg-[#F5F1E8]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppBrand href="/" />
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#626A64] md:flex">
            <a className="hover:text-[#17382D]" href="#fonctionnement">Fonctionnement</a>
            <a className="hover:text-[#17382D]" href="#benefices">Bénéfices</a>
            <a className="hover:text-[#17382D]" href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link href="/connexion">Se connecter</Link></Button>
            <Link className="hidden h-9 items-center justify-center rounded-xl bg-[#E8672E] px-4 text-sm font-semibold text-white transition hover:bg-[#D95E27] sm:inline-flex" href="/inscription">Essayer Nalto</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
        <div className="max-w-2xl space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D8CDBD] bg-[#FFFCF6] px-3 py-1.5 text-xs font-semibold text-[#17382D]"><Mic2 className="size-3.5 text-[#E8672E]" /> Pensé pour les artisans du bâtiment</span>
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-[#17382D] sm:text-6xl">Vos devis se font sur le chantier.</h1>
            <p className="max-w-xl text-lg leading-8 text-[#626A64]">Dictez les travaux depuis votre téléphone. Nalto transforme vos mots en devis structuré, prêt à vérifier, envoyer et suivre.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-6 text-sm font-semibold text-white transition hover:bg-[#D95E27]" href="/inscription">Créer mon premier devis <ArrowRight className="size-4" /></Link>
            <Button asChild size="lg" variant="outline"><Link href="/connexion">J’ai déjà un compte</Link></Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#626A64]">
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-[#397255]" /> Vos prix restent les vôtres</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#397255]" /> Données sécurisées</span>
            <span className="flex items-center gap-2"><FileText className="size-4 text-[#397255]" /> PDF professionnel</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-[#D8CDBD]/35 blur-3xl" />
          <article className="overflow-hidden rounded-3xl border border-[#315247] bg-[#17382D] shadow-xl">
            <div className="border-b border-white/10 px-5 py-4 text-[#F5F1E8]"><p className="text-xs font-medium text-[#F5F1E8]/60">Devis en cours</p><p className="font-semibold">Rénovation électrique — Martin</p></div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="rounded-2xl border border-white/10 bg-white/7 p-4 text-[#F5F1E8]"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-[#E8672E] text-white"><Mic2 className="size-5" /></span><div><p className="text-xs text-[#F5F1E8]/55">Vous dites</p><p className="mt-0.5 text-sm font-medium">« Ajoute 6 prises, 3 interrupteurs et 8 spots. »</p></div></div></div>
              <div className="rounded-2xl bg-[#FFFCF6] p-4 text-[#18201C]"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#626A64]">Lignes du devis</p><span className="rounded-full bg-[#ECE7DD] px-2.5 py-1 text-xs font-medium text-[#17382D]">TVA 20 %</span></div>{[{ label: "Prise de courant", qty: "6 u." }, { label: "Interrupteur simple", qty: "3 u." }, { label: "Spot LED encastré", qty: "8 u." }].map((line) => <div className="flex items-center justify-between border-t border-[#DCD8CF] py-3 first:border-t-0" key={line.label}><p className="text-sm font-medium">{line.label}</p><p className="text-sm text-[#626A64]">{line.qty}</p></div>)}</div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-[#F5F1E8]"><CheckCircle2 className="size-5 shrink-0 text-[#E8672E]" /><p className="text-sm">Le devis avance pendant que vous êtes encore sur le terrain.</p></div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y border-[#DCD8CF] bg-[#17382D] px-4 py-14 text-[#F5F1E8] sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Le problème</p><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Le devis ne devrait pas commencer une fois rentré au bureau.</h2></div>
          <p className="max-w-2xl text-base leading-7 text-[#F5F1E8]/70">Quand les travaux sont décidés chez le client, les informations sont déjà là : pièces, quantités, options, délais. Nalto permet de capturer cette décision immédiatement, puis de la transformer en devis exploitable sans ressaisie inutile.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="fonctionnement">
        <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Comment ça marche</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Du chantier au devis en trois étapes.</h2></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{steps.map(({ icon: Icon, number, text, title }) => <article className="rounded-3xl border border-[#DCD8CF] bg-[#FFFCF6] p-6" key={number}><div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-2xl bg-[#17382D] text-[#F5F1E8]"><Icon className="size-5" /></span><span className="text-sm font-semibold text-[#E8672E]">{number}</span></div><h3 className="mt-6 text-xl font-semibold text-[#17382D]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#626A64]">{text}</p></article>)}</div>
      </section>

      <section className="bg-[#ECE7DD] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Démo terrain</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Parlez normalement. Le devis se structure.</h2><p className="mt-4 max-w-xl text-base leading-7 text-[#626A64]">Vous pouvez demander plusieurs éléments dans la même phrase. Nalto ajoute ce qu’il comprend, avec vos règles métier et vos tarifs.</p></div>
          <div className="rounded-3xl bg-[#17382D] p-6 text-[#F5F1E8] shadow-xl"><div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full bg-[#E8672E]"><Mic2 className="size-6" /></span><div><p className="text-xs uppercase tracking-[0.16em] text-[#F5F1E8]/50">Exemple</p><p className="mt-1 font-medium">« Ajoute 4 prises, 2 va-et-vient et passe les spots à 10 % de TVA. »</p></div></div><div className="mt-5 rounded-2xl bg-[#F5F1E8] p-4 text-[#18201C]"><p className="text-sm font-semibold text-[#17382D]">Devis mis à jour</p><p className="mt-2 text-sm text-[#626A64]">Les lignes comprises sont ajoutées et restent modifiables avant finalisation.</p></div></div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="benefices">
        <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">Un outil de terrain</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Moins de ressaisie. Plus de contrôle.</h2></div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{benefits.map(({ description, icon: Icon, title }) => <article className="rounded-2xl border border-[#DCD8CF] bg-[#FFFCF6] p-5" key={title}><span className="inline-flex rounded-xl bg-[#17382D] p-2.5 text-[#F5F1E8]"><Icon className="size-5" /></span><h3 className="mt-4 text-lg font-semibold text-[#17382D]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#626A64]">{description}</p></article>)}</div>
      </section>

      <section className="border-y border-[#DCD8CF] bg-[#FFFCF6] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 rounded-3xl bg-[#17382D] p-7 text-[#F5F1E8] sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex items-center gap-2 text-[#E8672E]"><WandSparkles className="size-4" /><p className="text-sm font-semibold uppercase tracking-[0.18em]">Commencer simplement</p></div><h2 className="mt-3 text-3xl font-semibold tracking-tight">Créez votre espace et préparez votre premier devis.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#F5F1E8]/70">Aucune promesse compliquée : configurez votre entreprise, votre catalogue et testez le flux complet sur un vrai devis.</p></div><Link className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-6 text-sm font-semibold text-white transition hover:bg-[#D95E27]" href="/inscription">Créer mon espace <ArrowRight className="size-4" /></Link></div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20" id="faq">
        <div className="text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E8672E]">FAQ</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#17382D]">Les réponses essentielles.</h2></div>
        <div className="mt-10 divide-y divide-[#DCD8CF] border-y border-[#DCD8CF]">{faqs.map(([question, answer]) => <details className="group py-5" key={question}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#17382D]"><span>{question}</span><span className="text-[#E8672E] transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-[#626A64]">{answer}</p></details>)}</div>
      </section>

      <footer className="border-t border-[#DCD8CF] px-4 py-8 text-sm text-[#626A64] sm:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold uppercase tracking-[0.2em] text-[#17382D]">NALTO</span><span>Du chantier au devis, sans repasser au bureau.</span><span>Une création Localia.</span></div></footer>
    </main>
  );
}
