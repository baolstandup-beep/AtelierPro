export interface PublicModel {
  id: string;
  name: string;
  category: 'HOMME' | 'FEMME' | 'MARIAGE' | 'CEREMONIE' | 'CASUAL';
  garmentType: string;
  basePrice: number;
  estimatedDays: number;
  recommendedFabrics: string[];
  fabricMetersNeeded: number;
  description: string;
  features: string[];
  imageUrl: string;
  badge?: string;
}

export interface PublicWorkshop {
  id: string;
  name: string;
  tagline: string;
  city: string;
  neighborhood: string;
  country: string;
  phone: string;
  whatsapp: string;
  address: string;
  rating: number;
  reviewsCount: number;
  specialties: string[];
  avatarUrl: string;
  coverUrl: string;
  isVerified: boolean;
  openingHours: string;
  plan: 'BUSINESS_EVOLUTIF' | 'PRO' | 'STARTER' | 'FREE';
  isSponsored: boolean; // Pub / Mise en avant payante
  models: PublicModel[];
}

export const ALL_WORKSHOPS: PublicWorkshop[] = [
  {
    id: 'at-dakar-01',
    name: 'Atelier Royal Bazin & Haute Confection',
    tagline: 'Spécialiste des grands boubous brodés et bazin riche d’exception.',
    city: 'Dakar',
    neighborhood: 'Almadies',
    country: 'Sénégal',
    phone: '+221 77 654 32 10',
    whatsapp: '221776543210',
    address: 'Route des Almadies, en face de la Brioche Dorée, Dakar',
    rating: 4.9,
    reviewsCount: 128,
    specialties: ['Bazin Riche', 'Grand Boubou', 'Broderie Fil de Soie', 'Cérémonie'],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1200&q=80',
    isVerified: true,
    openingHours: 'Lun - Sam : 08h30 - 19h30',
    plan: 'BUSINESS_EVOLUTIF',
    isSponsored: false,
    models: [
      {
        id: 'mod-royal-01',
        name: 'Grand Boubou 3 Pièces Royal Getzner',
        category: 'HOMME',
        garmentType: 'BOUBOU',
        basePrice: 95000,
        estimatedDays: 7,
        recommendedFabrics: ['Bazin Riche Getzner GAGNANT', 'Soie Brodée'],
        fabricMetersNeeded: 10,
        description: 'Boubou d’apparat col officier avec broderies royales dorées exécutées au fil de soie. Ensemble complet 3 pièces.',
        features: ['Broderies col & poitrine', 'Pantalon à coupe moderne', 'Tissu teinté à la main'],
        imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
        badge: 'Bestseller Cérémonie',
      },
      {
        id: 'mod-royal-02',
        name: 'Robe de Soirée Sirène Bazin Brodée',
        category: 'MARIAGE',
        garmentType: 'ROBE',
        basePrice: 120000,
        estimatedDays: 10,
        recommendedFabrics: ['Bazin Super Vainqueur', 'Dentelle de Calais'],
        fabricMetersNeeded: 6,
        description: 'Robe ajustée avec traîne élégante, détails en broderie perlée et encolure prestige.',
        features: ['Perles cousues main', 'Fermeture invisible', 'Doublure en soie italienne'],
        imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80',
        badge: 'Collection Haute Couture',
      },
    ],
  },
  {
    id: 'at-dakar-02',
    name: 'Maison de Couture Coumba & Styles',
    tagline: 'Robes de mariée traditionnelles, kaftans raffinés et tailleurs pour femmes.',
    city: 'Dakar',
    neighborhood: 'Plateau',
    country: 'Sénégal',
    phone: '+221 78 123 45 67',
    whatsapp: '221781234567',
    address: 'Avenue Lamine Guèye x Rue Jules Ferry, Dakar Plateau',
    rating: 4.8,
    reviewsCount: 94,
    specialties: ['Mariage', 'Kaftan', 'Robe de Soirée', 'Wax Chic'],
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&q=80',
    isVerified: true,
    openingHours: 'Mar - Dim : 09h00 - 20h00',
    plan: 'PRO',
    isSponsored: true, // Payé l'option Pub / Epinglé
    models: [
      {
        id: 'mod-coumba-01',
        name: 'Kaftan Royal Velours & Broderie Zardozi',
        category: 'MARIAGE',
        garmentType: 'KAFTAN',
        basePrice: 135000,
        estimatedDays: 12,
        recommendedFabrics: ['Velours de Soie', 'Satin Duchesse'],
        fabricMetersNeeded: 5,
        description: 'Kaftan somptueux aux finitions dorées artisanales, ceinture bijoux sur-mesure incluse.',
        features: ['Ceinture artisanale brodée', 'Manches évasées', 'Cristaux de Bohême'],
        imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
        badge: 'Coup de Cœur Mariage',
      },
      {
        id: 'mod-coumba-02',
        name: 'Ensemble Tailleur Wax VIP & Soie',
        category: 'CASUAL',
        garmentType: 'ENSEMBLE',
        basePrice: 45000,
        estimatedDays: 4,
        recommendedFabrics: ['Wax Vlisco', 'Crépon de Soie'],
        fabricMetersNeeded: 4,
        description: 'Veste cintrée avec revers en soie naturelle et pantalon droit taille haute.',
        features: ['Coupe moderne buisness', 'Wax hollandais authentique', 'Boutons nacrés'],
        imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
      },
    ],
  },
  {
    id: 'at-abidjan-01',
    name: 'Atelier Elegance Abidjan',
    tagline: 'Maître tailleur spécialisé en costumes sur-mesure et tenues de gala.',
    city: 'Abidjan',
    neighborhood: 'Cocody Riviera 3',
    country: 'Côte d’Ivoire',
    phone: '+225 07 08 09 10 11',
    whatsapp: '2250708091011',
    address: 'Boulevard de France, près de l’École Américaine, Cocody',
    rating: 5.0,
    reviewsCount: 67,
    specialties: ['Costume Sur-Mesure', 'Veste Blazer', 'Tissu Kita', 'Chemise Prestige'],
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&q=80',
    isVerified: true,
    openingHours: 'Lun - Sam : 08h00 - 18h30',
    plan: 'BUSINESS_EVOLUTIF',
    isSponsored: false,
    models: [
      {
        id: 'mod-abidjan-01',
        name: 'Costume 3 Pièces Laine Italienne & Kita',
        category: 'HOMME',
        garmentType: 'COSTUME',
        basePrice: 160000,
        estimatedDays: 8,
        recommendedFabrics: ['Laine Super 140s', 'Pagne Kita Tissé'],
        fabricMetersNeeded: 4,
        description: 'Costume croisé sur-mesure rehaussé de touches discrètes en pagne Kita ivoirien au niveau des poches et revers.',
        features: ['Entoilage traditionnel semi-traditionnel', 'Boutonnières fonctionnelles', 'Gilet ajusté'],
        imageUrl: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&q=80',
        badge: 'Luxe Sur-Mesure',
      },
    ],
  },
  {
    id: 'at-thies-01',
    name: 'Atelier Thiès Couture Création',
    tagline: 'Confection rapide et soignée de boubous et tenues du quotidien.',
    city: 'Thiès',
    neighborhood: 'Cité Lamy',
    country: 'Sénégal',
    phone: '+221 70 999 88 77',
    whatsapp: '221709998877',
    address: 'Rue de la Gare, Thiès',
    rating: 4.7,
    reviewsCount: 52,
    specialties: ['Boubou Rapide', 'Tissu Voile', 'Broderie Machine', 'Prêt-à-porter'],
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1200&q=80',
    isVerified: false,
    openingHours: 'Lun - Sam : 08h00 - 20h00',
    plan: 'STARTER', // Ne dispose pas du plan Business Évolutif et n'a pas payé pour la Pub => Non affiché
    isSponsored: false,
    models: [
      {
        id: 'mod-thies-01',
        name: 'Boubou Simple Lin & Coton Brodé',
        category: 'HOMME',
        garmentType: 'BOUBOU',
        basePrice: 35000,
        estimatedDays: 3,
        recommendedFabrics: ['Lin Italien', 'Coton Glacé'],
        fabricMetersNeeded: 5,
        description: 'Boubou léger 2 pièces parfait pour le vendredi ou le quotidien, broderie fine sur l’encolure.',
        features: ['Tissu respirant', 'Confection express 72h', 'Broderie ton sur ton'],
        imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80',
      },
    ],
  },
];

// Strictly filter workshops displayed in the Public Directory and Homepage Showcase:
// Only workshops with 'BUSINESS_EVOLUTIF' plan OR 'isSponsored === true' (Pub Option)
export const PUBLIC_WORKSHOPS: PublicWorkshop[] = ALL_WORKSHOPS.filter(
  (w) => w.plan === 'BUSINESS_EVOLUTIF' || w.isSponsored
);
