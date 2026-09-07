export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: 'Tendances & Styles' | 'Savoir-faire Atelier' | 'Cérémonie & Mariage' | 'Business & Digital';
  categoryColor: string;
  readTime: string;
  publishedAt: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  image: string;
  tags: string[];
  featured?: boolean;
  content: {
    intro: string;
    sections: {
      subtitle: string;
      paragraph: string;
      bulletPoints?: string[];
    }[];
    conclusion: string;
    proTip: string;
  };
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'bazin-wax-tendances-2026',
    slug: 'bazin-wax-tendances-2026',
    title: 'Tendances Bazin Riche & Wax 2026 : Les coupes royales et broderies en vogue',
    excerpt: 'Découvrez les motifs géométriques, les cols officier asymétriques et les associations soie-bazin qui dominent les défilés et les cérémonies cette saison.',
    category: 'Tendances & Styles',
    categoryColor: 'bg-[#D97706]/15 text-[#D97706] border-[#D97706]/30',
    readTime: '4 min de lecture',
    publishedAt: '05 Septembre 2026',
    featured: true,
    author: {
      name: 'Awa Diallo',
      role: 'Styliste & Rédactrice Mode Dakar',
      avatar: 'AD',
    },
    image: '/images/blog-bazin-wax.jpg',
    tags: ['Bazin Riche', 'Wax Hollandais', 'Haute Couture', 'Cérémonie', 'Broderie'],
    content: {
      intro: "L'année 2026 consacre le retour d'une élégance africaine sculpturale et audacieuse. Entre tradition ancestrale du Bazin teinté artisanalement et touches contemporaines de coupes ajustées, les ateliers de couture d'Afrique de l'Ouest réinventent les codes.",
      sections: [
        {
          subtitle: '1. Le Bazin Gagnoa et Getzner aux broderies dorées fines',
          paragraph: 'Finies les broderies trop lourdes qui masquent le tissu. La tendance actuelle privilégie les broderies fil d\'or et fil de soie subtiles sur les plastrons, les poignets et les fentes latérales.',
          bulletPoints: [
            'Couleurs phares : Vert forêt impérial, Bleu nuit saphir, Ocre doré et Blanc cassé nacré.',
            'Broderies florales stylisées et motifs géométriques mandingues.',
            'Finitions satinées avec repassage à l\'amidon royal.',
          ],
        },
        {
          subtitle: '2. L\'alliance audacieuse Wax & Mousseline de soie',
          paragraph: 'Pour les robes de soirée et ensembles de gala, le mariage du Wax aux imprimés vifs avec des capes en mousseline légère crée un mouvement aérien spectaculaire sur les silhouettes.',
        },
        {
          subtitle: '3. Les coupes asymétriques et épaules structurées',
          paragraph: 'Les clientes recherchent aujourd\'hui des coupes cintrées à la taille avec des épaulettes légères qui confèrent de la stature tout en garantissant un confort parfait lors des grands événements.',
        },
      ],
      conclusion: 'Pour les tailleurs et couturiers, proposer ces modèles en catalogue numérique avec photos d\'inspiration permet de déclencher immédiatement le coup de cœur chez vos clients.',
      proTip: 'Conseil Atelier : Pensez à toujours enregistrer la photo du coupon de tissu directement dans la fiche de mesures sur AtelierPro pour éviter toute inversion lors de la coupe.',
    },
  },
  {
    id: 'boubou-masculin-mesures-parfaites',
    slug: 'boubou-masculin-mesures-parfaites',
    title: 'Grand Boubou Masculin : Les secrets de coupe pour un tombé impérial sans retouche',
    excerpt: 'Longueur d\'épaule, échancrure d\'encolure, aisance poitrine et fentes d\'aisance : le guide des maîtres tailleurs pour réussir du premier coup.',
    category: 'Savoir-faire Atelier',
    categoryColor: 'bg-[#0F3B32]/15 text-[#0F3B32] border-[#0F3B32]/30',
    readTime: '5 min de lecture',
    publishedAt: '02 Septembre 2026',
    featured: true,
    author: {
      name: 'Maître Ousmane Traoré',
      role: 'Maître Tailleur & Formateur',
      avatar: 'OT',
    },
    image: '/images/blog-menswear-ceremony.jpg',
    tags: ['Boubou 3 pièces', 'Coupe Homme', 'Mesures Précises', 'Savoir-faire', 'Atelier'],
    content: {
      intro: 'Le grand boubou 3 pièces masculin (pantalons, chemise ou marinière, et grand manteau boubou) est la pièce maîtresse du dressing traditionnel africain. Pourtant, un défaut de 2 cm sur l\'encolure ou le tombé d\'épaule peut ruiner l\'allure générale.',
      sections: [
        {
          subtitle: '1. La règle d\'or de l\'encolure et du plastron',
          paragraph: 'L\'encolure doit reposer précisément sur les clavicules sans tirer vers l\'arrière ni s\'affaisser sur le torse. Lorsque le client baisse ou lève la tête, le col doit rester stable.',
          bulletPoints: [
            'Mesurer le tour de cou exact + 3 cm d\'aisance pour le col officier intérieur.',
            'Centrer le plastron brodé au millimètre près avant le piquage.',
            'Prévoir un thermocollant respirant de qualité supérieure.',
          ],
        },
        {
          subtitle: '2. L\'amplitude des manches et l\'aisance sous les bras',
          paragraph: 'Le secret d\'un boubou agréable à porter réside dans l\'emmanchure. Trop serrée, elle bloque les mouvements ; trop large, elle crée des plis inesthétiques au repos.',
        },
        {
          subtitle: '3. Le pantalon carotte assorti avec cordon ajustable',
          paragraph: 'La tendance masculine moderne associe le grand boubou à un pantalon fuselé coupe carotte avec une ceinture semi-élastiquée et cordon intérieur pour un confort moderne sans plis superflus à la cheville.',
        },
      ],
      conclusion: 'En digitalisant les gabarits de vos clients réguliers dans AtelierPro, vous pouvez relancer une coupe en 5 minutes sans avoir à re-mesurer le client.',
      proTip: 'Conseil Atelier : Notez toujours la posture du client (épaules tombantes, dos cambré) dans les remarques de la fiche de mesures.',
    },
  },
  {
    id: 'digitaliser-atelier-doubler-commandes-whatsapp',
    slug: 'digitaliser-atelier-doubler-commandes-whatsapp',
    title: 'Comment WhatsApp & le numérique permettent de doubler le chiffre d\'affaires d\'un atelier',
    excerpt: 'Fini les carnets égarés et les impayés : découvrez comment les ateliers modernes utilisent les reçus instantanés et les relances douces.',
    category: 'Business & Digital',
    categoryColor: 'bg-[#25D366]/15 text-[#128C7E] border-[#25D366]/30',
    readTime: '3 min de lecture',
    publishedAt: '28 Août 2026',
    author: {
      name: 'Mamadou Ndiaye',
      role: 'Consultant Croissance & PME',
      avatar: 'MN',
    },
    image: '/images/atelier-tailor-digital.jpg',
    tags: ['WhatsApp Business', 'Gestion Financière', 'Acomptes', 'Fidélisation', 'Afrique'],
    content: {
      intro: 'La gestion d\'un atelier de couture ne se résume pas à l\'aiguille et au fil. Les maîtres tailleurs les plus prospères sont ceux qui apportent une expérience client irréprochable et gèrent leur trésorerie avec rigueur.',
      sections: [
        {
          subtitle: '1. La fin des carnets papier qui s\'égarent ou s\'abîment',
          paragraph: 'Le carnet papier classique court le risque d\'être taché, perdu ou indéchiffrable par vos apprentis. Une base de données cloud accessible sur smartphone garantit un accès instantané aux mensurations.',
        },
        {
          subtitle: '2. L\'impact psychologique du reçu WhatsApp immédiat',
          paragraph: 'Envoyer un reçu professionnel avec le montant total, l\'acompte versé (Wave/Orange Money) et le solde restant immédiatement après la commande valorise l\'image de marque de votre atelier et rassure le client.',
          bulletPoints: [
            'Transparence totale sur les montants.',
            'Date de livraison gravée et acceptée par les deux parties.',
            'Réduction de 80% des contestations lors du retrait.',
          ],
        },
        {
          subtitle: '3. Les rappels automatiques 48h avant l\'essayage',
          paragraph: 'Un message cordial envoyé via WhatsApp prévenant que la tenue est prête pour l\'essayage permet au client de préparer son solde restant avant de venir à l\'atelier.',
        },
      ],
      conclusion: 'Passer au numérique ne prend que quelques minutes par jour et transforme durablement la rentabilité de votre entreprise.',
      proTip: 'Conseil Atelier : Utilisez le bouton WhatsApp 1-clic d\'AtelierPro pour envoyer vos notifications sans avoir à recopier le numéro.',
    },
  },
  {
    id: 'robes-mariee-africaine-couture-2026',
    slug: 'robes-mariee-africaine-couture-2026',
    title: 'Mariages Coutumiers & Religieux : Les styles de robes et parures les plus demandés',
    excerpt: 'De la robe sirène en dentelle perlée au grand ensemble royal en Bazin teinté indigo : panorama des confections nuptiales incontournables.',
    category: 'Cérémonie & Mariage',
    categoryColor: 'bg-[#9333EA]/15 text-[#9333EA] border-[#9333EA]/30',
    readTime: '4 min de lecture',
    publishedAt: '20 Août 2026',
    author: {
      name: 'Fatou Bamba',
      role: 'Styliste Nuptiale Abidjan',
      avatar: 'FB',
    },
    image: '/images/hero-anti-master-tailor.jpg',
    tags: ['Mariage', 'Robe de Mariée', 'Perlage', 'Dentelle', 'Tradition'],
    content: {
      intro: 'Les cérémonies de mariage représentent les commandes à plus forte valeur ajoutée pour un atelier de couture. La mariée attend une perfection absolue sur les finitions, le cintrage et l\'éclat des matières.',
      sections: [
        {
          subtitle: '1. La robe sirène à traîne amovible',
          paragraph: 'Prisée pour la cérémonie civile et religieuse, la robe sirène galbe les courbes avec élégance. La traîne amovible permet à la mariée d\'être majestueuse lors de l\'entrée, puis libre de danser pendant la soirée.',
        },
        {
          subtitle: '2. Le perlage à la main et incrustations de cristaux',
          paragraph: 'Le travail minutieux du perlage artisanal autour de l\'encolure et du dos nu fait toute la différence entre une confection ordinaire et une pièce de haute couture.',
        },
        {
          subtitle: '3. La gestion des 3 étapes d\'essayages',
          paragraph: 'Pour éviter tout stress la veille du mariage, planifiez impérativement 3 dates : essayage de toile brute, essayage du tissu monté, et essayage final 5 jours avant le grand jour.',
        },
      ],
      conclusion: 'Les mariées adorent partager les modèles de votre atelier sur les réseaux sociaux : soignez vos finitions, elles sont votre meilleure publicité.',
      proTip: 'Conseil Atelier : Planifiez les jalons de production sur le tableau Kanban d\'AtelierPro pour ne jamais dépasser la date d\'échéance du mariage.',
    },
  },
];
