# NALTO — préparation facturation V1

## Statut actuel

La bêta NALTO reste gratuite et aucun paiement n'est activé. Aucun SDK Stripe, produit, prix, clé secrète ou webhook de paiement ne doit être ajouté tant que l'offre commerciale n'est pas validée.

## Principe d'architecture

La facturation est rattachée à l'organisation, jamais directement au navigateur ni à une adresse e-mail. Le frontend ne fait pas autorité sur l'accès aux fonctions payantes.

Source de vérité prévue :

- Stripe pour l'état commercial du paiement ;
- Supabase pour une projection serveur de l'abonnement de l'organisation ;
- contrôles d'accès aux fonctions payantes exécutés côté serveur ;
- webhooks Stripe vérifiés par signature avant toute mise à jour d'état.

## Données minimales à prévoir

Table `organization_subscriptions` :

- `organization_id` — clé étrangère unique vers l'organisation ;
- `provider` — `stripe` ;
- `provider_customer_id` ;
- `provider_subscription_id` ;
- `status` — état normalisé côté NALTO ;
- `plan_key` — identifiant interne stable, indépendant du nom marketing ;
- `current_period_end` ;
- `cancel_at_period_end` ;
- timestamps techniques.

Aucun montant financier de devis artisan ne doit dépendre de cette table.

## Flux V1 recommandé

1. L'artisan choisit une offre depuis NALTO.
2. Le serveur crée une session Stripe Checkout pour l'organisation authentifiée.
3. Stripe gère le paiement et renvoie vers NALTO.
4. NALTO ne débloque pas l'offre sur la seule redirection navigateur.
5. Le webhook Stripe signé met à jour `organization_subscriptions`.
6. Les Server Actions et routes protégées relisent l'entitlement serveur.
7. Le bouton « Gérer mon abonnement » ouvre le Customer Portal Stripe depuis une session créée côté serveur.

## Événements webhook minimaux

À confirmer avec la version Stripe utilisée lors de l'implémentation, mais la V1 devra au minimum traiter les événements qui couvrent :

- création / modification / suppression d'abonnement ;
- paiement de facture réussi ;
- paiement de facture échoué.

Le traitement doit être idempotent et journaliser l'identifiant d'événement Stripe pour éviter les doubles applications.

## Règles de sécurité

- jamais de clé secrète Stripe dans le client ;
- jamais de confiance dans un `plan` transmis par le navigateur ;
- prix Stripe sélectionnés depuis une liste serveur autorisée ;
- organisation vérifiée côté serveur avant création Checkout/Portal ;
- signature webhook obligatoire ;
- RLS sur la projection d'abonnement ;
- aucune modification directe d'abonnement depuis le frontend ;
- aucune suppression de données métier si l'abonnement expire.

## Décisions commerciales nécessaires avant codage

NALTO doit définir avant intégration :

- offre(s) et prix HT ;
- mensuel, annuel ou les deux ;
- période d'essai éventuelle ;
- fonctionnalités incluses par offre ;
- politique de résiliation ;
- comportement en cas d'échec de paiement ;
- traitement TVA/facturation de l'abonnement NALTO.

## Critères de sortie bêta vers V1 payante

La facturation n'est activable que lorsque :

- le parcours artisan complet est validé par E2E isolé ;
- l'authentification est stable ;
- les devis finalisés et leurs snapshots restent immuables ;
- les PDF et envois sont stables ;
- le prix commercial est validé ;
- Checkout, webhook et Customer Portal sont testés en mode Stripe test ;
- aucun webhook ou secret de test n'est utilisé en production.
