# Exécution E2E isolée

Les tests E2E ne doivent jamais cibler la production. Ils s’exécutent sur une URL locale, une URL de preview ou un projet Supabase dédié, avec `E2E_ENVIRONMENT=isolated`.

Variables minimales pour les parcours complets :

- `E2E_BASE_URL`
- `E2E_ENVIRONMENT=isolated`
- `E2E_EMAIL` / `E2E_PASSWORD`
- `E2E_FINALIZED_QUOTE_ID`
- `E2E_DOCUMENT_ID`

Le compte E2E doit appartenir à une organisation de test dédiée avec ses informations légales déjà configurées. Le scénario `artisan-quote-journey.spec.ts` crée lui-même un client, son contact, son adresse chantier et un devis avant de le finaliser et de télécharger le PDF.

Le document et le devis préexistants utilisés par les autres scénarios doivent appartenir à l’organisation de test dédiée. Le contrôle inter-organisation utilise en plus `E2E_OTHER_EMAIL` et `E2E_OTHER_PASSWORD`. Les valeurs de production ne doivent jamais être placées dans `.env.local` utilisé par Playwright.

Le smoke test `mobile-voice-smoke.spec.ts` utilise une émulation iPhone pour contrôler l’accès au mode voix, la présence du bouton micro et l’absence de débordement horizontal. Il ne remplace pas un essai manuel du microphone sur un véritable iPhone et un véritable Android.

Les contrôles IA utilisent le devis finalisé de test : les requêtes s’arrêtent sur son état métier avant tout appel OpenAI, ce qui permet de vérifier la limite HTTP et le quota sans consommer de crédits.

Commande : `npm run test:e2e`.
