# Génération PDF

## Périmètre PDF-001

Le PDF est généré côté serveur avec `@react-pdf/renderer` à partir de
`quote_versions.snapshot` et de son `compliance_snapshot`. Le renderer ne
interroge ni le client, ni le catalogue, ni le devis vivant. Les montants sont
recalculés par le même moteur entier que l’éditeur, depuis les lignes du
snapshot.

Le document contient le numéro commercial, les dates, les parties, le lieu
d’exécution, le détail des lignes, les totaux HT/TVA/TTC, l’acompte, les
conditions de déplacement et les mentions d’assurance conservées lors de la
finalisation. Il est rendu au format A4 avec en-tête, tableau, totaux, pied de
page et zones de signature.

Le stockage Supabase, la table `documents` et le téléchargement sécurisé sont
réservés à PDF-002.
