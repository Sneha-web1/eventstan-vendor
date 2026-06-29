'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package as PackageIcon,
} from 'lucide-react';
import { vendorApi } from '@/api/vendorApi';
import { getUser } from '@/lib/auth';

interface ApiService {
  id: string;
  title: string;
  category?: string;
  categoryId?: string;
  description?: string;
  city?: string;
  status: string;
  price?: { amount: number; currency: string };
  price_min?: number;
  price_max?: number;
  price_unit?: string;
  image_url?: string;
  features?: string[];
}

const formatMoney = (amount: number, currency: string) => `${amount.toLocaleString()} ${currency}`;

export default function AddPackagePage() {
  const router = useRouter();
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'AED',
    serviceId: '',
    isPromotional: false,
    promotionDiscountType: 'PERCENTAGE',
    promotionDiscountValue: '',
  });

  useEffect(() => {
    async function loadServices() {
      try {
        const rows = await vendorApi.services.list<ApiService[]>();
        const activeRows = rows.filter((service) => service.status === 'ACTIVE');
        setServices(activeRows);
        setForm((current) => ({
          ...current,
          serviceId: current.serviceId || activeRows[0]?.id || '',
          currency: activeRows[0]?.price?.currency || current.currency,
        }));
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Failed to load services');
      } finally {
        setLoading(false);
      }
    }

    void loadServices();
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === form.serviceId) ?? null,
    [form.serviceId, services],
  );

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('Package title is required.');
      return;
    }
    if (!form.serviceId) {
      setFormError('Please choose one service for this package.');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setFormError('Valid package price is required.');
      return;
    }
    if (form.isPromotional && (!form.promotionDiscountValue || Number(form.promotionDiscountValue) <= 0)) {
      setFormError('Enter a valid promotional discount value.');
      return;
    }

    setSaving(true);
    try {
      const vendorId = getUser()?.vendorId;
      if (!vendorId) throw new Error('Vendor profile not found. Please sign in again.');

      await vendorApi.packages.create({
        vendorId,
        title: form.title.trim(),
        description: form.description.trim(),
        serviceId: form.serviceId,
        exactPrice: Number(form.price),
        currency: form.currency,
        isPromotional: form.isPromotional,
        promotionDiscountType: form.isPromotional ? form.promotionDiscountType : undefined,
        promotionDiscountValue: form.isPromotional ? Number(form.promotionDiscountValue || 0) : undefined,
      });

      sessionStorage.setItem('pkg_success', `Package "${form.title}" created successfully!`);
      router.push('/vendor/packages');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create package.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="mx-auto mb-4 animate-spin text-orange-500" />
          <p className="text-gray-500">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-3 pb-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-950">Create Package</h1>
          <p className="text-sm text-gray-500">Set one exact price and connect it to one service.</p>
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={15} /> {formError}
        </div>
      )}

      <div className="max-w-4xl">
        <section className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <PackageIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Package essentials</h2>
              <p className="text-sm text-gray-500">Everything needed to create the package in one screen.</p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="space-y-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Package title *</label>
              <input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="e.g. Romance in Bloom"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={4}
                  placeholder="Describe the package outcome, style, and what customers should expect."
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Service *</label>
                <select
                  value={form.serviceId}
                  onChange={(e) => {
                    const nextService = services.find((service) => service.id === e.target.value);
                    setForm((current) => ({
                      ...current,
                      serviceId: e.target.value,
                      currency: nextService?.price?.currency || current.currency,
                    }));
                    setFormError('');
                  }}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Choose a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Package price *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                    placeholder="1800"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Currency</label>
                  <input
                    value={form.currency}
                    onChange={(e) => setField('currency', e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Promotional package</p>
                    <p className="text-xs text-gray-500">Turn this package into a discount offer for the promotions page.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isPromotional}
                      onChange={(e) => setForm((current) => ({ ...current, isPromotional: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                    Enabled
                  </label>
                </div>

                {form.isPromotional && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Discount type</label>
                      <select
                        value={form.promotionDiscountType}
                        onChange={(e) => setForm((current) => ({ ...current, promotionDiscountType: e.target.value }))}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      >
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FLAT">Flat</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {form.promotionDiscountType === 'FLAT' ? 'Flat discount' : 'Discount percentage'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.promotionDiscountValue}
                        onChange={(e) => setForm((current) => ({ ...current, promotionDiscountValue: e.target.value }))}
                        placeholder={form.promotionDiscountType === 'FLAT' ? '150' : '20'}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              <span className="flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {saving ? 'Creating...' : 'Create Package'}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
