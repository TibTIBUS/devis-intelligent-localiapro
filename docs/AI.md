# Assistant IA

## AI-001 — socle texte

L’assistant du devis utilise l’API OpenAI Responses exclusivement côté serveur. Le modèle texte est choisi avec `OPENAI_TEXT_MODEL`; la clé reste dans `OPENAI_API_KEY` et n’est jamais exposée au navigateur.

Le premier périmètre est volontairement en lecture seule. Il fournit un seul outil strict, `search_catalog`, qui appelle un service métier limité à l’entreprise authentifiée. L’identifiant de l’entreprise est déterminé par le serveur et ne fait jamais partie des arguments contrôlés par le modèle.

Le contexte transmis est minimisé au devis actif et aux dix derniers messages. Les prix éventuellement cités proviennent du catalogue. Les calculs, règles fiscales et règles de conformité restent déterministes dans le backend.

Références officielles :

- https://developers.openai.com/api/docs/guides/function-calling
- https://developers.openai.com/api/docs/guides/structured-outputs
