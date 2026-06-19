'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { type ServiceWithSlug } from '@/lib/store';
import { vendorApi } from '@/api/vendorApi';
import { getUser } from '@/lib/auth';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Search,
  CheckSquare, Square, Star, Layers, X, ImageOff, ChevronDown,
  Plus, Package as PackageIcon, Loader2,
} from 'lucide-react';

// Type for add-on item
interface AddOnItem {
  serviceId: string;
  quantity: number;
  note?: string;
}

// API Package interface
interface ApiPackage {
  vendorId: string;
  title: string;
  description: string;
  itemIds: string[];
  price: {
    amount: number;
    currency: string;
  };
}

interface ApiService {
  id: string;
  title: string;
  categoryId: string;
  priceUnit?: string;
  price: {
    amount: number;
    currency: string;
  };
  status: string;
  description: string;
}

const serviceCategories: ServiceWithSlug['category'][] = [
  'Venue',
  'Catering',
  'Decoration',
  'Entertainment',
  'Photography',
  'Other',
];

function normalizeServiceCategory(categoryId: string): ServiceWithSlug['category'] {
  const normalized = categoryId.replace(/^cat[_-]?/i, '').toLowerCase();
  return serviceCategories.find((category) => category.toLowerCase() === normalized) ?? 'Other';
}

const priceUnits: ServiceWithSlug['priceUnit'][] = [
  'per event',
  'per person',
  'per hour',
  'per day',
];

function normalizePriceUnit(priceUnit?: string): ServiceWithSlug['priceUnit'] {
  const normalized = priceUnit?.toLowerCase();
  return priceUnits.find((unit) => unit === normalized) ?? 'per event';
}

// ── Searchable Service Dropdown ─────────────────────────────────
function SearchableServiceSelector({
  services, selected, onChange,
}: {
  services: ServiceWithSlug[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const dropRef               = useRef<HTMLDivElement>(null);

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
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search services by name or category…"
                className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
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
                      {isSelected
                        ? <CheckSquare size={15} className="text-orange-500" />
                        : <Square size={15} className="text-gray-300" />}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {thumb ? <img src={thumb} alt={s.name} className="w-full h-full object-cover" />
                              : <ImageOff size={13} className="text-gray-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm leading-tight truncate ${isSelected ? 'text-orange-800' : 'text-gray-800'}`}>{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.category} · AED {s.priceMin.toLocaleString()}–{s.priceMax.toLocaleString()}</p>
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
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs text-orange-500 font-semibold hover:text-orange-600">Done ✓</button>
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

// ── Add-on Item Component ─────────────────────────────────
function AddOnItemComponent({
  service,
  addOn,
  onUpdate,
  onRemove,
}: {
  service: ServiceWithSlug;
  addOn: AddOnItem;
  onUpdate: (updates: Partial<AddOnItem>) => void;
  onRemove: () => void;
}) {
  const avgPrice = (service.priceMin + service.priceMax) / 2;
  
  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-200">
      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
        {service.images?.[0] ? (
          <img src={service.images[0]} alt={service.name} className="w-full h-full object-cover" />
        ) : (
          <PackageIcon size={16} className="text-gray-400" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900">{service.name}</p>
        <p className="text-xs text-gray-500">{service.category}</p>
        <p className="text-xs text-orange-500 mt-1">AED {avgPrice.toLocaleString()}</p>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ quantity: Math.max(1, addOn.quantity - 1) })}
            className="w-6 h-6 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
          >
            -
          </button>
          <span className="w-8 text-center text-sm font-medium">{addOn.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdate({ quantity: addOn.quantity + 1 })}
            className="w-6 h-6 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
          >
            +
          </button>
        </div>
        
        <div className="w-24">
          <input
            type="text"
            value={addOn.note || ''}
            onChange={(e) => onUpdate({ note: e.target.value })}
            placeholder="Note (optional)"
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-200"
          />
        </div>
        
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Searchable Add-on Selector ─────────────────────────────────
function AddOnSelector({
  availableServices,
  onAdd,
}: {
  availableServices: ServiceWithSlug[];
  onAdd: (serviceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return availableServices.filter(s => 
      (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
    );
  }, [availableServices, query]);

  return (
    <div ref={dropRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-dashed border-orange-300 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors"
      >
        <Plus size={16} />
        Add Add-on Service
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 border border-gray-200 rounded-xl bg-white shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search add-ons…"
                className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">No add-ons available</p>
            ) : (
              filtered.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onAdd(s.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {s.images?.[0] ? (
                      <img src={s.images[0]} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PackageIcon size={12} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.category}</p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">
                    AED {((s.priceMin + s.priceMax) / 2).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddPackagePage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceWithSlug[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    price: '', 
    services: [] as string[],
    addOns: [] as AddOnItem[]
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await vendorApi.services.list<ApiService[]>();
      
      // Transform API services to ServiceWithSlug format
      const transformedServices: ServiceWithSlug[] = data.map((svc) => ({
        id: svc.id,
        name: svc.title,
        slug: svc.id,
        category: normalizeServiceCategory(svc.categoryId),
        priceMin: svc.price.amount,
        priceMax: svc.price.amount,
        priceUnit: normalizePriceUnit(svc.priceUnit),
        isActive: svc.status === 'ACTIVE',
        rating: 0,
        totalBookings: 0,
        images: [],
        description: svc.description,
      })).filter(s => s.isActive);
      
      setServices(transformedServices);
    } catch (err) {
      console.error('Error fetching services:', err);
      setFormError('Failed to load services. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchServices();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const set = (key: string, val: string) => { 
    setForm(f => ({ ...f, [key]: val })); 
    setFormError(''); 
  };

  // Calculate totals
  const selectedServicesTotal = useMemo(() =>
    form.services.reduce((sum, id) => {
      const s = services.find(sv => sv.id === id);
      return sum + (s ? (s.priceMin + s.priceMax) / 2 : 0);
    }, 0), [form.services, services]);

  const addOnsTotal = useMemo(() =>
    form.addOns.reduce((sum, addOn) => {
      const s = services.find(sv => sv.id === addOn.serviceId);
      if (!s) return sum;
      const price = (s.priceMin + s.priceMax) / 2;
      return sum + (price * addOn.quantity);
    }, 0), [form.addOns, services]);

  const grandTotal = selectedServicesTotal + addOnsTotal;
  const packagePrice = form.price ? Number(form.price) : 0;
  const savings = grandTotal > 0 && packagePrice > 0
    ? Math.max(0, grandTotal - packagePrice)
    : 0;

  // Add-on management
  const addAddOn = (serviceId: string) => {
    if (form.addOns.some(a => a.serviceId === serviceId)) {
      setFormError('This service is already added as an add-on');
      return;
    }
    setForm(f => ({
      ...f,
      addOns: [...f.addOns, { serviceId, quantity: 1, note: '' }]
    }));
  };

  const updateAddOn = (index: number, updates: Partial<AddOnItem>) => {
    setForm(f => ({
      ...f,
      addOns: f.addOns.map((addOn, i) => i === index ? { ...addOn, ...updates } : addOn)
    }));
  };

  const removeAddOn = (index: number) => {
    setForm(f => ({
      ...f,
      addOns: f.addOns.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError('Package title is required.'); return; }
    if (!form.price || Number(form.price) <= 0) { setFormError('Valid package price is required.'); return; }
    if (form.services.length === 0) { setFormError('Please select at least one service.'); return; }

    setSaving(true);
    
    try {
      const vendorId = getUser()?.vendorId;
      if (!vendorId) throw new Error('Vendor profile not found. Please sign in again.');

      const packageData: ApiPackage = {
        vendorId: vendorId,
        title: form.title.trim(),
        description: form.description.trim(),
        itemIds: form.services,
        price: {
          amount: Number(form.price),
          currency: 'AED'
        }
      };

      await vendorApi.packages.create(packageData);
      
      sessionStorage.setItem('pkg_success', `Package "${form.title}" created successfully!`);
      router.push('/vendor/packages');
    } catch (err) {
      console.error('Error creating package:', err);
      setFormError(err instanceof Error ? err.message : 'Failed to create package. Please try again.');
      setSaving(false);
    }
  };

  // Services available for add-ons (not already in main package)
  const availableAddOns = useMemo(() => {
    const usedServices = new Set([...form.services, ...form.addOns.map(a => a.serviceId)]);
    return services.filter(s => !usedServices.has(s.id));
  }, [services, form.services, form.addOns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Package</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bundle services and offer optional add-ons</p>
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

        {/* Core Services */}
        <div className="p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
            <Layers size={13} /> Core Services *
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

        {/* Add-ons Section */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
              <Plus size={13} /> Optional Add-ons
            </h2>
            {form.addOns.length > 0 && (
              <span className="text-xs text-gray-500">{form.addOns.length} add-on(s)</span>
            )}
          </div>
          
          {form.addOns.map((addOn, idx) => {
            const service = services.find(s => s.id === addOn.serviceId);
            if (!service) return null;
            return (
              <AddOnItemComponent
                key={addOn.serviceId}
                service={service}
                addOn={addOn}
                onUpdate={(updates) => updateAddOn(idx, updates)}
                onRemove={() => removeAddOn(idx)}
              />
            );
          })}
          
          <AddOnSelector
            availableServices={availableAddOns}
            onAdd={addAddOn}
          />
          
          {form.addOns.length === 0 && (
            <p className="text-xs text-gray-400 text-center pt-2">
              Add optional services that customers can include at an additional cost
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Pricing</h2>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Package Price (AED) *</label>
            <input type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)}
              placeholder="25000"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
          </div>
          
          {(form.services.length > 0 || form.addOns.length > 0) && form.price && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Core services total:</span>
                  <span className="font-medium">AED {Math.round(selectedServicesTotal).toLocaleString()}</span>
                </div>
                {form.addOns.length > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Add-ons total (if all selected):</span>
                    <span className="font-medium">+ AED {Math.round(addOnsTotal).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700 font-semibold pt-2 border-t border-orange-100">
                  <span>Grand total value:</span>
                  <span>AED {Math.round(grandTotal).toLocaleString()}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-green-600 text-xs">
                    <span>Customer saves:</span>
                    <span className="font-semibold">AED {Math.round(savings).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pb-6">
        <button onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold transition-colors flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Create Package</>}
        </button>
      </div>
    </div>
  );
}
