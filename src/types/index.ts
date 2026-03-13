// === Types pour le réseau immobilier off-market ===

export type UserRole = 'buyer' | 'seller' | 'admin';
export type PropertyType = 'apartment' | 'house' | 'villa' | 'land' | 'commercial';
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface User {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface BuyerProfile {
  id: string;
  user_id: string;
  desired_zone: string;
  desired_property_type: PropertyType;
  budget_max: number;
  desired_surface_m2: number;
  personal_contribution: number;
  has_pre_approval: boolean;
  debt_ratio: number;
  score: number;
  created_at: string;
  updated_at: string;
}

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
  urgency_level: number;
  listing_age_days: number;
  is_conditional_sale: boolean;
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
