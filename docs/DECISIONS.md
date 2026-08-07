# Décisions d’architecture

## DB-002 — `organizations.created_by`

La table `organizations` contient un champ technique `created_by`, relié à
`auth.users`. Il sert exclusivement à sécuriser l’amorçage de l’adhésion
initiale `owner` sous RLS : un utilisateur authentifié peut créer une
organisation, puis uniquement sa propre adhésion owner.

Ce champ n’est pas un rôle et ne remplace pas `organization_members`, qui reste
la source d’autorisation métier. Il évite une politique temporairement ouverte
pour créer le premier membre de l’entreprise.

## AUTH-004 — rattachement Google automatique et contrôlé

L’application utilise le rattachement automatique de Supabase Auth pour une
identité Google ayant la même adresse vérifiée qu’un compte email existant.
Elle n’active pas le rattachement manuel, qui autoriserait l’association d’une
identité portant une autre adresse et élargirait inutilement la surface de
sécurité du MVP.

L’identifiant `auth.users.id` reste l’unique identifiant canonique. Le callback
OAuth contrôle la cohérence des `user_id` des identités et n’amorce aucune
organisation. Les espaces de travail sont donc créés ultérieurement à partir
de cet identifiant stable, quel que soit le mode de connexion.

## ORG-001 — création initiale atomique

La première organisation est créée par une fonction RPC transactionnelle avec
`security invoker`. Elle applique donc les politiques RLS existantes et ne
dispose pas de privilèges supplémentaires. Un verrou transactionnel par
utilisateur et le retour de l’adhésion existante rendent l’onboarding
idempotent face aux doubles soumissions.
