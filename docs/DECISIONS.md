# Décisions d’architecture

## DB-002 — `organizations.created_by`

La table `organizations` contient un champ technique `created_by`, relié à
`auth.users`. Il sert exclusivement à sécuriser l’amorçage de l’adhésion
initiale `owner` sous RLS : un utilisateur authentifié peut créer une
organisation, puis uniquement sa propre adhésion owner.

Ce champ n’est pas un rôle et ne remplace pas `organization_members`, qui reste
la source d’autorisation métier. Il évite une politique temporairement ouverte
pour créer le premier membre de l’entreprise.
