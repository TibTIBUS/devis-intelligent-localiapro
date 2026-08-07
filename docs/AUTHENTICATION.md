# Authentification V1

AUTH-001 installe le socle SSR de Supabase avec des cookies partagés entre le
navigateur et le serveur.

- `proxy.ts` actualise la session à chaque requête concernée avec
  `supabase.auth.getClaims()` ;
- le groupe `(app)` vérifie à nouveau cette identité côté serveur ;
- `/auth/callback` échange le code PKCE contre une session et refuse toute
  destination de redirection externe.

Les formulaires email/mot de passe, OAuth Google et la récupération de mot de
passe restent hors périmètre de ce ticket.
