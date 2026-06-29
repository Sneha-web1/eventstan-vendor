'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Package as PackageIcon, Save } from 'lucide-react';
import { vendorApi } from '@/api/vendorApi';

interface ApiService {
  id: string;
  title: string;
  category?: string;
  categoryId?: string;
  description?: string;
  status: string;
  price?: { amount: number; currency: string };
}

interface ApiPackage {
  id: string;
  title: string;
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  price?: number;
  money?: { amount: number; currency: string };
  status: string;
  isPromotional?: boolean;
  is_promotional?: boolean;
  promotionDiscountType?: 'FLAT' | 'PERCENTAGE' | null;
  promotion_discount_type?: 'FLAT' | 'PERCENTAGE' | null;
  promotionDiscountValue?: number | null;
  promotion_discount_value?: number | null;
  serviceId?: string;
  itemIds?: string[];
  items?: { serviceId: string; service?: ApiService }[];
}

export default function EditPackagePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'AED',
    status: 'ACTIVE',
    serviceId: '',
    isPromotional: false,
    promotionDiscountType: 'PERCENTAGE',
    promotionDiscountValue: '',
  });

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [pkg, rows] = await Promise.all([
          vendorApi.packages.get<ApiPackage>(id),
          vendorApi.services.list<ApiService[]>(),
        ]);

        const selectedServiceId = pkg.serviceId || pkg.items?.[0]?.serviceId || pkg.itemIds?.[0] || '';
        const activeRows = rows.filter((service) => service.status === 'ACTIVE' || service.id === selectedServiceId);

        setServices(activeRows);
        setForm({
          title: pkg.title || pkg.name || '',
          description: pkg.description || '',
          price: String(pkg.money?.amount ?? pkg.amount ?? pkg.price ?? 0),
          currency: pkg.money?.currency ?? pkg.currency ?? 'AED',
          status: pkg.status || 'ACTIVE',
          serviceId: selectedServiceId,
          isPromotional: Boolean(pkg.isPromotional || pkg.is_promotional),
          promotionDiscountType: pkg.promotionDiscountType || pkg.promotion_discount_type || 'PERCENTAGE',
          promotionDiscountValue: String(pkg.promotionDiscountValue ?? pkg.promotion_discount_value ?? ''),
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Failed to load package');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

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
      await vendorApi.packages.update(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        serviceId: form.serviceId,
        exactPrice: Number(form.price),
        currency: form.currency,
        status: form.status,
        isPromotional: form.isPromotional,
        promotionDiscountType: form.isPromotional ? form.promotionDiscountType : undefined,
        promotionDiscountValue: form.isPromotional ? Number(form.promotionDiscountValue || 0) : undefined,
      });

      sessionStorage.setItem('pkg_success', `"${form.title}" updated successfully!`);
      router.push('/vendor/packages');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to update package.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="mx-auto mb-4 animate-spin text-orange-500" />
          <p className="text-gray-500">Loading package...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-gray-800">{error}</p>
          <button onClick={() => router.push('/vendor/packages')} className="mt-4 text-sm text-orange-500 underline">
            Back to Packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 pb-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-950">Edit Package</h1>
          <p className="text-sm text-gray-500">Keep one exact package price under one service.</p>
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
              <p className="text-sm text-gray-500">Use the same compact layout as create and update only what changed.</p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="space-y-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Package title *</label>
              <input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={4}
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

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Promotional package</p>
                    <p className="text-xs text-gray-500">Customers will see the promotional price in service packages and promotions.</p>
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
                        onChange={(e) => setField('promotionDiscountValue', e.target.value)}
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
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
