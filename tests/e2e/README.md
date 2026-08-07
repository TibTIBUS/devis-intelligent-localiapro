# Exécution E2E isolée

Les tests E2E ne doivent jamais cibler la production. Ils s’exécutent sur une
URL locale, une URL de preview ou un projet Supabase dédié, avec
`E2E_ENVIRONMENT=isolated`.

Variables minimales pour les parcours complets :

- `E2E_BASE_URL`
- `E2E_ENVIRONMENT=isolated`
- `E2E_EMAIL` / `E2E_PASSWORD`
- `E2E_FINALIZED_QUOTE_ID`
- `E2E_DOCUMENT_ID`

Le document et le devis doivent appartenir à l’organisation de test dédiée.
Le contrôle inter-organisation utilise en plus `E2E_OTHER_EMAIL` et
`E2E_OTHER_PASSWORD`. Les valeurs de production ne doivent jamais être
placées dans `.env.local` utilisé par Playwright.

Commande : `npm run test:e2e`.
