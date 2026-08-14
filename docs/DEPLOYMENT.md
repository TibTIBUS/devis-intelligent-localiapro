# Déploiement Netlify

## Périmètre

Netlify détecte Next.js et déploie automatiquement les Server Components, les
Server Actions, le proxy d'authentification et les routes `app/api`. Aucun
adaptateur ou dossier de fonctions Netlify ne doit être ajouté au projet.

La branche de production et les deploy previews doivent utiliser des projets
Supabase distincts. Une preview ne doit jamais recevoir les secrets du projet
de production.

## Configuration du site

1. Connecter le dépôt Git au site Netlify.
2. Définir la branche de production dans Netlify.
3. Conserver les réglages de build du fichier `netlify.toml` : Node 22 et
   `npm run build`.
4. Activer les Deploy Previews pour les pull requests.

`netlify.toml` fixe les valeurs non secrètes suivantes : `APP_ENV=production`
pour le site de production et `APP_ENV=preview` pour les deploy previews et
les branch deploys. `NODE_ENV=production` est appliqué aux trois contextes de
build. Les valeurs propres à un environnement restent configurées dans Netlify.

## Variables Netlify

Définir ces valeurs dans Netlify, par contexte, sans les inscrire dans
`netlify.toml` :

| Variable | Deploy Preview / branche | Production |
| --- | --- | --- |
| `APP_ENV` | `preview` | `production` |
| `NEXT_PUBLIC_APP_URL` | URL publique de la preview | URL publique de production |
| `NEXT_PUBLIC_SUPABASE_URL` | Projet Supabase isolé | Projet Supabase de production |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publiable isolée | Clé publiable de production |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret isolé | Secret de production |
| `OPENAI_API_KEY` | Secret isolé | Secret de production |
| `OPENAI_TEXT_MODEL` | Modèle autorisé | Modèle autorisé |
| `OPENAI_REALTIME_MODEL` | Modèle autorisé | Modèle autorisé |

Les secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) doivent être
marqués comme secrets dans Netlify. Les variables préfixées `NEXT_PUBLIC_`
sont exposées au navigateur : elles ne doivent contenir aucun secret.

La configuration du dépôt ne suffit pas à créer un site Netlify. Avant la
première publication, relier explicitement ce dépôt au site retenu avec
`netlify link` (site existant) ou `netlify init` (nouveau site), puis renseigner
les variables ci-dessus dans les contextes correspondants. Une publication
manuelle doit d'abord être une preview (`netlify deploy`), puis une production
après validation (`netlify deploy --prod`).

## Supabase Auth

Ajouter les URLs de production et de preview autorisées dans **Supabase Auth >
URL Configuration**. Pour les previews Netlify, utiliser le domaine de preview
autorisé par Supabase ; ne pas rediriger les flux d'authentification vers la
production.

## Validation avant publication

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Pour reproduire le contexte Netlify une fois le site lié : `netlify build` ou
`netlify dev`.
