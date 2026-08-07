# Clients

## Périmètre CLIENT-003

Un artisan peut supprimer un client, un contact ou une adresse depuis la page
`/clients`. L’action est validée côté serveur et filtrée par l’organisation de
la session. La suppression du client utilise la cascade déjà définie : ses
contacts et adresses sont donc supprimés avec lui.

Ce comportement est limité aux données de préparation des devis. Les règles de
conservation des futurs documents finalisés ne sont pas modifiées par ce ticket.

## Périmètre CLIENT-002

La page `/clients` permet de créer et modifier l’identité neutre d’un client,
ses contacts et ses adresses. Un client est d’abord créé avec son seul nom ;
les coordonnées sont ensuite ajoutées ou modifiées séparément.

Les données de formulaire sont validées par Zod dans les actions serveur. Les
modifications utilisent toujours l’organisation obtenue depuis la session, et
la RLS reste donc la protection effective contre tout accès inter-entreprises.
La suppression des clients et des coordonnées est volontairement hors du
périmètre de ce ticket.

## Périmètre CLIENT-001

Le socle client est volontairement neutre vis-à-vis du statut particulier ou
professionnel :

- `customers` porte le nom d’affichage du client ;
- `customer_contacts` conserve plusieurs personnes ou moyens de contact ;
- `customer_addresses` conserve plusieurs adresses structurées.

Un contact doit contenir au moins un nom, un email ou un téléphone. Un client
peut avoir au maximum un contact principal et une adresse principale. Il reste
possible de créer le client avant de disposer de toutes ses coordonnées.

## Intégrité et sécurité

Les relations vers le client sont des clés étrangères composites incluant
l’organisation. Une coordonnée ne peut donc jamais être rattachée au client
d’une autre entreprise, même en contournant l’interface.

Les trois tables sont protégées par RLS pour toutes les opérations et ne sont
pas accessibles au rôle anonyme. La suppression d’un client supprime ses
contacts et adresses. Les futurs devis finalisés conserveront leurs propres
snapshots pour garantir l’immutabilité documentaire.
