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

## STORAGE-001 — logos privés à chemin stable

Le logo reste dans un bucket privé et porte un chemin déterministe sans
extension. Le remplacement utilise ainsi un `upsert` sur le même objet, sans
colonne de chemin supplémentaire ni ancien fichier orphelin. Les politiques
Storage exigent l’adhésion à l’organisation pour `SELECT`, `INSERT` et `UPDATE`.

## COMPANY-001 — séparation de l’identité légale et des assurances

L’identité légale est une ressource unique par organisation, tandis que les
assurances sont des ressources multiples avec leurs propres périodes de
validité. Les champs d’assurance ne sont pas intégrés à la fiche légale afin de
ne pas limiter une entreprise à un seul contrat.

Le type d’assurance n’est pas une énumération PostgreSQL : les obligations
dépendent du métier et peuvent évoluer. La validation fonctionnelle des types
attendus sera portée par l’application au moment du formulaire, sans rendre le
schéma réglementairement rigide.

## CATALOG-001 — prix facultatif et catégorie de la même organisation

Le prix catalogue est un entier exprimé en centimes HT. Il reste nullable afin
de représenter explicitement un tarif inconnu, conformément à l’interdiction
d’inventer un prix. Le taux de TVA n’est pas fixé dans le catalogue : il sera
déterminé dans le contexte du devis par le moteur financier.

La relation entre prestation et catégorie porte également l’identifiant de
l’organisation. Cette clé étrangère composite bloque en base tout rattachement
d’une prestation à la catégorie d’une autre entreprise, indépendamment de RLS.

## CATALOG-002 — historique de prix en écriture interne uniquement

Les changements de prix sont enregistrés automatiquement par un déclencheur
privé. Les clients authentifiés peuvent consulter l’historique de leur
organisation mais ne disposent d’aucun droit direct d’insertion, modification
ou suppression sur cette table.

L’état initial, y compris un prix inconnu, est historisé. Une mise à jour qui ne
change pas le prix n’ajoute aucune entrée. L’historique suit le cycle de vie de
la prestation et est supprimé avec elle ; l’immutabilité des documents
commerciaux sera assurée séparément par les snapshots de devis.

## CLIENT-001 — identité client neutre et coordonnées multiples

Le schéma client n’impose pas de statut particulier ou professionnel, faute de
règle produit validée. Un nom d’affichage commun couvre le MVP ; les contacts
et adresses sont stockés séparément pour accepter plusieurs coordonnées.

Les coordonnées portent systématiquement l’organisation et une clé étrangère
composite vers le client. Cette redondance contrôlée interdit les relations
entre entreprises. Un index partiel garantit au maximum un contact principal
et une adresse principale par client.

## QUOTE-001 — socle relationnel avant règles financières

Le premier ticket devis crée uniquement la topologie du devis vivant : devis,
sections et lignes. Les champs financiers, la numérotation et les statuts sont
écartés tant que leurs règles de calcul et de cycle de vie ne sont pas validées.

Les relations portent l'organisation et utilisent des clés composites. Une
ligne ne peut donc jamais viser une section d'un autre devis ou d'une autre
organisation. La suppression d'un devis emporte son contenu de travail ; la
référence au client reste restrictive afin de ne pas supprimer un client déjà
utilisé par un devis.

## QUOTE-002 — calcul financier aligné sur la facturation française

Le moteur utilise exclusivement des entiers : milli-unités pour les quantités,
centimes pour l'argent et points de base pour les taux. Les lignes sont
arrondies au centime avant agrégation, conformément au modèle français de
facturation électronique.

Une remise globale réduit la base taxable et est ventilée exactement entre les
catégories de TVA. La taxe est ensuite calculée sur la base nette agrégée de
chaque taux. Cette ventilation garantit que la somme des bases et taxes
affichées correspond exactement aux totaux du document, y compris en multi-TVA.
