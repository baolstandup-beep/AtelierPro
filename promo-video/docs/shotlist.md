# AtelierPro : liste des plans
30 s · 128 BPM (1 temps = 0,469 s) · 64 temps · format : 9:16 (1080×1920)
Musique : house synthétisée, la dorien, intro 0-8, drop au temps 8, résolution au temps 60 · VO : aucune

Palette (site) : vert `#0F3B32`, crème `#FBF9F5`, encre `#111827`, accent unique ambre `#D97706`.
Typo : dsSans (police du site), 700 pour l'affichage, 500 pour l'UI.
Signature : la ligne de couture pointillée (« stitch ») du DESIGN.md sert de fil conducteur entre les plans.

| # | temps | durée | plan | à l'écran (asset) | mouvement | sortie (transition) | son (hits) |
|---|-------|-------|------|-------------------|-----------|---------------------|------------|
| 1 | 0-4 | 0,00-1,88 | Accroche : le problème | Typo seule sur crème : « Fini les carnets perdus. » (copy du site), mot par mot | chaque mot tombe avec un ressort lourd, léger shake au dernier | une ligne pointillée se dessine de gauche à droite sous la phrase | impact @0, ticks @1 @2 @3 |
| 2 | 4-8 | 1,88-3,75 | Problème, suite | « Les contestations de mesures. » puis « Les retards de livraison. » empilés, rythme 2 temps chacun ; les phrases précédentes se barrent d'un trait rouge | slide vertical rapide, barré animé | la ligne pointillée descend au centre ; des ciseaux (icône du logo) la coupent sur le temps 8 | whoosh @4, swish @6, snip @7.5 |
| 3 | 8-12 | 3,75-5,63 | **Drop** : la marque | Le vert `#0F3B32` envahit l'écran depuis la coupe ; logo ciseaux + « Atelier**Pro** » (Pro en ambre) + « HAUTE CONFECTION » qui se déploie en tracking | logo spring bouncy, sous-titre lettre par lettre | le logo zoome dans le « o » de Pro → crème | sub-boom @8, pop @9, shimmer @10 |
| 4 | 12-20 | 5,63-9,38 | Promesse | Titre du hero « Gérez votre atelier de couture avec précision. » (h1 du site) en haut ; « précision. » en vert avec le soulignement ondulé ambre qui se dessine ; en bas, le couple en tenue bleue détouré de `section_00_...hero.png` monte depuis le bord | mots en cascade, photo push-in 6 % | la photo glisse à gauche, un téléphone entre par la droite | impact @12, pops @13-15, swoosh @19 |
| 5 | 20-28 | 9,38-13,13 | Fonction 1 · Carnet & Gabarits | **Capture app fournie** `assets/app/mesures.png` dans un cadre de téléphone ; étiquette « Mensurations complètes » ; défilé des mesures du site : Carrure · Longueur Bras · Tour de Cou · Poitrine | le téléphone arrive en spring, l'écran défile, les mots-clés défilent en ticker | swipe horizontal vers l'écran suivant dans le même téléphone | click @20, ticks sur chaque mot-clé @22-26 |
| 6 | 28-36 | 13,13-16,88 | Fonction 2 · Suivi Couturiers | **Capture app fournie** `assets/app/production.png` (kanban) ; étiquette « Suivi des couturiers » ; recadrage serré sur une carte qui passe de colonne | caméra qui suit la carte (crop + pan), petit squash à l'arrivée | la carte s'agrandit et devient le fond du plan suivant | whoosh @28, thud @32 |
| 7 | 36-44 | 16,88-20,63 | Fonction 3 · Acomptes & Caisse | **Capture app fournie** `assets/app/paiements.png` ; la notification réelle « Grand Boubou Bazin · Acompte Wave 35 000 FCFA reçu » (crop de `section_02_...png`) tombe en haut ; logos `public/logos/wave.png` + `orange-money.png` | notif en spring avec wobble, montant qui compte jusqu'à 35 000 | flash ambre bref sur le montant → coupe | cash/ding @38, ticks compteur @39-41 |
| 8 | 44-52 | 20,63-24,38 | Fonction 4 · Reçus WhatsApp + tableau de bord | **Captures app fournies** `assets/app/recu-whatsapp.png` puis `assets/app/dashboard.png` ; étiquette « Reçu professionnel partageable sur WhatsApp » | reçu qui glisse, puis zoom arrière vers le dashboard | zoom arrière jusqu'au téléphone en main | send @44, pop @48 |
| 9 | 52-58 | 24,38-27,19 | Preuve | `public/images/roi-simulator-smartphone.png` (téléphone en main) ; chiffres du site : « +500 ateliers actifs » « +48 000 mesures » qui comptent | parallaxe main/téléphone, compteurs | le téléphone sort par le bas, le vert remonte | impact @52, ticks @54-56 |
| 10 | 58-64 | 27,19-30,00 | Carte de fin (2,8 s) | Fond vert, logo AtelierPro, CTA réel « Créer mon atelier gratuitement → », sous-ligne « 0 FCFA · Sans carte bancaire · Wave & Orange Money », URL | logo et CTA en spring, la ligne pointillée se referme autour du CTA | tenue fixe | impact @58, pop @60, résolution musicale @60 |

Format 9:16 :
- Les plans 1, 2, 4 : typo en colonne, 3-4 mots par ligne, corps ≥ 96 px pour la lisibilité sur téléphone.
- Plans 5-8 : le téléphone occupe ~70 % de la hauteur, étiquette au-dessus dans la zone sûre (hors 250 px haut/bas réservés aux interfaces Reels/TikTok).

Plus long intervalle sans nouvel événement : temps 12-16 et 52-56 (1,9 s).

## Captures d'app attendues (à déposer dans `promo-video/assets/app/`)
Captures **mobiles** (portrait, résolution native du téléphone, compte démo rempli de données réalistes) :
1. `mesures.png` : fiche de mensurations d'un client
2. `production.png` : tableau Kanban de production / suivi couturiers
3. `paiements.png` : écran d'une commande avec acompte et solde
4. `recu-whatsapp.png` : reçu tel qu'il apparaît dans WhatsApp (ou l'écran de partage)
5. `dashboard.png` : tableau de bord avec KPIs
