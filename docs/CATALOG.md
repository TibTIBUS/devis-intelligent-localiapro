# Catalogue

## Périmètre CATALOG-001

Le socle du catalogue comprend deux tables rattachées à une organisation :

- `catalog_categories` classe les prestations ;
- `catalog_items` décrit une prestation, son unité et son prix unitaire HT.

Le prix est enregistré en centimes dans `unit_price_ht_cents`. Il peut rester
`null` lorsque l’artisan ne dispose pas encore d’un tarif. Cette absence est
distincte d’un prix égal à zéro et permet au futur assistant de demander le
prix sans en inventer un.

La TVA n’est pas stockée sur la prestation dans ce ticket. Son application
dépendra du contexte du devis et sera traitée par le moteur financier dédié.

## Intégrité et sécurité

Une clé étrangère composite garantit qu’une prestation ne peut référencer
qu’une catégorie de la même organisation. Une catégorie contenant encore des
prestations ne peut pas être supprimée.

Les deux tables sont protégées par RLS pour les opérations de lecture,
création, modification et suppression. Aucun privilège n’est accordé au rôle
anonyme.

## Historique des prix — CATALOG-002

Chaque création de prestation enregistre son état de prix initial dans
`catalog_price_history`, y compris lorsqu’il est inconnu (`null`). Une nouvelle
entrée est ensuite ajoutée uniquement lorsque le prix change réellement. Le
retour d’un prix renseigné vers un prix inconnu est donc également conservé.

L’historique est alimenté par un déclencheur privé et privilégié. Son exécution
contrôle explicitement l’appartenance de l’utilisateur à l’organisation. Le
rôle authentifié dispose uniquement du droit de lecture, lui-même filtré par
RLS ; aucune écriture directe n’est autorisée.

La suppression d’une prestation supprime son historique catalogue. Les futurs
devis finalisés conserveront leurs propres snapshots immuables et ne dépendront
pas de cette table.
