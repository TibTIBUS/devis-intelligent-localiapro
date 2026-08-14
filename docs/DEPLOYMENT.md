# Déploiement Netlify

## Périmètre

Netlify détecte Next.js et déploie automatiquement les Server Components, les
Server Actions, le proxy d'authentification et les routes `app/api`. Aucun
adaptateur ou dossier de fonctions Netlify ne doit être ajouté au projet.

Le MVP utilise un unique projet Supabase, qui est l'environnement de
production. Cette dérogation temporaire interdit les Deploy Previews et les
branch deploys : une branche de travail ne doit jamais recevoir les secrets ni
accéder aux données de production.

## Configuration du site

1. Connecter le dépôt Git au site Netlify.
2. Définir la branche de production dans Netlify.
3. Conserver les réglages de build du fichier `netlify.toml` : Node 22 et
   `npm run build`.
4. Désactiver les **Deploy Previews** dans **Project configuration > Build &
   deploy > Continuous Deployment > Branches and deploy contexts**.
5. Ne configurer aucune branche de déploiement supplémentaire.

`netlify.toml` fixe la valeur non secrète `APP_ENV=production` pour le site.
`NODE_ENV` n'est pas forcé pendant l'installation afin que Netlify installe les
dépendances de compilation. Les valeurs propres à l'environnement restent
configurées dans Netlify.

## Variables Netlify

Définir ces valeurs dans Netlify, par contexte, sans les inscrire dans
`netlify.toml` :

| Variable | Production |
| --- | --- |
| `APP_ENV` | `production` (fourni par `netlify.toml`) |
| `NEXT_PUBLIC_APP_URL` | URL publique de production |
| `NEXT_PUBLIC_SUPABASE_URL` | Projet Supabase de production |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publiable de production |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret de production |
| `OPENAI_API_KEY` | Secret de production |
| `OPENAI_TEXT_MODEL` | Modèle autorisé |
| `OPENAI_TRANSCRIPTION_MODEL` | Modèle de transcription vocale |
| `OPENAI_TTS_MODEL` | Modèle de synthèse vocale |
| `OPENAI_TTS_VOICE` | Voix de synthèse |
| `RESEND_API_KEY` | Secret de production |
| `RESEND_FROM_EMAIL` | Adresse d'expédition des devis |

Les secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) doivent être
marqués comme secrets dans Netlify. Les variables préfixées `NEXT_PUBLIC_`
sont exposées au navigateur : elles ne doivent contenir aucun secret.

La configuration du dépôt ne suffit pas à créer un site Netlify. Avant la
première publication, relier explicitement ce dépôt au site retenu avec
`netlify link` (site existant) ou `netlify init` (nouveau site), puis renseigner
les variables ci-dessus. La publication se fait uniquement depuis `main`, après
les contrôles locaux obligatoires. Les tests authentifiés ne créent pas de
données sur le site public ; un compte de démonstration dédié est utilisé pour
les vérifications manuelles.

## Supabase Auth

Ajouter l'URL de production autorisée dans **Supabase Auth > URL
Configuration**. Les redirections d'authentification utilisent exclusivement
le domaine de production.

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
