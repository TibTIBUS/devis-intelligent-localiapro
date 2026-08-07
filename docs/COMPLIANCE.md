# Moteur de conformité

## Périmètre COMPLIANCE-001

Le contrôle de conformité est déterministe et exécuté côté serveur. La fonction
`validate_quote_compliance` retourne des codes stables, séparés en erreurs
bloquantes et avertissements. La transition vers `finalized` répète le même
contrôle dans un déclencheur PostgreSQL afin qu’aucun appel applicatif ne puisse
le contourner.

Le référentiel appliqué est versionné dans `legal_rules_versions`. La version
`FR-BUILDING-QUOTE-2017-01` couvre les devis de dépannage, réparation et
entretien dans le bâtiment. Chaque `quote_version` conserve l’identifiant du
référentiel, la déclaration relative aux frais de déplacement, le prix du devis
s’il est payant et les assurances applicables à sa date d’émission.

## Règles bloquantes

La finalisation exige notamment :

- l’identité, l’adresse, le SIREN, le SIRET et la forme juridique de l’entreprise ;
- pour les SARL/EURL et sociétés par actions, le capital social et la ville
  d’immatriculation ;
- la déclaration de l’applicabilité de l’assurance professionnelle et, lorsqu’elle
  est obligatoire, au moins un contrat valide à la date d’émission ;
- le nom du client et une adresse d’exécution ;
- une date de validité non dépassée ;
- le caractère gratuit ou payant du devis et, s’il est payant, son prix HT et sa TVA ;
- une déclaration explicite sur les frais de déplacement et une ligne chiffrée
  lorsqu’ils s’appliquent ;
- au moins une ligne de prestation ou de main-d’œuvre, avec quantité, unité,
  prix HT et taux de TVA.

L’absence de numéro de TVA ou de ville d’immatriculation produit un
avertissement, car leur caractère obligatoire dépend de la situation juridique
et fiscale. Le logiciel ne déduit pas ces situations depuis un libellé métier.

## Références

- Arrêté du 24 janvier 2017, article 4 :
  <https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000033935526>
- Service Public Entreprendre, devis obligatoire :
  <https://entreprendre.service-public.fr/vosdroits/F31144>
- Code de l’artisanat, article L132-1, assurances professionnelles :
  <https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000047362294>
- Service Public Entreprendre, identification SIREN/SIRET :
  <https://entreprendre.service-public.fr/vosdroits/F32135>
- Code de commerce, articles R123-237 et R123-238, papiers d’affaires :
  <https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006178891/>
