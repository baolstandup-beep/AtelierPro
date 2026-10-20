# Impression des tickets, PDF, étiquettes et lecteurs de codes-barres

L'impression passe par le navigateur (aucun pilote spécifique dans l'application). Les pages d'impression ont leur propre format de page (`@page`).

## Tickets de caisse

- Après une vente : **Imprimer le ticket** ouvre `/tickets/<vente>` et lance l'impression.
- À tout moment : fiche de la vente → **Ticket**. Justificatif de retour : `/tickets/retour/<retour>`.
- Formats proposés en haut de la page : **80 mm**, **58 mm**, **A4**.
- Le ticket affiche les montants **enregistrés en base** : articles, remise, total, moyens de paiement et montants, monnaie rendue, reste à payer, remboursements, numéro et code-barres de la vente.

### Imprimante thermique (USB / Bluetooth / réseau)

1. Installez l'imprimante dans le système (Windows, macOS, Android via l'application du fabricant ou le service d'impression).
2. Dans la boîte d'impression du navigateur : choisissez l'imprimante, **Marges : aucune**, **Échelle : 100 %**, décochez « En-têtes et pieds de page ».
3. Chrome mémorise ces réglages pour les impressions suivantes.
4. Pour imprimer sans boîte de dialogue sur un poste dédié (Windows) : lancez Chrome avec `--kiosk-printing`.

### PDF

Dans la boîte d'impression : destination **« Enregistrer au format PDF »** (format A4 conseillé pour l'envoyer par WhatsApp ou e-mail). Les rapports se transforment en PDF de la même façon (bouton **PDF**).

## Étiquettes code-barres

Produits → **Étiquettes** (ou fiche produit → Étiquettes, quantités préremplies au stock).

- **Rouleau 50 × 30 mm** pour imprimante d'étiquettes, ou **planche A4 3 × 8 (70 × 37 mm)**.
- Contenu : nom, variante, boutique, code-barres **Code 128**, prix (option).
- Codes internes : 12 chiffres commençant par `200`, générés et garantis uniques par la base. **Ce ne sont pas des GTIN/EAN GS1 officiels** : ils ne servent qu'à la boutique. Un article qui a déjà un code fabricant (EAN-13 du parfum, etc.) garde ce code.
- Réglages d'impression : marges aucune, échelle 100 %, papier = format de l'étiquette.

## Lecteurs de codes-barres

### Douchette USB ou Bluetooth (recommandé)

Les douchettes fonctionnent comme un clavier : la caisse place le curseur dans le champ de recherche, la douchette tape le code puis « Entrée », l'article s'ajoute au ticket ; un second scan augmente la quantité.

- Configurez la douchette pour envoyer **Entrée** (suffixe CR) après le code (réglage d'usine le plus courant).
- **Clavier AZERTY** : une douchette réglée en QWERTY tape `é&&"'(…` au lieu de `211345…`. L'application corrige automatiquement ce cas pour les codes numériques ; le mieux reste de régler la douchette en AZERTY France (code de configuration dans son manuel).
- Le champ de recherche reprend le focus après chaque ajout.

### Caméra du téléphone ou de la tablette

Bouton caméra à côté du champ de recherche. Le navigateur demande l'autorisation ; elle est requise une fois par appareil.

- Nécessite **HTTPS** (c'est le cas sur Vercel).
- Utilise le détecteur natif du navigateur (Chrome Android) ou, à défaut, la bibliothèque ZXing.
- Si l'appareil ou le navigateur ne le permet pas, ou si l'autorisation est refusée, un message l'indique : utilisez alors la douchette ou la saisie manuelle.
