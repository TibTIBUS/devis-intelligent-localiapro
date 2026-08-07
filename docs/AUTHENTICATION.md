# Authentification V1

AUTH-001 installe le socle SSR de Supabase avec des cookies partagés entre le
navigateur et le serveur.

- `proxy.ts` actualise la session à chaque requête concernée avec
  `supabase.auth.getClaims()` ;
- le groupe `(app)` vérifie à nouveau cette identité côté serveur ;
- `/auth/callback` échange le code PKCE contre une session et refuse toute
  destination de redirection externe.

## Email et mot de passe

AUTH-002 ajoute l’inscription et la connexion via des Server Actions. Les
identifiants sont validés côté serveur avec Zod ; les erreurs de connexion ne
précisent jamais si une adresse email est déjà inscrite.

La configuration locale active la confirmation d’email, définit
`http://localhost:3000` comme Site URL et autorise uniquement
`http://localhost:3000/auth/callback` comme URL de redirection.

Avant un test sur l’environnement Supabase distant, reproduire ces réglages
dans **Auth > URL Configuration** et activer la confirmation d’email dans le
fournisseur Email. La configuration SMTP de production sera traitée avant la
mise en ligne.

## Réinitialisation du mot de passe

AUTH-003 envoie une réponse identique pour toute adresse email valide afin de
ne pas révéler l’existence d’un compte. Le lien email passe par
`/auth/confirm`, qui vérifie uniquement un jeton Supabase de type `recovery`
avant d’ouvrir la page de changement de mot de passe.

Le modèle local `supabase/templates/recovery.html` utilise `TokenHash` pour que
la session soit créée côté serveur. Reproduire ce modèle dans **Auth > Email
Templates > Reset Password** sur le projet Supabase distant avant un test réel.

## Google OAuth et rattachement des identités

AUTH-004 ajoute **Continuer avec Google** sur l’inscription et la connexion.
La Server Action demande à Supabase une URL OAuth, vérifie que cette URL pointe
bien vers le point d’autorisation du projet, puis le callback échange le code
PKCE et persiste la session dans les cookies SSR.

Le rattachement repose sur la stratégie automatique sécurisée de Supabase Auth :
une identité OAuth dont l’adresse vérifiée correspond à un compte existant est
rattachée au même `auth.users.id`. Le rattachement manuel reste désactivé. Le
callback vérifie que toutes les identités retournées ont ce même identifiant.
Il ne crée ni organisation ni adhésion : ces données métier restent rattachées
à l’identifiant canonique lors de l’onboarding.

### Activation du fournisseur

Le code est prêt, mais Google exige des identifiants OAuth propres à chaque
environnement. Ils ne sont jamais committés.

Pour le projet Supabase distant :

1. créer un client OAuth Web dans Google Cloud ;
2. enregistrer dans Google l’URL de callback affichée par Supabase, de la forme
   `https://<project-ref>.supabase.co/auth/v1/callback` ;
3. renseigner le Client ID et le Client Secret dans **Auth > Providers > Google** ;
4. conserver l’URL applicative `/auth/callback` dans la liste des redirections
   autorisées de Supabase.

Pour Supabase local, renseigner
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` et
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, puis activer
`auth.external.google.enabled` dans `supabase/config.toml` uniquement sur un
environnement disposant de ces identifiants.
