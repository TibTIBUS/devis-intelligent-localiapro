# Informations légales de l’entreprise

## Périmètre COMPANY-001

La fiche `company_legal_information` contient l’identité légale et l’adresse de
l’établissement qui seront réutilisées sur les documents commerciaux. Elle est
unique par organisation. Les identifiants SIREN et SIRET sont stockés comme du
texte afin de préserver leur format ; le SIRET doit commencer par le SIREN de
la même fiche.

La table `company_insurances` accepte plusieurs contrats. Elle conserve les
coordonnées de l’assureur, le numéro de police, la couverture géographique, les
activités couvertes et, lorsqu’elles sont connues, les dates de validité. Le
type d’assurance reste un libellé métier : aucune liste fermée n’est imposée,
car l’obligation dépend de l’activité exercée.

Les paramètres commerciaux, les coordonnées bancaires et le stockage des
attestations ne font pas partie de ce ticket.

## Sécurité

Les deux tables sont protégées par RLS. Un utilisateur authentifié ne peut
lire ou modifier que les lignes d’une organisation dont il est membre. Le rôle
anonyme ne reçoit aucun privilège. La fiche légale n’est pas supprimable par le
client ; les contrats d’assurance peuvent être supprimés par leur organisation.

## Références réglementaires

- Code de l’artisanat, article L132-1 : mentions d’assurance, coordonnées de
  l’assureur ou du garant et couverture géographique sur les devis lorsque
  l’assurance professionnelle est obligatoire :
  <https://www.legifrance.gouv.fr/codes/id/LEGISCTA000047362292/>
- Code des assurances, article L243-2 : attestation d’assurance décennale à
  joindre aux devis et factures des professionnels concernés :
  <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031010272>
- Service Public Entreprendre : le SIREN comporte neuf chiffres et le SIRET
  quatorze chiffres ; le SIRET identifie l’établissement :
  <https://entreprendre.service-public.fr/vosdroits/F32135>
- DGCCRF : les coordonnées des parties font partie des informations usuelles
  d’un devis : <https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/devis>
