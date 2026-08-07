# Devis Intelligent by Localiapro.fr

Application SaaS mobile-first de création de devis pour les artisans du
bâtiment.

## Prérequis

- Node.js 22
- npm 10 ou supérieur
- Docker Desktop pour la pile Supabase locale

## Démarrage local

1. Copier `.env.example` vers `.env.local`.
2. Renseigner les variables Supabase nécessaires.
3. Installer les dépendances avec `npm ci`.
4. Démarrer l’application avec `npm run dev`.

L’application est alors disponible sur `http://localhost:3000`.

## Contrôles qualité

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

## Déploiement

La configuration Netlify et la séparation stricte entre preview et production
sont décrites dans [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Supabase local

La configuration locale se trouve dans `supabase/config.toml`. Les futures
modifications de schéma devront être ajoutées sous forme de migrations dans
`supabase/migrations/`.

```text
npx supabase start
npx supabase stop
```

Les fichiers synchronisés sous `sources/` sont des références en lecture seule.
