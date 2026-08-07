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
