# Design de l'application

## Règle produit

L'application doit conserver une identité visuelle cohérente entre toutes les pages. Une page ne doit pas introduire seule un nouveau style de cartes, boutons, champs, espacements, navigation ou hiérarchie typographique.

Avant toute refonte visuelle importante, présenter d'abord une maquette ou un aperçu au propriétaire du produit. Ne coder le changement qu'après validation explicite.

## Direction visuelle validée

La direction de référence est celle utilisée pour les écrans « Devis à la voix » et « Catalogue » validés le 14 août 2026 :

- interface claire, moderne et professionnelle ;
- fonds blancs ou très légèrement teintés ;
- cartes avec bordure discrète, rayon généreux et ombre légère ;
- bleu comme couleur d'action principale, sans surcharger l'écran ;
- titres nets, sous-titres et aides en gris atténué ;
- boutons principaux pleins et boutons secondaires en contour ;
- formulaires espacés, lisibles et regroupés par fonction ;
- informations importantes présentées sous forme de cartes ou de colonnes plutôt que de longs formulaires empilés ;
- icônes simples et cohérentes, actuellement issues de `lucide-react` ;
- desktop pensé en colonnes lorsque cela améliore la lecture ;
- mobile pensé comme un empilement naturel des mêmes blocs, sans créer une interface différente.

## Catalogue — référence de structure

Le catalogue sert de référence pour les pages de gestion :

- en-tête avec titre, description et actions principales ;
- indicateurs synthétiques en haut ;
- colonne de navigation ou de sélection ;
- zone principale de liste ;
- panneau séparé de création/modification ;
- recherche accessible ;
- édition d'un élément sans devoir parcourir une longue page de formulaires.

## Devis à la voix — référence de structure

L'écran vocal sert de référence pour les pages métier à double contexte :

- action principale clairement visible ;
- aperçu du résultat métier à côté sur desktop ;
- aperçu sous l'action principale sur mobile ;
- rafraîchissement depuis les données serveur après confirmation d'une action.

## Cohérence technique

Réutiliser les composants existants avant de créer une variante locale. Lorsqu'un motif revient sur plusieurs pages, préférer un composant partagé plutôt qu'une copie de classes Tailwind.

Le design ne doit jamais contourner les règles métier ou de sécurité : les totaux financiers restent calculés côté serveur avec le moteur déterministe, les permissions restent vérifiées côté serveur et les devis finalisés restent immuables.
