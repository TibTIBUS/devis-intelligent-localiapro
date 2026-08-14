# Assistant IA

## AI-001 — socle texte

L’assistant du devis utilise l’API OpenAI Responses exclusivement côté serveur. Le modèle texte est choisi avec `OPENAI_TEXT_MODEL`; la clé reste dans `OPENAI_API_KEY` et n’est jamais exposée au navigateur.

Le premier périmètre est volontairement en lecture seule. Il fournit un seul outil strict, `search_catalog`, qui appelle un service métier limité à l’entreprise authentifiée. L’identifiant de l’entreprise est déterminé par le serveur et ne fait jamais partie des arguments contrôlés par le modèle.

Le contexte transmis est minimisé au devis actif et aux dix derniers messages. Les prix éventuellement cités proviennent du catalogue. Les calculs, règles fiscales et règles de conformité restent déterministes dans le backend.

Références officielles :

- https://developers.openai.com/api/docs/guides/function-calling
- https://developers.openai.com/api/docs/guides/structured-outputs

## AI-002 — ajout contrôlé d’une prestation catalogue

`add_quote_line` est un outil strict de préparation : son appel par le modèle ne modifie jamais le devis. Le serveur relit la prestation dans le catalogue de l’entreprise authentifiée et ne produit une proposition que si un prix HT existe. Le modèle ne reçoit ni ne choisit le prix et ne choisit pas le taux de TVA.

L’artisan confirme séparément la quantité, la nature de ligne et le taux de TVA. Une fonction PostgreSQL `security invoker` relit alors le catalogue, contrôle le devis brouillon par RLS, ajoute la ligne et journalise l’action dans une même transaction. Les totaux restent calculés par le moteur métier existant après relecture du devis.

L’annulation vise uniquement le dernier ajout IA du même utilisateur. La ligne est supprimée, mais la trace d’audit est conservée avec sa date d’annulation.

## AI-003 — modification et suppression contrôlées

`update_quote_line` et `delete_quote_line` préparent une action sur une ligne identifiée dans le contexte minimal du devis actif. Ils ne font aucune écriture. La modification IA est volontairement limitée à la quantité et à la nature de ligne : le prix unitaire, la TVA, le libellé et l’unité ne sont jamais choisis par le modèle.

Après confirmation explicite, une fonction PostgreSQL `security invoker` verrouille la ligne, vérifie le devis brouillon par RLS, applique l’action et enregistre l’état antérieur dans la même transaction. Une suppression conserve ainsi un instantané complet permettant de restaurer la ligne.

L’annulation cible la dernière action IA non annulée du même utilisateur. Une modification n’est restaurée que si la ligne possède encore exactement l’état écrit par l’assistant, afin de ne jamais écraser une correction manuelle ultérieure.

## AI-004 — la voix est une entrée/sortie, jamais un nouveau système

L’assistant vocal ne duplique pas la logique métier : il enveloppe la même route de conversation (`/api/ai/quote-assistant`), les mêmes outils et le même contrat proposition/confirmation. La transcription (`/api/ai/voice/transcribe`, `OPENAI_TRANSCRIPTION_MODEL`) et la synthèse (`/api/ai/voice/speak`, `OPENAI_TTS_MODEL`) sont de simples adaptateurs texte ⇄ audio autour de cette conversation existante.

L’échange se fait tour par tour (appui, parole, relâchement), et non en flux continu façon appel téléphonique : plus fiable dans un environnement bruyant, et chaque tour repasse par les mêmes validations Zod que le canal texte.

## AI-005 — confirmation vocale déterministe, jamais par le modèle

La décision d’exécuter une proposition à la voix ne passe jamais par le LLM. `matchVoiceConfirmation` (`lib/ai/voice-confirmation.ts`) est une correspondance stricte sur un petit ensemble de formulations fermées (« je confirme », « oui », « j’annule », « non »…) ; toute formulation en dehors de cet ensemble renvoie « unclear » et redemande plutôt que d’agir. La relecture systématique du contenu exact avant chaque confirmation reste le garde-fou principal : un « oui » n’est accepté qu’en réponse directe à cette relecture, jamais comme déclencheur autonome.

Pour l’ajout d’une ligne catalogue, le taux de TVA doit être énoncé explicitement dans le même tour de parole (`extractVoiceVatRate`) : l’assistant ne le complète, ni ne le déduit jamais. Sans taux clairement reconnu, aucune confirmation n’est possible.

Deux outils supplémentaires suivent le même contrat proposition/confirmation que le reste de l’assistant : `request_finalize_quote` (aucun argument, le serveur revérifie seul la conformité) et `request_send_quote_email` (un identifiant de contact exact fourni dans le contexte, jamais une adresse dictée ou recomposée par le modèle). L’envoi relit l’adresse en base au moment de la confirmation, jamais celle proposée par le modèle.

## AI-006 — exécution immédiate et multi-actions

À compter du 14 août 2026, la décision produit change : les confirmations séparées décrites dans AI-002, AI-003 et AI-005 ne sont plus requises pour les commandes adressées à l’assistant. La demande explicite de l’artisan constitue l’ordre d’exécution.

Le modèle peut demander plusieurs outils dans un même tour. Le serveur exécute les appels séquentiellement et chaque opération reste soumise aux mêmes contrôles d’authentification, d’organisation, de RLS et de statut brouillon. Les prix des nouvelles lignes sont toujours relus depuis le catalogue au moment de l’écriture et aucun total n’est accepté depuis le modèle.

Une nouvelle ligne catalogue peut être enregistrée avec une TVA `null` lorsque le taux n’est pas connu. Cette absence reste explicite : le moteur financier ne produit pas de TTC officiel et la conformité bloque la finalisation tant que le taux n’est pas complété. L’assistant n’invente donc toujours jamais la TVA.

Pour une demande comportant plusieurs prestations, l’assistant peut effectuer plusieurs recherches catalogue puis plusieurs ajouts au cours du même échange. Les éléments ambigus, absents du catalogue ou sans prix ne sont pas inventés : ils sont ignorés ou signalés dans le résumé final.

La finalisation reste contrôlée par le moteur de conformité côté serveur et l’envoi par e-mail relit toujours le contact exact en base. L’immuabilité des devis finalisés, les calculs déterministes et les limites d’accès multi-entreprises restent inchangés.
