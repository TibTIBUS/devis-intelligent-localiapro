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
| `OPENAI_REALTIME_MODEL` | Modèle autorisé |

Les secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) doivent être
marqués comme secrets dans Netlify. Les variables préfixées `NEXT_PUBLIC_`
sont exposées au navigateur : elles ne doivent contenir aucun secret.

La configuration du dépôt ne suffit pas à créer un site Netlify. Avant la
première publication, relier explicitement ce dépôt au site retenu avec
`netlify link` (site existant) ou `netlify init` (nouveau site), puis renseigner
les variables ci-dessus.

Les builds déclenchés par Git sont volontairement ignorés par `netlify.toml`.
Un push GitHub lance la CI, mais ne publie jamais le site Netlify. Cette règle
évite de consommer des publications pendant le développement et protège le
projet Supabase de production.

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

## Publication manuelle en production

Une publication est une action volontaire qui impacte immédiatement les
utilisateurs du site. Ne la lancez que lorsque les corrections à mettre en
ligne sont regroupées et validées.

1. Vérifier que la branche locale est `main`, à jour, et sans fichier modifié :

   ```text
   git status
   git pull --ff-only origin main
   ```

2. Vérifier que la CI GitHub du dernier commit est verte.

3. Vérifier les variables de production par leur nom uniquement :

   ```text
   npx netlify env:list --context production
   ```

   Ne jamais afficher, copier ou committer les valeurs des secrets.

4. Dans GitHub, ajouter une seule fois le secret d'action `NETLIFY_AUTH_TOKEN`.
   Créez ce jeton dans Netlify depuis **User settings > Applications > Personal
   access tokens**, puis GitHub depuis **Settings > Secrets and variables >
   Actions > New repository secret**. Ne placez jamais ce jeton dans Netlify,
   dans un fichier local ou dans le dépôt.

5. Dans GitHub Actions, ouvrir **Manual production deploy**, cliquer sur
   **Run workflow**, choisir `main`, puis saisir exactement :

   ```text
   DEPLOY_PRODUCTION
   ```

   Le workflow rejoue lint, typecheck, tests et build sur un runner Linux,
   avant de créer un unique déploiement Netlify de production. Cette exécution
   explicite évite la limitation Windows rencontrée avec les liens symboliques
   du plugin Next.js et ne peut pas être déclenchée par un push Git.

6. Ouvrir l'URL donnée par Netlify et vérifier au minimum : connexion,
   création de client, création de devis et téléchargement de document avec le
   compte de démonstration.

En cas d'incident, ne republiez pas à l'aveugle. Ouvrez la page **Deploys**
Netlify et republiez le dernier déploiement sain depuis l'interface, puis
consignez le problème avant de préparer un correctif.
