# Validation restante pour Claude

Dernière mise à jour : 2026-08-14
Branche : `claude/site-analysis-yjst0r`

## Changement AI-006 — commandes immédiates et multi-actions

Le propriétaire du produit a demandé de supprimer les confirmations séparées de l’assistant et de permettre plusieurs actions dans une seule commande vocale ou texte.

Implémentation actuelle :

- `lib/ai/quote-assistant.ts` accepte les appels d’outils parallèles et exécute les mutations immédiatement côté serveur ;
- plusieurs recherches catalogue et plusieurs ajouts peuvent être traités dans le même tour ;
- les prix sont toujours relus depuis le catalogue ;
- une nouvelle ligne peut être créée avec une TVA `null` afin que l’IA n’invente jamais un taux ;
- la conformité bloque toujours la finalisation si une TVA manque ;
- les devis finalisés restent immuables ;
- la migration `20260814190000_allow_ai_catalog_line_without_vat.sql` a été appliquée au projet Supabase et vérifiée dans une transaction avec rollback ;
- le build Netlify du code correspondant est passé avec succès.

## Validation locale encore impossible dans cette session ChatGPT

Cette session ne peut toujours pas exécuter localement la chaîne complète obligatoire. Claude doit exécuter :

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Puis tester au minimum :

1. commande vocale « ajoute 6 prises de courant, 3 interrupteurs et 8 spots » ;
2. vérifier que toutes les prestations clairement trouvées sont ajoutées sans question de confirmation ;
3. vérifier que les prestations absentes ou ambiguës sont signalées sans invention ;
4. vérifier que les nouvelles lignes sans TVA apparaissent dans le brouillon mais empêchent la finalisation ;
5. vérifier une commande combinée avec remise/acompte ;
6. vérifier modification et suppression d’une ligne sans confirmation séparée ;
7. vérifier finalisation conforme et envoi e-mail explicite ;
8. vérifier que l’annulation/undo des actions réversibles reste cohérente avec le nouveau flux sans confirmation.

Ne pas modifier `main` et ne pas force-push.
