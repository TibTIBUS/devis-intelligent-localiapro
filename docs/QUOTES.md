# Devis

## Périmètre QUOTE-001

Le socle du devis vivant comprend trois tables :

- `quotes` rattache un devis à une organisation et à un client ;
- `quote_sections` regroupe éventuellement des lignes ;
- `quote_lines` appartient toujours à un devis et peut rester sans section.

Les clés étrangères composites interdisent tout rattachement entre
organisations. Une ligne rattachée à une section doit appartenir au même devis.
La suppression d'un devis supprime ses sections et lignes. Un client déjà lié
à un devis ne peut pas être supprimé.

Les statuts, le numéro commercial, les contenus de lignes, les quantités, la
TVA, les remises, les arrondis et les totaux ne sont pas définis dans ce ticket.
Ils seront ajoutés uniquement avec leurs règles métier et leurs tests dédiés.

Les trois tables sont protégées par RLS et ne sont pas accessibles au rôle
anonyme. Les privilèges du rôle authentifié restent limités à ces tables.

## Modèle financier QUOTE-002

Les quantités sont stockées en milli-unités (`1000 = 1`) et les montants en
centimes. Les taux de TVA, de remise et d'acompte sont stockés en points de base
(`2000 = 20,00 %`). Un prix ou un taux de TVA peut rester inconnu pendant la
préparation ; aucun total officiel n'est alors produit.

Chaque montant net de ligne est arrondi au centime. La remise globale est
ventilée entre les bases HT par taux de TVA, puis la TVA est calculée et
arrondie pour chaque taux. Le total TTC est la somme du HT net et des montants
de TVA par taux. L'acompte demandé est calculé sur ce TTC.

Cette méthode suit les règles françaises de facturation : quantité, prix
unitaire HT et taux par prestation, réduction de la base taxable, puis total HT
et TVA distincts par taux. La référence catalogue reste facultative et devient
nulle si la prestation catalogue est supprimée ; les données copiées dans la
ligne de devis restent conservées.

## Édition manuelle QUOTE-003

Un devis est créé depuis un client existant. L’éditeur permet ensuite de gérer les sections, les lignes manuelles, les lignes issues du catalogue, la remise globale et l’acompte. Chaque modification est validée par une Server Action, écrite avec la session Supabase de l’utilisateur puis relue depuis la base. Le navigateur ne transmet ni total HT, ni TVA, ni TTC à enregistrer.

Une ligne issue du catalogue reprend côté serveur son libellé, son unité, sa description et son prix HT. Le taux de TVA reste une saisie explicite, car il n’est pas défini dans le catalogue V1.

## Liste et reprise QUOTE-004

La liste des devis est limitée côté serveur à l’organisation courante et reste soumise aux politiques RLS. Elle affiche le client, la dernière modification et, lorsque le devis est complet, un TTC calculé à partir des lignes relues en base. La recherche par client est validée et normalisée avant filtrage ; elle ne sert jamais à construire une requête SQL libre.
