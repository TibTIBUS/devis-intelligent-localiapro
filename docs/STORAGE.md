# Stockage V1

## Logos d’entreprise

STORAGE-001 crée le bucket privé `organization-assets`. Chaque logo utilise un
chemin stable :

```text
organizations/{organizationId}/logo/logo
```

Les politiques RLS autorisent uniquement un membre de l’organisation à lire,
créer ou remplacer cet objet. Aucune politique de suppression ou d’accès
anonyme n’est accordée.

Le bucket et la Server Action appliquent une limite de 2 Mo et acceptent
uniquement JPEG, PNG et WebP. La validation serveur vérifie également la
signature binaire du fichier afin de ne pas faire confiance au type MIME envoyé
par le navigateur. SVG est volontairement exclu à cause de son contenu actif.

La limite des Server Actions Next.js est fixée à 3 Mo pour absorber l’enveloppe
du formulaire tout en conservant la limite métier de 2 Mo sur le fichier.
