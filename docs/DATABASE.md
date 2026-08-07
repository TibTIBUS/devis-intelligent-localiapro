# Base de données V1

## Socle multi-entreprises

La première migration crée les trois tables qui établissent la frontière entre
utilisateur et entreprise :

- `profiles` est rattachée à `auth.users` avec suppression en cascade ;
- `organizations` représente une entreprise ;
- `organization_members` relie un utilisateur à une entreprise.

Chaque inscription crée automatiquement un profil vide via un trigger sur
`auth.users`. Les informations de profil seront ajoutées dans le ticket
d’onboarding correspondant.

## Sécurité

Les trois tables sont protégées par RLS et aucun privilège n’est accordé au
rôle anonyme.

En V1, seul l’utilisateur qui crée une organisation peut créer son adhésion
`owner` et modifier cette organisation. Les collaborateurs et les rôles
supplémentaires restent hors périmètre.

Les fonctions de vérification d’adhésion résident dans le schéma non exposé
`private`. Elles ne reçoivent jamais d’identifiant utilisateur : elles se
fondent exclusivement sur `auth.uid()`.

## Tests

Les tests pgTAP seront conservés dans `supabase/tests/` et exécutés par :

```text
npm run db:lint
npm run db:test
```
