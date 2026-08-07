# Authentification V1

AUTH-001 installe le socle SSR de Supabase avec des cookies partagés entre le
navigateur et le serveur.

- `proxy.ts` actualise la session à chaque requête concernée avec
  `supabase.auth.getClaims()` ;
- le groupe `(app)` vérifie à nouveau cette identité côté serveur ;
- `/auth/callback` échange le code PKCE contre une session et refuse toute
  destination de redirection externe.

OAuth Google reste hors périmètre de ce ticket.

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
