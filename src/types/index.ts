// === Types pour le réseau immobilier off-market ===

export type UserRole = 'buyer' | 'seller' | 'admin';
export type PropertyType = 'apartment' | 'house' | 'villa' | 'land' | 'commercial';
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface User {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  pseudo: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Critère de recherche individuel (un acheteur peut en avoir plusieurs)
export interface SearchCriteria {
  id?: string;
  desired_zone: string;
  desired_property_type: PropertyType;
  budget_max: number;
  desired_surface_min_m2: number;
  desired_surface_max_m2: number;
}

export interface BuyerProfile {
  id: string;
  user_id: string;
  // Critères de recherche multiples
  search_criteria: SearchCriteria[];
  // Anciens champs conservés pour rétro-compatibilité lecture
  desired_zone: string;
  desired_property_type: PropertyType;
  budget_max: number;
  desired_surface_m2: number;
  // Critères financiers
  personal_contribution: number;
  has_pre_approval: boolean;
  debt_ratio: number;
  score: number;
  created_at: string;
  updated_at: string;
}

export type SituationType = 'hyper_centre' | 'peripherie_urbaine' | 'banlieue_proche' | 'village' | 'zone_rurbaine';
export type HouseType = 'individuelle' | 'jumelee' | 'contigue' | 'maitre' | 'autre';
export type CommercialType = 'bureau' | 'commerce' | 'atelier' | 'depot' | 'restaurant' | 'autre';

export const SITUATION_LABELS: Record<SituationType, string> = {
  hyper_centre: 'Bien Hyper-Centré',
  peripherie_urbaine: 'Périphérie Urbaine',
  banlieue_proche: 'Banlieue Proche',
  village: 'Le Village',
  zone_rurbaine: 'Zone Rurbaine',
};

export const HOUSE_TYPE_LABELS: Record<HouseType, string> = {
  individuelle: 'Individuelle',
  jumelee: 'Jumelée',
  contigue: 'Contiguë',
  maitre: 'Maison de Maître',
  autre: 'Autre',
};

export const COMMERCIAL_TYPE_LABELS: Record<CommercialType, string> = {
  bureau: 'Bureau',
  commerce: 'Commerce',
  atelier: 'Atelier',
  depot: 'Dépôt',
  restaurant: 'Restaurant',
  autre: 'Autre',
};

export interface Property {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  property_type: PropertyType;
  zone: string;
  price: number;
  surface_m2: number;
  rooms?: number;
  image_url?: string;
  floor?: number;
  house_type?: string;
  commercial_type?: string;
  situation?: string;
  urgency_level: number;
  listing_age_days: number;
  is_conditional_sale: boolean;
  conditional_sale_details?: string;
  rarity_score: number;
  score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  buyer_profile_id: string;
  property_id: string;
  match_score: number;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  // Jointures optionnelles
  property?: Property;
}

// === Labels pour l'affichage ===

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Appartement',
  house: 'Maison',
  villa: 'Villa',
  land: 'Terrain',
  commercial: 'Commercial',
};

// Conservé pour rétro-compatibilité, mais préférer VAUD_COMMUNES
export const ZONE_OPTIONS = [
  'Lausanne',
  'Morges',
  'Nyon',
  'Vevey',
  'Montreux',
  'Renens',
  'Pully',
  'Lutry',
  'Yverdon',
  'Aigle',
] as const;
