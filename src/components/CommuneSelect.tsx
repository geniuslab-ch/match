import { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { VAUD_COMMUNES } from '../data/vaudCommunes';

export default function CommuneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return VAUD_COMMUNES as readonly string[];
    const s = search.toLowerCase();
    return (VAUD_COMMUNES as readonly string[]).filter((c) =>
      c.toLowerCase().includes(s)
    );
  }, [search]);

  return (
    <div className="relative">
      <div
        className="flex w-full cursor-pointer items-center rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-slate-100 focus-within:border-cyan-500"
        onClick={() => setOpen(!open)}
      >
        <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          type="text"
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch('');
          }}
          placeholder="Rechercher une commune..."
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              Aucune commune trouvée
            </div>
          ) : (
            filtered.map((commune) => (
              <button
                key={commune}
                type="button"
                className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-800 ${
                  commune === value
                    ? 'bg-cyan-950 text-cyan-400'
                    : 'text-slate-300'
                }`}
                onClick={() => {
                  onChange(commune);
                  setSearch('');
                  setOpen(false);
                }}
              >
                {commune}
              </button>
            ))
          )}
        </div>
      )}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setOpen(false);
            setSearch('');
          }}
        />
      )}
    </div>
  );
}
