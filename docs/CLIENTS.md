# Clients

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
