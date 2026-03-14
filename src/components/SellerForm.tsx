import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  BadgeSwissFranc,
  Home,
  Ruler,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Flame,
  Star,
  Clock,
  FileText,
  DoorOpen,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { calculateSellerScore } from '../utils/matching';
import { PROPERTY_TYPE_LABELS } from '../types';
import type { PropertyType, Property } from '../types';
import CommuneSelect from './CommuneSelect';

export default function SellerForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    property_type: 'apartment' as PropertyType,
    zone: 'Lausanne',
    price: '',
    surface_m2: '',
    rooms: '',
    urgency_level: '3',
    listing_age_days: '0',
    is_conditional_sale: false,
    rarity_score: '3',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Score vendeur en temps réel
  const liveProperty = {
    urgency_level: Number(form.urgency_level),
    listing_age_days: Number(form.listing_age_days),
    is_conditional_sale: form.is_conditional_sale,
    rarity_score: Number(form.rarity_score),
  } as Property;
  const liveScore = calculateSellerScore(liveProperty);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;

    setError(null);
    setLoading(true);

    const payload = {
      seller_id: user.id,
      title: form.title,
      description: form.description || null,
      property_type: form.property_type,
      zone: form.zone,
      price: Number(form.price),
      surface_m2: Number(form.surface_m2),
      rooms: form.rooms ? Number(form.rooms) : null,
      urgency_level: Number(form.urgency_level),
      listing_age_days: Number(form.listing_age_days),
      is_conditional_sale: form.is_conditional_sale,
      rarity_score: Number(form.rarity_score),
      score: liveScore,
    };

    const { error: err } = await supabase.from('properties').insert(payload);

    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      navigate('/dashboard');
    }
  }

  const urgencyLabels = ['', 'Pas pressé', 'Peu pressé', 'Modéré', 'Pressé', 'Très urgent'];
  const rarityLabels = ['', 'Courant', 'Peu courant', 'Assez rare', 'Rare', 'Exceptionnel'];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-500" />
            <span className="text-sm font-bold text-slate-200">
              <span className="text-cyan-400">off</span>-VAUD
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">Ajouter un bien off-market</h1>
          <p className="mt-1 text-slate-400">Publiez votre bien de manière confidentielle</p>
        </div>

        {/* Score vendeur en temps réel */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold ${
            liveScore >= 70 ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-700 text-slate-400'
          }`}>
            {liveScore}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">Score vendeur : {liveScore}/100</p>
            <p className="text-xs text-slate-400">
              {liveScore >= 70 ? 'Qualifié pour le matching' : 'Seuil requis : 70/100'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations du bien */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Informations du bien</h2>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                <FileText className="h-3.5 w-3.5" /> Titre
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Appartement lumineux au centre de Lausanne"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                <FileText className="h-3.5 w-3.5" /> Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="3.5 pièces rénové, vue lac, proche transports..."
                rows={3}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Home className="h-3.5 w-3.5" /> Type de bien
                </label>
                <select
                  value={form.property_type}
                  onChange={(e) => update('property_type', e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  Zone
                </label>
                <CommuneSelect
                  value={form.zone}
                  onChange={(v) => update('zone', v)}
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <BadgeSwissFranc className="h-3.5 w-3.5" /> Prix (CHF)
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  placeholder="890000"
                  required
                  min={1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Ruler className="h-3.5 w-3.5" /> Surface (m²)
                </label>
                <input
                  type="number"
                  value={form.surface_m2}
                  onChange={(e) => update('surface_m2', e.target.value)}
                  placeholder="82"
                  required
                  min={1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <DoorOpen className="h-3.5 w-3.5" /> Pièces
                </label>
                <input
                  type="number"
                  value={form.rooms}
                  onChange={(e) => update('rooms', e.target.value)}
                  placeholder="3.5"
                  step={0.5}
                  min={1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Critères de scoring vendeur */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Critères de scoring</h2>

            {/* Urgence */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm text-slate-400">
                <Flame className="h-3.5 w-3.5" /> Niveau d'urgence : {urgencyLabels[Number(form.urgency_level)]}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={form.urgency_level}
                onChange={(e) => update('urgency_level', e.target.value)}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Pas pressé</span><span>Très urgent</span>
              </div>
            </div>

            {/* Ancienneté */}
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                <Clock className="h-3.5 w-3.5" /> En vente depuis (jours)
              </label>
              <input
                type="number"
                value={form.listing_age_days}
                onChange={(e) => update('listing_age_days', e.target.value)}
                placeholder="0"
                min={0}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Plus l'annonce est ancienne, plus le score augmente (max à 90 jours)
              </p>
            </div>

            {/* Rareté */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm text-slate-400">
                <Star className="h-3.5 w-3.5" /> Rareté du bien : {rarityLabels[Number(form.rarity_score)]}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={form.rarity_score}
                onChange={(e) => update('rarity_score', e.target.value)}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Courant</span><span>Exceptionnel</span>
              </div>
            </div>

            {/* Vente conditionnelle */}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all border-slate-600 bg-slate-900">
              <input
                type="checkbox"
                checked={form.is_conditional_sale}
                onChange={(e) => update('is_conditional_sale', e.target.checked)}
                className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <p className={`text-sm font-medium ${form.is_conditional_sale ? 'text-red-400' : 'text-slate-300'}`}>
                  Vente conditionnelle
                </p>
                <p className="text-xs text-slate-500">
                  {form.is_conditional_sale ? '-20 pts (réduit le score)' : 'Non coché = +20 pts'}
                </p>
              </div>
            </label>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Publication...
              </span>
            ) : (
              'Publier mon bien off-market'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
