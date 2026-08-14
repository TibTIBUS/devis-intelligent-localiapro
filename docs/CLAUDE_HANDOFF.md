# Passation pour Claude

Dernière mise à jour : 2026-08-14
Branche de travail : `claude/site-analysis-yjst0r`
Commit de référence au début de l’analyse : `97be60ce478a2d05138838a3199946efdecab096`

## Règle de reprise

Ne jamais travailler sur `main` directement. Lire `docs/DECISIONS.md` et `docs/AI.md` avant toute modification. Respecter l’architecture existante : le frontend est non fiable, toutes les autorisations sont revérifiées côté serveur, le LLM ne calcule ni prix ni TVA, la confirmation vocale reste déterministe, les devis finalisés restent immuables.

Après toute modification de code, exécuter avant commit :

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Ne committer et pousser sur `claude/site-analysis-yjst0r` que si tout est vert. Ne jamais force-push.

## État validé en production

La création des catégories et des prestations fonctionne désormais en production. La correction du commit `97be60c` est donc validée par l’utilisateur.

## Travail UI — aperçu du devis pendant la saisie vocale

Le 14 août 2026, l’utilisateur a validé une maquette montrant :

- assistant vocal à gauche et aperçu du devis à droite sur desktop ;
- aperçu sous l’assistant sur mobile ;
- mise à jour du devis après chaque action vocale confirmée ;
- rendu visuel moderne proche d’une feuille A4 sans prétendre générer le PDF officiel pendant le brouillon.

Implémentation réalisée sur `claude/site-analysis-yjst0r` :

- `components/quotes/quote-live-preview.tsx` ajouté ;
- `app/(app)/devis/[quoteId]/voix/page.tsx` transforme la page en grille responsive et charge devis, client et informations légales ;
- `components/voice/voice-quote-assistant.tsx` restylé selon la maquette avec grand bouton noir, icône micro, statut et historique ;
- la mise à jour repose sur le `router.refresh()` déjà exécuté après chaque confirmation, donc l’aperçu relit les données serveur et les totaux déterministes existants ;
- aucun prix, TVA ou total n’est inventé côté client ;
- le vrai PDF reste réservé au snapshot finalisé conformément à `PDF-001`.

Commits UI :

- `ddc1ea19db05a603971abd170ef484d5c7568c52` — composant d’aperçu ;
- `9e97005fa155f128b1306cf12e46d6658fd18843` — intégration responsive ;
- `4a71a22636a4f00ca824506bf6bc503728930290` — restylage assistant vocal.

Une PR brouillon `#1` a été ouverte uniquement pour tenter de déclencher la CI, sans intention de fusion dans `main`. GitHub Actions n’a pas démarré au moment de cette passation. En revanche, le statut Netlify du commit `4a71a226...` indique un deploy preview réussi, ce qui confirme au minimum que le build Netlify a terminé avec succès. Attention : cette présence d’un deploy preview contredit la règle `DEPLOY-005` qui indique qu’ils doivent être désactivés ; vérifier la configuration Netlify avant toute utilisation de ce mécanisme comme environnement de test.

### Validation restant à faire par Claude/Codex

Exécuter localement sur `claude/site-analysis-yjst0r` :

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Puis corriger toute erreur éventuelle, avec attention particulière à `components/quotes/quote-live-preview.tsx` et aux classes responsive. Tester manuellement desktop + mobile : maintien du bouton, proposition, confirmation, ajout de ligne, remise/acompte, et rafraîchissement visuel du devis.

## Priorité actuelle — annulation des actions IA / vocales

Une analyse du code actuel a montré que le briefing initial était partiellement en retard :

- `undo_last_ai_quote_action` sait déjà annuler `add_quote_line`, `update_quote_line`, `delete_quote_line`, `set_discount`, `set_deposit`, `set_payment_terms`, `set_validity`, `set_worksite_address` et `update_quote_note`.
- Les actions `finalize_quote` et `send_quote_email` ne sont pas journalisées dans `quote_ai_actions` par la route de confirmation actuelle.
- La fonction `undo_last_ai_quote_action` commence par exiger que le devis soit encore en statut `draft`.
- Après une finalisation réussie, le devis devient immuable et n’est donc plus `draft`. Il ne faut surtout pas rendre la finalisation annulable en cassant cette immutabilité.

Fichiers inspectés :

- `docs/DECISIONS.md`
- `docs/AI.md`
- `supabase/migrations/20260807235500_fix_ai_quote_action_undo_reference.sql`
- `supabase/migrations/20260808000200_control_ai_quote_financial_rates.sql`
- `app/api/ai/quote-actions/confirm/route.ts`
- `lib/quotes/ai-actions.ts`
- `components/voice/voice-quote-assistant.tsx`

### À faire par Claude lorsque l’environnement d’exécution est disponible

1. Reproduire précisément le comportement d’« annulation » après une finalisation ou un envoi d’e-mail depuis le canal vocal et le canal texte.
2. Déterminer si l’UI ou le modèle propose encore une annulation après une action irréversible.
3. Corriger le comportement sans rendre la finalisation ni l’envoi d’e-mail réversibles.
4. Préférer une logique où seules les actions réellement réversibles sont exposées comme annulables, plutôt que d’assouplir la contrainte `draft` ou l’immutabilité du devis.
5. Ajouter des tests de non-régression couvrant au minimum :
   - annulation d’une remise ;
   - annulation d’un acompte ;
   - annulation d’une modification de ligne ;
   - comportement après finalisation ;
   - comportement après envoi d’e-mail ;
   - absence de possibilité de revenir sur un devis finalisé.
6. Si une migration SQL est nécessaire, créer un nouveau fichier dans `supabase/migrations/` avec un timestamp supérieur à `20260814130000`. Ne pas supposer la migration appliquée en production tant que l’utilisateur ne l’a pas confirmé.

## Limitation actuelle de cette session ChatGPT

La session peut lire et écrire dans GitHub via le connecteur, mais ne dispose pas actuellement d’un environnement local exploitable permettant de cloner/exécuter le projet avec ses dépendances et de lancer de manière fiable la chaîne obligatoire `npm ci`, `lint`, `typecheck`, `test`, `build` avant un commit de code.

En conséquence, ChatGPT peut continuer à analyser le dépôt, proposer des corrections, documenter les blocages et préparer les changements. Les tâches qui nécessitent l’exécution locale complète devront être reprises par Claude/Codex ou un autre environnement disposant du dépôt exécutable.

## Priorités suivantes après cette correction

1. Ajouter un rate limiting à `/api/ai/quote-actions/confirm` et `/api/ai/quote-actions/undo`.
2. Corriger `lib/auth/redirects.ts` : `next.includes("\\\\")` doit vérifier un seul antislash avec `next.includes("\\")`, puis ajuster `tests/unit/auth-redirects.test.ts`.
3. Continuer le parcours E2E vocal : client → devis → lignes → remise/acompte → finalisation → e-mail.
4. Durcir la CSP dans `next.config.ts` avec `default-src 'self'` après validation de compatibilité.
