# AtelierPro : journal de critique (9:16)

## Round 1
| hook | read | motion | variety | brand | sync | min |
|  5   |  4   |   6    |    6    |   6   |  –   |  4  |

1. [b0-8] Typo du problème trop petite et tassée en haut, 2/3 du cadre vide ; 3 phrases barrées empilées = bouillie. -> Une phrase à la fois, ~140 px, barrée puis éjectée vers le haut ; stitch sous le texte.
2. [b20-28] `cover()` affichait toute la section_02 en vignette au lieu de la photo. -> `coverRect()` sur la zone photo réelle.
3. [b52-58] Stats « +48 000 » chevauchent le téléphone ; [b58] flèche du CTA mord sur le texte. -> Téléphone réduit/abaissé, flèche placée d'après la largeur mesurée du texte.

## Round 2
| hook | read | motion | variety | brand | sync | min |
|  7   |  7   |   8    |    7    |   8   |  9   |  7  |

1. [b20-27] La photo embarque son titre « Gabarits spécialisés… » coupé au bord. -> Rect photo limité à 640 px de haut.
2. [b28-35] Plan 6 = même cadrage que le plan 5, carte qui descend dans la zone UI Reels. -> Zoom 2x sur l'écran de l'app dans la photo, carte réduite et remontée.
3. [b58] Première image de la carte de fin vide ; pastilles d'onglet illisibles à taille téléphone. -> Springs démarrés à 57.75 ; pastilles 42 px.
Sync : 38/43 hits < 20 ms, médiane 2,3 ms ; les 5 écarts sont des whooshes/swells (onset avant le pic, voulu). Mix -14,1 LUFS / -1,3 dBTP.

## Round 3
| hook | read | motion | variety | brand | sync | min |
|  8   |  8   |   8    |    8    |   8   |  9   |  8  |

1. [b0] L'image 0 ne montre qu'un mot. -> Le stitch se dessine dès l'image 0.
2. [b36-38] Moitié basse vide 2 temps. -> Notification et compteur avancés d'un demi-temps.
3. [b52-58] Téléphone trop petit, puis collision avec le label. -> Téléphone pleine largeur, abaissé.
Plus long intervalle sans événement : b12-b13 / b48-b51.6 (1,7 s).
Reste (connu) : plans 5-8 utilisent la landing en attendant les vraies captures de l'app ; les cartes du plan 8 restent petites à taille téléphone.
Verdict : READY
