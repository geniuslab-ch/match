import type { BuyerProfile, Property } from '../types';

// ============================================================
// ALGORITHME DE MATCHING - Réseau Immobilier Off-Market
// Canton de Vaud
// ============================================================

// === SEUILS ===
const BUYER_SCORE_THRESHOLD = 80;
const SELLER_SCORE_THRESHOLD = 70;
const MATCH_SCORE_THRESHOLD = 70;

// ============================================================
// 1. SCORING ACHETEUR (sur 100)
// ============================================================
// Budget suffisant      → 40 points
// Apport >= 20%         → 20 points
// Pré-approbation       → 30 points
// Endettement <= 33%    → 10 points
// Seuil : 80
// ============================================================

export function calculateBuyerScore(buyer: BuyerProfile): number {
  let score = 0;

  // Budget suffisant (40 pts) — on considère qu'un budget > 0 est "suffisant"
  // Le vrai check se fait au matching (prix <= budget)
  if (buyer.budget_max > 0) {
    score += 40;
  }

  // Apport personnel >= 20% du budget (20 pts)
  if (buyer.budget_max > 0 && buyer.personal_contribution / buyer.budget_max >= 0.2) {
    score += 20;
  }

  // Pré-approbation bancaire (30 pts)
  if (buyer.has_pre_approval) {
    score += 30;
  }

  // Taux d'endettement <= 33% (10 pts)
  if (buyer.debt_ratio <= 33) {
    score += 10;
  }

  return score;
}

export function isBuyerQualified(buyer: BuyerProfile): boolean {
  return calculateBuyerScore(buyer) >= BUYER_SCORE_THRESHOLD;
}

// ============================================================
// 2. SCORING VENDEUR (sur 100)
// ============================================================
// Urgence (1-5)              → jusqu'à 40 points
// Ancienneté (jours)         → jusqu'à 20 points
// Vente non-conditionnelle   → 20 points
// Rareté (1-5)               → jusqu'à 20 points
// Seuil : 70
// ============================================================

export function calculateSellerScore(property: Property): number {
  let score = 0;

  // Urgence : 1-5 mappé sur 0-40
  score += (property.urgency_level / 5) * 40;

  // Ancienneté : plus le bien est ancien, plus le vendeur est motivé
  // 0 jours = 0 pts, >= 90 jours = 20 pts max
  const ageFactor = Math.min(property.listing_age_days / 90, 1);
  score += ageFactor * 20;

  // Vente non-conditionnelle = 20 pts
  if (!property.is_conditional_sale) {
    score += 20;
  }

  // Rareté : 1-5 mappé sur 0-20
  score += (property.rarity_score / 5) * 20;

  return Math.round(score);
}

export function isSellerQualified(property: Property): boolean {
  return calculateSellerScore(property) >= SELLER_SCORE_THRESHOLD;
}

// ============================================================
// 3. ALGORITHME DE MATCHING
// ============================================================
// Zone OK                          → +20
// Prix <= Budget                   → +30
// Type de bien OK                  → +20
// Surface ±10m²                    → +10
// + (Score Acheteur * 0.1)         → jusqu'à +10
// + (Score Vendeur * 0.1)          → jusqu'à +10
// Match si Score Global >= 70
// ============================================================

export interface MatchResult {
  property: Property;
  matchScore: number;
  buyerScore: number;
  sellerScore: number;
  isMatch: boolean;
  details: {
    zoneMatch: boolean;
    priceMatch: boolean;
    typeMatch: boolean;
    surfaceMatch: boolean;
  };
}

export function calculateMatchScore(
  buyer: BuyerProfile,
  property: Property
): MatchResult {
  const buyerScore = calculateBuyerScore(buyer);
  const sellerScore = calculateSellerScore(property);

  let matchScore = 0;

  // Zone OK (+20)
  const zoneMatch =
    buyer.desired_zone.toLowerCase() === property.zone.toLowerCase();
  if (zoneMatch) matchScore += 20;

  // Prix <= Budget (+30)
  const priceMatch = property.price <= buyer.budget_max;
  if (priceMatch) matchScore += 30;

  // Type de bien OK (+20)
  const typeMatch = buyer.desired_property_type === property.property_type;
  if (typeMatch) matchScore += 20;

  // Surface ±10m² (+10)
  const surfaceMatch =
    Math.abs(property.surface_m2 - buyer.desired_surface_m2) <= 10;
  if (surfaceMatch) matchScore += 10;

  // Bonus scores
  matchScore += buyerScore * 0.1;
  matchScore += sellerScore * 0.1;

  matchScore = Math.round(matchScore);

  return {
    property,
    matchScore,
    buyerScore,
    sellerScore,
    isMatch: matchScore >= MATCH_SCORE_THRESHOLD,
    details: {
      zoneMatch,
      priceMatch,
      typeMatch,
      surfaceMatch,
    },
  };
}

// ============================================================
// Fonction principale : trouve tous les matches pour un acheteur
// ============================================================

export function findMatchesForBuyer(
  buyer: BuyerProfile,
  properties: Property[]
): MatchResult[] {
  // Filtrer uniquement les biens actifs avec vendeurs qualifiés
  const activeProperties = properties.filter(
    (p) => p.is_active && isSellerQualified(p)
  );

  // Vérifier que l'acheteur est qualifié
  if (!isBuyerQualified(buyer)) {
    return [];
  }

  // Calculer le score pour chaque propriété
  const results = activeProperties
    .map((property) => calculateMatchScore(buyer, property))
    .filter((result) => result.isMatch)
    .sort((a, b) => b.matchScore - a.matchScore);

  return results;
}
