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
