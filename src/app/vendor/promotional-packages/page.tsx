'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BadgePercent, CheckCircle2, Edit3, Loader2, Megaphone, Package as PackageIcon, Search, Sparkles, X } from 'lucide-react';
import { vendorApi } from '@/api/vendorApi';

interface PackageService {
  id: string;
  title: string;
}

interface ApiPackage {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  price?: number;
  money?: { amount: number; currency: string };
  status: string;
  items?: Array<{ serviceId: string; service?: PackageService }>;
  serviceId?: string;
  itemIds?: string[];
  isPromotional?: boolean;
  is_promotional?: boolean;
  promotionDiscountType?: 'FLAT' | 'PERCENTAGE' | null;
  promotion_discount_type?: 'FLAT' | 'PERCENTAGE' | null;
  promotionDiscountValue?: number | null;
  promotion_discount_value?: number | null;
}

function packageAmount(pkg: ApiPackage) {
  return pkg.money?.amount ?? pkg.amount ?? pkg.price ?? 0;
}

function packageCurrency(pkg: ApiPackage) {
  return pkg.money?.currency ?? pkg.currency ?? 'AED';
}

function packageServiceName(pkg: ApiPackage) {
  return pkg.items?.[0]?.service?.title || pkg.serviceId || pkg.itemIds?.[0] || 'Service not linked';
}

function promotionalMeta(pkg: ApiPackage) {
  const isPromotional = Boolean(pkg.isPromotional || pkg.is_promotional);
  const discountType = pkg.promotionDiscountType || pkg.promotion_discount_type || null;
  const discountValue = pkg.promotionDiscountValue ?? pkg.promotion_discount_value ?? 0;
  const amount = packageAmount(pkg);

  if (!isPromotional || !discountType || !discountValue) {
    return {
      isPromotional: false,
      discountType,
      discountValue,
      finalAmount: amount,
      hasDiscount: false,
    };
  }

  const finalAmount =
    discountType === 'FLAT'
      ? Math.max(0, amount - discountValue)
      : Math.max(0, amount - Math.round((amount * discountValue) / 100));

  return {
    isPromotional: true,
    discountType,
    discountValue,
    finalAmount,
    hasDiscount: finalAmount < amount,
  };
}

function PromotionModal({
  pkg,
  open,
  onClose,
  onSaved,
}: {
  pkg: ApiPackage | null;
  open: boolean;
  onClose: () => void;
  onSaved: (pkg: ApiPackage) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENTAGE'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');

  useEffect(() => {
    if (!pkg) return;
    setEnabled(Boolean(pkg.isPromotional || pkg.is_promotional));
    setDiscountType((pkg.promotionDiscountType || pkg.promotion_discount_type || 'PERCENTAGE') as 'FLAT' | 'PERCENTAGE');
    setDiscountValue(String(pkg.promotionDiscountValue ?? pkg.promotion_discount_value ?? ''));
    setError('');
    setSaving(false);
  }, [pkg]);

  if (!open || !pkg) return null;

  const baseAmount = packageAmount(pkg);
  const previewAmount =
    enabled && discountValue
      ? discountType === 'FLAT'
        ? Math.max(0, baseAmount - Number(discountValue))
        : Math.max(0, baseAmount - Math.round((baseAmount * Number(discountValue)) / 100))
      : baseAmount;

  const handleSave = async () => {
    if (enabled && (!discountValue || Number(discountValue) <= 0)) {
      setError('Enter a valid discount value.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await vendorApi.packages.update<ApiPackage>(pkg.id, {
        isPromotional: enabled,
        promotionDiscountType: enabled ? discountType : undefined,
        promotionDiscountValue: enabled ? Number(discountValue) : undefined,
      });
      onSaved(updated);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save promotional settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
          <X size={18} />
        </button>

        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
            <Megaphone size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Promotional Package</h2>
            <p className="text-sm text-gray-500">{pkg.title}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Enable promotion</p>
                <p className="text-xs text-gray-500">Show this package on the customer promotions page with discounted pricing.</p>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
              />
            </div>
          </div>

          {enabled && (
            <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">Discount type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'FLAT' | 'PERCENTAGE')}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FLAT">Flat</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {discountType === 'FLAT' ? 'Flat discount' : 'Discount percentage'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'FLAT' ? '150' : '20'}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price preview</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div>
                <p className="text-xs text-gray-500">Base price</p>
                <p className="text-lg font-semibold text-gray-700">{baseAmount.toLocaleString()} {packageCurrency(pkg)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Promotion price</p>
                <p className="text-2xl font-bold text-orange-500">{previewAmount.toLocaleString()} {packageCurrency(pkg)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-2">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {saving ? 'Saving...' : 'Save Promotion'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionalPackagesPage() {
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ApiPackage | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError('');
      setPackages(await vendorApi.packages.list<ApiPackage[]>());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load packages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPackages();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (!q) return true;
      return (
        pkg.title.toLowerCase().includes(q) ||
        (pkg.description || '').toLowerCase().includes(q) ||
        packageServiceName(pkg).toLowerCase().includes(q)
      );
    });
  }, [packages, search]);

  const promotionalCount = packages.filter((pkg) => promotionalMeta(pkg).isPromotional).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotional Packages</h1>
          <p className="text-sm text-gray-500">Pick any sellable package and turn it into a flat or percentage-based promotion.</p>
        </div>
        <Link
          href="/vendor/packages"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-500"
        >
          <PackageIcon size={16} /> Open All Packages
        </Link>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total packages</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{packages.length}</p>
        </div>
        <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Live promotions</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{promotionalCount}</p>
        </div>
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Normal packages</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{Math.max(0, packages.length - promotionalCount)}</p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search package or linked service..."
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-100 bg-white">
          <div className="text-center">
            <Loader2 size={40} className="mx-auto mb-4 animate-spin text-orange-500" />
            <p className="text-gray-500">Loading packages...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Sparkles size={42} className="mx-auto mb-4 text-gray-300" />
          <p className="font-medium text-gray-500">No packages match this search.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((pkg) => {
            const promo = promotionalMeta(pkg);
            return (
              <div key={pkg.id} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">{pkg.title}</h2>
                      {promo.isPromotional ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-600">
                          <BadgePercent size={12} /> Promotional
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">Standard</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{packageServiceName(pkg)}</p>
                    {pkg.description && <p className="mt-3 line-clamp-2 text-sm text-gray-600">{pkg.description}</p>}
                  </div>
                  <button
                    onClick={() => setSelected(pkg)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
                  >
                    <Edit3 size={15} />
                    {promo.isPromotional ? 'Edit Promo' : 'Make Promo'}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Base price</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{packageAmount(pkg).toLocaleString()} {packageCurrency(pkg)}</p>
                  </div>
                  <div className="rounded-2xl bg-orange-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-orange-400">Promotion price</p>
                    <p className="mt-1 text-lg font-semibold text-orange-600">{promo.finalAmount.toLocaleString()} {packageCurrency(pkg)}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Discount</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {promo.isPromotional ? `${promo.discountValue} ${promo.discountType === 'FLAT' ? packageCurrency(pkg) : '%'}` : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PromotionModal
        pkg={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSaved={(updated) => {
          setPackages((current) => current.map((item) => (item.id === updated.id ? updated : item)));
          setSuccess(`"${updated.title}" promotional settings saved.`);
          window.setTimeout(() => setSuccess(''), 3000);
        }}
      />
    </div>
  );
}
