'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { vendorApi } from '@/api/vendorApi';
import {
  ArrowLeft, AlertTriangle, Search,
  CheckSquare, Square, Star, Layers, X, ImageOff, ChevronDown,
  Loader2, Save,
} from 'lucide-react';

interface ApiService {
  id: string;
  title: string;
  categoryId?: string;
  category?: string | { name: string };
  price?: { amount: number; currency: string };
  status: string;
  description?: string;
  imageUrl?: string;
  image_url?: string;
}

interface ServiceForSelector {
  id: string;
  name: string;
  category: string;
  priceMin: number;
  priceMax: number;
  images: string[];
  rating: number;
}

interface ApiPackage {
  id: string;
  vendorId: string;
  title: string;
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  price?: number;
  money?: { amount: number; currency: string };
  status: string;
  itemIds?: string[];
  items?: { id?: string; serviceId: string; service?: ApiService }[];
}

// ── Searchable Service Dropdown ─────────────────────────────────
function SearchableServiceSelector({
  services, selected, onChange,
}: {
  services: ServiceForSelector[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const dropRef           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return services.filter(s => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [services, query]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const selectedServices = services.filter(s => selected.includes(s.id));

  return (
    <div className="space-y-2" ref={dropRef}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm border rounded-xl transition-all
          ${open ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'} bg-white`}>
        <span className={selected.length ? 'text-gray-700 font-medium' : 'text-gray-400'}>
          {selected.length > 0 ? `${selected.length} service${selected.length > 1 ? 's' : ''} selected` : 'Select services…'}
        </span>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">{selected.length}</span>
          )}
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden z-50 relative">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search services…"
                className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No services found</p>
            ) : (
              filtered.map(s => {
                const isSelected = selected.includes(s.id);
                const thumb = s.images?.[0];
                return (
                  <button key={s.id} type="button" onClick={() => toggle(s.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all border-b border-gray-50 last:border-0
                      ${isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                    <div className="shrink-0">
                      {isSelected ? <CheckSquare size={15} className="text-orange-500" /> : <Square size={15} className="text-gray-300" />}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {thumb ? <img src={thumb} alt={s.name} className="w-full h-full object-cover" />
                              : <ImageOff size={13} className="text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm leading-tight truncate ${isSelected ? 'text-orange-800' : 'text-gray-800'}`}>{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.category} · {s.priceMin > 0 ? `AED ${s.priceMin.toLocaleString()}` : 'Price varies'}</p>
                    </div>
                    {s.rating > 0 && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Star size={10} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-500">{s.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">{filtered.length} services shown</span>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-orange-500 font-semibold hover:text-orange-600">Done ✓</button>
          </div>
        </div>
      )}

      {selectedServices.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Selected:</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedServices.map(sv => (
              <span key={sv.id} className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                {sv.name}
                <button type="button" onClick={() => toggle(sv.id)} className="hover:text-orange-900 ml-0.5"><X size={10} /></button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryName(svc: ApiService): string {
  if (!svc.category) return svc.categoryId || 'Service';
  if (typeof svc.category === 'string') return svc.category;
  return svc.category.name || 'Service';
}

function toSelectorService(svc: ApiService): ServiceForSelector {
  return {
    id: svc.id,
    name: svc.title,
    category: getCategoryName(svc),
    priceMin: svc.price?.amount ?? 0,
    priceMax: svc.price?.amount ?? 0,
    images: svc.imageUrl ? [svc.imageUrl] : svc.image_url ? [svc.image_url] : [],
    rating: 0,
  };
}

export default function EditPackagePage() {
  const router  = useRouter();
  const { id }  = useParams<{ id: string }>();

  const [services,  setServices]  = useState<ServiceForSelector[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState('');
  const [error,     setError]     = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'AED',
    status: 'ACTIVE',
    services: [] as string[],
  });

  // Load package + all services in parallel
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [pkg, allServices] = await Promise.all([
          vendorApi.packages.get<ApiPackage>(id),
          vendorApi.services.list<ApiService[]>(),
        ]);

        // Populate form from package
        const pkgAmount = pkg.money?.amount ?? pkg.amount ?? pkg.price ?? 0;
        const pkgCurrency = pkg.money?.currency ?? pkg.currency ?? 'AED';
        const selectedIds = pkg.items?.map(i => i.serviceId) ?? pkg.itemIds ?? [];

        setForm({
          title: pkg.title || pkg.name || '',
          description: pkg.description || '',
          price: String(pkgAmount),
          currency: pkgCurrency,
          status: pkg.status || 'ACTIVE',
          services: selectedIds,
        });

        // Map API services to selector format
        const activeServices = (allServices || [])
          .filter(s => s.status === 'ACTIVE' || selectedIds.includes(s.id))
          .map(toSelectorService);
        setServices(activeServices);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load package');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const set = (key: string, val: string) => { setForm(f => ({ ...f, [key]: val })); setFormError(''); };

  const handleSave = async () => {
    if (!form.title.trim())                       { setFormError('Package title is required.'); return; }
    if (!form.price || Number(form.price) <= 0)   { setFormError('Valid package price is required.'); return; }
    if (form.services.length === 0)               { setFormError('Please select at least one service.'); return; }

    setSaving(true);
    setFormError('');
    try {
      await vendorApi.packages.update(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        itemIds: form.services,
        price: {
          amount: Number(form.price),
          currency: form.currency,
        },
        status: form.status,
      });

      sessionStorage.setItem('pkg_success', `"${form.title}" updated successfully!`);
      router.push('/vendor/packages');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update package. Please try again.');
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
        <p className="text-gray-500">Loading package...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
        <p className="text-gray-800 font-semibold">{error}</p>
        <button onClick={() => router.push('/vendor/packages')} className="mt-4 text-orange-500 text-sm underline">
          Back to Packages
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Package</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Editing: <span className="font-medium">{form.title}</span>
          </p>
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle size={15} /> {formError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">

        {/* Basic Info */}
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Package Details</h2>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Package Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Royal Wedding Package"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="What's included? Who is this package ideal for?"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none" />
          </div>
        </div>

        {/* Services */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
            <Layers size={13} /> Services *
            {form.services.length > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full font-medium">
                {form.services.length} selected
              </span>
            )}
          </h2>
          <SearchableServiceSelector
            services={services}
            selected={form.services}
            onChange={ids => { setForm(f => ({ ...f, services: ids })); setFormError(''); }}
          />
        </div>

        {/* Pricing */}
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Package Price *</label>
              <input type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)}
                placeholder="25000"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
                {['AED', 'USD', 'EUR', 'SAR'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Status</h2>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
            <option value="ACTIVE">Active – Visible to customers</option>
            <option value="INACTIVE">Inactive – Hidden from customers</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pb-6">
        <button onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold transition-colors flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}
