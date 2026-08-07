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

## Finalisation et numérotation QUOTE-005

La finalisation est une opération serveur atomique. Elle attribue un numéro
commercial annuel au format `D-AAAA-NNNNN`, avec une séquence propre à chaque
organisation et protégée contre les finalisations concurrentes. La date
d’émission est déterminée selon le calendrier de Paris.

Avant finalisation, le devis doit comporter une date de validité, une adresse
d’exécution appartenant au client, l’indication de gratuité ou du prix du devis,
une entreprise légalement configurée et au moins une ligne entièrement chiffrée
avec son taux de TVA. La finalisation crée `quote_versions` version 1, snapshot
immuable de l’entreprise, du client, des coordonnées, du chantier et du contenu
commercial.

Un devis finalisé et son contenu ne sont plus modifiables ni supprimables. Ce
statut interne signifie que le document est figé ; il ne vaut pas acceptation
par le client. L’acceptation commerciale sera modélisée séparément.

## Périmètre QUOTE-006

L'acceptation commerciale reste distincte du statut technique `finalized`. Un
membre de l'entreprise peut constater une acceptation déjà reçue hors de
l'application en indiquant la version immuable concernée, la date, le nom du
signataire et la nature de la preuve disponible. Cet enregistrement est unique
par version et ne peut ensuite être ni modifié ni supprimé.
La date constatée doit être comprise entre l'émission et la date de validité du
devis. Après cette échéance, l'offre est caduque et un nouveau devis doit être
émis avant de constater une acceptation.

Cette fonctionnalité n'est pas un procédé de signature électronique et ne
certifie ni l'identité du client ni l'intégrité d'un fichier signé. La signature
électronique demeure hors du MVP, conformément à l'architecture. Les modes
proposés reflètent les situations décrites par Service Public Entreprendre :
devis signé, confirmation écrite ou versement d'un acompte. L'artisan reste
responsable de conserver la preuve d'origine.

Références officielles :

- Code civil, article 1113, formation du contrat par l'offre et l'acceptation :
  <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032040896>
- Code civil, article 1117, caducité de l'offre à l'expiration du délai fixé :
  <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036829821>
- Code civil, articles 1366 et 1367, écrit et signature électroniques :
  <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042461> et
  <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042456>
- Service Public Entreprendre, effets de l'acceptation d'un devis :
  <https://entreprendre.service-public.fr/vosdroits/F31144>

## Contrôle réglementaire COMPLIANCE-001

Avant finalisation, l’éditeur affiche les erreurs bloquantes et les points
conditionnels à confirmer. Les lignes sont qualifiées comme main-d’œuvre,
prestation, matériel, déplacement ou autre. Un devis payant conserve son prix
HT et son taux de TVA ; les frais de déplacement sont explicitement déclarés
applicables ou absents.
