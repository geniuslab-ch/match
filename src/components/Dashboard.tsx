import { useState, useMemo } from 'react';
import {
  Home,
  MapPin,
  Ruler,
  BadgeSwissFranc,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Shield,
  Star,
} from 'lucide-react';
import type { BuyerProfile, Property, MatchResult } from '../types';
import { PROPERTY_TYPE_LABELS } from '../types';
import {
  calculateBuyerScore,
  isBuyerQualified,
  findMatchesForBuyer,
} from '../utils/matching';

// === Données de démonstration ===
const DEMO_BUYER: BuyerProfile = {
  id: 'demo-buyer-1',
  user_id: 'demo-user-1',
  desired_zone: 'Lausanne',
  desired_property_type: 'apartment',
  budget_max: 950000,
  desired_surface_m2: 85,
  personal_contribution: 200000,
  has_pre_approval: true,
  debt_ratio: 28,
  score: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    seller_id: 'seller-1',
    title: 'Appartement lumineux au centre de Lausanne',
    description: '3.5 pièces rénové, vue lac, proche transports',
    property_type: 'apartment',
    zone: 'Lausanne',
    price: 890000,
    surface_m2: 82,
    rooms: 3.5,
    image_url: undefined,
    urgency_level: 4,
    listing_age_days: 45,
    is_conditional_sale: false,
    rarity_score: 4,
    score: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prop-2',
    seller_id: 'seller-2',
    title: 'Villa avec jardin à Pully',
    description: '6 pièces, jardin 300m², garage double',
    property_type: 'villa',
    zone: 'Pully',
    price: 1850000,
    surface_m2: 180,
    rooms: 6,
    image_url: undefined,
    urgency_level: 2,
    listing_age_days: 10,
    is_conditional_sale: true,
    rarity_score: 3,
    score: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prop-3',
    seller_id: 'seller-3',
    title: 'Duplex moderne à Lausanne-Flon',
    description: '4.5 pièces, terrasse, finitions haut de gamme',
    property_type: 'apartment',
    zone: 'Lausanne',
    price: 920000,
    surface_m2: 90,
    rooms: 4.5,
    image_url: undefined,
    urgency_level: 5,
    listing_age_days: 60,
    is_conditional_sale: false,
    rarity_score: 5,
    score: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prop-4',
    seller_id: 'seller-4',
    title: 'Appartement rénové à Morges',
    description: '3 pièces, proche gare, balcon vue lac',
    property_type: 'apartment',
    zone: 'Morges',
    price: 620000,
    surface_m2: 75,
    rooms: 3,
    image_url: undefined,
    urgency_level: 3,
    listing_age_days: 30,
    is_conditional_sale: false,
    rarity_score: 3,
    score: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prop-5',
    seller_id: 'seller-5',
    title: 'Loft atypique à Lausanne',
    description: '2.5 pièces, ancien atelier, charme industriel',
    property_type: 'apartment',
    zone: 'Lausanne',
    price: 750000,
    surface_m2: 78,
    rooms: 2.5,
    image_url: undefined,
    urgency_level: 4,
    listing_age_days: 95,
    is_conditional_sale: false,
    rarity_score: 5,
    score: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// === Composants ===

function ScoreBadge({ score, threshold, label }: { score: number; threshold: number; label: string }) {
  const qualified = score >= threshold;
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
      qualified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
    }`}>
      {qualified ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      <span>{label}: {score}/100</span>
    </div>
  );
}

function ScoreBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BuyerScoreCard({ buyer }: { buyer: BuyerProfile }) {
  const score = calculateBuyerScore(buyer);
  const qualified = isBuyerQualified(buyer);
  const contributionPct = buyer.budget_max > 0
    ? ((buyer.personal_contribution / buyer.budget_max) * 100).toFixed(1)
    : '0';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Votre profil acheteur</h2>
        <ScoreBadge score={score} threshold={80} label={qualified ? 'Qualifié' : 'Non qualifié'} />
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <ScoreBar value={buyer.budget_max > 0 ? 40 : 0} max={40} label="Budget suffisant" />
        <ScoreBar
          value={parseFloat(contributionPct) >= 20 ? 20 : 0}
          max={20}
          label={`Apport (${contributionPct}%)`}
        />
        <ScoreBar value={buyer.has_pre_approval ? 30 : 0} max={30} label="Pré-approbation" />
        <ScoreBar value={buyer.debt_ratio <= 33 ? 10 : 0} max={10} label={`Endettement (${buyer.debt_ratio}%)`} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center text-sm">
        <div>
          <p className="text-slate-500">Budget max</p>
          <p className="font-semibold text-slate-800">
            {buyer.budget_max.toLocaleString('fr-CH')} CHF
          </p>
        </div>
        <div>
          <p className="text-slate-500">Zone</p>
          <p className="font-semibold text-slate-800">{buyer.desired_zone}</p>
        </div>
        <div>
          <p className="text-slate-500">Surface</p>
          <p className="font-semibold text-slate-800">{buyer.desired_surface_m2} m²</p>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ result }: { result: MatchResult }) {
  const { property, matchScore, sellerScore, details } = result;

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
      {/* Image placeholder */}
      <div className="relative h-44 rounded-t-2xl bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center">
        <Home className="h-12 w-12 text-indigo-300" />
        <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-indigo-700 shadow-sm">
          {matchScore}%
        </div>
        <div className="absolute top-3 left-3 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white">
          Off-Market
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800 leading-tight">{property.title}</h3>
          <p className="mt-1 text-sm text-slate-500 line-clamp-1">{property.description}</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {property.zone}
          </span>
          <span className="flex items-center gap-1">
            <Ruler className="h-3.5 w-3.5" /> {property.surface_m2} m²
          </span>
          {property.rooms && (
            <span className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" /> {property.rooms}p
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-slate-800 flex items-center gap-1">
            <BadgeSwissFranc className="h-5 w-5 text-slate-400" />
            {property.price.toLocaleString('fr-CH')}
          </span>
          <span className="text-xs rounded-full bg-slate-100 px-2 py-1 text-slate-500">
            {PROPERTY_TYPE_LABELS[property.property_type]}
          </span>
        </div>

        {/* Critères de matching */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <CriteriaBadge ok={details.zoneMatch} label="Zone" />
          <CriteriaBadge ok={details.priceMatch} label="Prix" />
          <CriteriaBadge ok={details.typeMatch} label="Type" />
          <CriteriaBadge ok={details.surfaceMatch} label="Surface" />
        </div>

        {/* Score vendeur */}
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <Star className="h-3.5 w-3.5" />
          <span>Score vendeur : {sellerScore}/100</span>
          <span className="ml-auto flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" /> Discret
          </span>
        </div>
      </div>
    </div>
  );
}

function CriteriaBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
    }`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

// === Dashboard principal ===

export default function Dashboard() {
  const [buyer] = useState<BuyerProfile>(DEMO_BUYER);

  const matches = useMemo(
    () => findMatchesForBuyer(buyer, DEMO_PROPERTIES),
    [buyer]
  );

  const buyerScore = calculateBuyerScore(buyer);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-none">VaudMatch</h1>
              <p className="text-xs text-slate-400">Immobilier off-market exclusif</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <TrendingUp className="h-4 w-4" />
            <span>Canton de Vaud</span>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Score acheteur */}
        <BuyerScoreCard buyer={buyer} />

        {/* Section matches */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Vos Matches
              </h2>
              <p className="text-sm text-slate-500">
                {matches.length} bien{matches.length > 1 ? 's' : ''} correspond{matches.length > 1 ? 'ent' : ''} à votre profil
                (score acheteur : {buyerScore}/100)
              </p>
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <XCircle className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-slate-500">
                {buyerScore < 80
                  ? 'Votre score acheteur est insuffisant (minimum 80/100). Complétez votre profil.'
                  : 'Aucun match trouvé pour le moment. De nouveaux biens arrivent régulièrement.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((result) => (
                <MatchCard key={result.property.id} result={result} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        VaudMatch MVP &mdash; Réseau immobilier off-market exclusif &mdash; Canton de Vaud
      </footer>
    </div>
  );
}
