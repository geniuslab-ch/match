import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  BadgeSwissFranc,
  Landmark,
  CheckCircle2,
  Percent,
  MapPin,
  Home,
  Ruler,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { calculateBuyerScore } from '../utils/matching';
import { PROPERTY_TYPE_LABELS, ZONE_OPTIONS } from '../types';
import type { PropertyType, BuyerProfile } from '../types';

export default function BuyerForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    desired_zone: 'Lausanne',
    desired_property_type: 'apartment' as PropertyType,
    budget_max: '',
    desired_surface_m2: '',
    personal_contribution: '',
    has_pre_approval: false,
    debt_ratio: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Score en temps réel
  const liveProfile = {
    budget_max: Number(form.budget_max) || 0,
    personal_contribution: Number(form.personal_contribution) || 0,
    has_pre_approval: form.has_pre_approval,
    debt_ratio: Number(form.debt_ratio) || 0,
  } as BuyerProfile;
  const liveScore = calculateBuyerScore(liveProfile);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;

    setError(null);
    setLoading(true);

    const payload = {
      user_id: user.id,
      desired_zone: form.desired_zone,
      desired_property_type: form.desired_property_type,
      budget_max: Number(form.budget_max),
      desired_surface_m2: Number(form.desired_surface_m2),
      personal_contribution: Number(form.personal_contribution),
      has_pre_approval: form.has_pre_approval,
      debt_ratio: Number(form.debt_ratio),
      score: liveScore,
    };

    const { error: err } = await supabase.from('buyer_profiles').upsert(payload, {
      onConflict: 'user_id',
    });

    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      navigate('/dashboard');
    }
  }

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
          <h1 className="text-2xl font-bold text-slate-100">Profil Acheteur Solvable</h1>
          <p className="mt-1 text-slate-400">Complétez vos critères pour accéder aux biens off-market</p>
        </div>

        {/* Score en temps réel */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <div className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold ${
            liveScore >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-700 text-slate-400'
          }`}>
            {liveScore}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">Score acheteur : {liveScore}/100</p>
            <p className="text-xs text-slate-400">
              {liveScore >= 80 ? 'Qualifié pour le matching' : 'Seuil requis : 80/100'}
            </p>
          </div>
          {liveScore >= 80 && <CheckCircle2 className="ml-auto h-6 w-6 text-emerald-400" />}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Critères de recherche */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Critères de recherche</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <MapPin className="h-3.5 w-3.5" /> Zone souhaitée
                </label>
                <select
                  value={form.desired_zone}
                  onChange={(e) => update('desired_zone', e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {ZONE_OPTIONS.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Home className="h-3.5 w-3.5" /> Type de bien
                </label>
                <select
                  value={form.desired_property_type}
                  onChange={(e) => update('desired_property_type', e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <BadgeSwissFranc className="h-3.5 w-3.5" /> Budget max (CHF)
                </label>
                <input
                  type="number"
                  value={form.budget_max}
                  onChange={(e) => update('budget_max', e.target.value)}
                  placeholder="950000"
                  required
                  min={1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Ruler className="h-3.5 w-3.5" /> Surface souhaitée (m²)
                </label>
                <input
                  type="number"
                  value={form.desired_surface_m2}
                  onChange={(e) => update('desired_surface_m2', e.target.value)}
                  placeholder="85"
                  required
                  min={1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Critères financiers (scoring) */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Critères financiers</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Landmark className="h-3.5 w-3.5" /> Apport personnel (CHF)
                </label>
                <input
                  type="number"
                  value={form.personal_contribution}
                  onChange={(e) => update('personal_contribution', e.target.value)}
                  placeholder="200000"
                  required
                  min={0}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {Number(form.budget_max) > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    = {((Number(form.personal_contribution) / Number(form.budget_max)) * 100).toFixed(1)}% du budget
                    {Number(form.personal_contribution) / Number(form.budget_max) >= 0.2
                      ? ' (+20 pts)' : ' (min 20% requis)'}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Percent className="h-3.5 w-3.5" /> Taux d'endettement (%)
                </label>
                <input
                  type="number"
                  value={form.debt_ratio}
                  onChange={(e) => update('debt_ratio', e.target.value)}
                  placeholder="28"
                  required
                  min={0}
                  max={100}
                  step={0.1}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {Number(form.debt_ratio) <= 33 ? '+10 pts' : 'Doit être ≤ 33%'}
                </p>
              </div>
            </div>

            {/* Pré-approbation */}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all
              ${form.has_pre_approval ? 'border-cyan-500 bg-cyan-950/50' : 'border-slate-600 bg-slate-900'}">
              <input
                type="checkbox"
                checked={form.has_pre_approval}
                onChange={(e) => update('has_pre_approval', e.target.checked)}
                className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <p className={`text-sm font-medium ${form.has_pre_approval ? 'text-cyan-400' : 'text-slate-300'}`}>
                  Pré-approbation bancaire
                </p>
                <p className="text-xs text-slate-500">
                  {form.has_pre_approval ? '+30 pts' : 'Ajoute 30 points à votre score'}
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
                <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
              </span>
            ) : (
              'Enregistrer mon profil acheteur'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
