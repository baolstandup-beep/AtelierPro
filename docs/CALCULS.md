# Définition des indicateurs

Tous les calculs sont faits en base (`supabase/migrations/…_reports.sql`) sur les données réelles. Les montants sont des entiers FCFA (`bigint`), sans flottant. Les périodes sont des intervalles [début, fin[ calculés en heure de Dakar (UTC+0).

| Indicateur | Définition |
| --- | --- |
| **Chiffre d'affaires brut** | Somme des lignes nettes (après remises) des ventes **validées** créées sur la période. Les ventes annulées sont exclues. |
| **Retours** | Valeur nette (remise incluse) des articles retournés sur la période, datée du jour du retour. |
| **Chiffre d'affaires net** | CA brut − retours. C'est le « chiffre d'affaires » affiché au tableau de bord. |
| **Nombre de ventes / panier moyen** | Ventes validées de la période ; panier moyen = CA brut / nombre de ventes. |
| **Encaissements** | Paiements effectivement reçus sur la période (ventes et règlements de créances), hors utilisation d'avoirs. |
| **Encaissements nets** | Encaissements − remboursements versés (hors avoirs). Une vente à crédit n'est **pas** un encaissement : seul l'acompte l'est ; le règlement ultérieur est compté le jour où il est reçu. |
| **Crédit accordé** | Reste à payer des ventes de la période. |
| **Coût des marchandises vendues (CMV)** | Σ (coût d'achat enregistré **sur la ligne au moment de la vente** × quantité) − coût des articles retournés. Un changement ultérieur du prix d'achat ne modifie pas l'historique. |
| **Marge brute** | CA net − CMV. Exemple : acheté 5 000, vendu 8 000 → marge brute unitaire 3 000 FCFA (testé). |
| **Dépenses** | Dépenses non annulées dont la date de dépense est dans la période. |
| **Bénéfice estimé** | Marge brute − dépenses. |
| **Valeur du stock** | Σ (stock positif × dernier coût d'achat enregistré). Instantané, indépendant de la période. |
| **Créances clients** | Σ des restes à payer des ventes validées. |
| **Dettes fournisseurs** | Marchandises **reçues** − règlements versés (une commande non reçue n'est pas une dette ; un acompte supérieur apparaît en négatif). |

## Règles de détail

- **Remise globale** : répartie au prorata des lignes, le reliquat d'arrondi sur la ligne la plus importante. La somme des lignes est toujours égale au total.
- **Retour partiel** : valeur = arrondi(montant net de la ligne × qté retournée / qté vendue) ; la dernière unité retournée reprend le reliquat exact, si bien que la somme des retours d'une ligne égale exactement son montant (ex. 22 000 sur 3 unités → 7 333 + 7 333 + 7 334).
- **Retour sur vente à crédit** : la valeur retournée annule d'abord le reste à payer, seul le surplus est remboursé.
- **Coût d'achat à la réception** : par défaut, la réception remplace le prix d'achat de la variante par le dernier coût reçu (case décochable). Ce n'est pas un coût moyen pondéré.

## Limites comptables du bénéfice estimé

Ce n'est pas un résultat comptable : il ignore la variation de stock valorisée, les amortissements, les impôts et taxes, les charges non saisies et les écarts de caisse. Pour une comptabilité officielle (SYSCOHADA), exportez les rapports CSV pour votre comptable.
