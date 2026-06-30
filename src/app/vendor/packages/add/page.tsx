'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package as PackageIcon,
  Upload,
  X,
  Info,
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

interface CategoryGroup {
  id: string;
  name: string;
  services: ApiService[];
}

export default function AddPackagePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [services, setServices] = useState<ApiService[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'AED',
    serviceId: '',
    categoryId: '',
    maxGuests: '',
    durationHours: '',
    isPromotional: false,
    promotionDiscountType: 'PERCENTAGE',
    promotionDiscountValue: '',
    promotionStartDate: '',
    promotionEndDate: '',
  });

  useEffect(() => {
    async function loadServices() {
      try {
        const rows = await vendorApi.services.list<ApiService[]>();
        const activeRows = rows.filter((service) => service.status === 'ACTIVE');
        setServices(activeRows);

        const categoryMap = new Map<string, CategoryGroup>();
        activeRows.forEach((service) => {
          const categoryId = service.categoryId || 'uncategorized';
          const categoryName = service.category || 'Uncategorized';
          
          if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, {
              id: categoryId,
              name: categoryName,
              services: [],
            });
          }
          categoryMap.get(categoryId)!.services.push(service);
        });

        const categoryList = Array.from(categoryMap.values());
        setCategories(categoryList);

        if (categoryList.length > 0 && categoryList[0].services.length > 0) {
          const firstService = categoryList[0].services[0];
          setForm((current) => ({
            ...current,
            categoryId: categoryList[0].id,
            serviceId: firstService.id,
            currency: firstService.price?.currency || current.currency,
          }));
        }
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Failed to load services');
      } finally {
        setLoading(false);
      }
    }

    void loadServices();
  }, []);

  const getServicesForCategory = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.services || [];
  };

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const handleCategoryChange = (categoryId: string) => {
    const categoryServices = getServicesForCategory(categoryId);
    const firstService = categoryServices[0];
    setForm((current) => ({
      ...current,
      categoryId,
      serviceId: firstService?.id || '',
      currency: firstService?.price?.currency || current.currency,
    }));
    setFormError('');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size should be less than 5MB.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setFormError('');
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    if (form.maxGuests && Number(form.maxGuests) <= 0) {
      setFormError('Max guests must be greater than 0.');
      return;
    }
    if (form.durationHours && Number(form.durationHours) <= 0) {
      setFormError('Duration must be greater than 0.');
      return;
    }
    if (form.isPromotional) {
      if (!form.promotionDiscountValue || Number(form.promotionDiscountValue) <= 0) {
        setFormError('Enter a valid promotional discount value.');
        return;
      }
      if (!form.promotionStartDate) {
        setFormError('Promotion start date is required.');
        return;
      }
      if (!form.promotionEndDate) {
        setFormError('Promotion end date is required.');
        return;
      }
      if (new Date(form.promotionStartDate) >= new Date(form.promotionEndDate)) {
        setFormError('Promotion end date must be after start date.');
        return;
      }
    }

    setSaving(true);
    try {
      const vendorId = getUser()?.vendorId;
      if (!vendorId) throw new Error('Vendor profile not found. Please sign in again.');

      let uploadedImageUrl = '';
      if (imageFile) {
        setUploadingImage(true);
        try {
          const result = await vendorApi.uploads.image(imageFile, 'packages');
          uploadedImageUrl = result.url || '';
        } catch (error) {
          setFormError('Failed to upload image. Please try again.');
          setSaving(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      await vendorApi.packages.create({
        vendorId,
        title: form.title.trim(),
        description: form.description.trim(),
        serviceId: form.serviceId,
        exactPrice: Number(form.price),
        currency: form.currency,
        maxGuests: form.maxGuests ? Number(form.maxGuests) : undefined,
        durationHours: form.durationHours ? Number(form.durationHours) : undefined,
        imageUrl: uploadedImageUrl || undefined,
        isPromotional: form.isPromotional,
        promotionDiscountType: form.isPromotional ? form.promotionDiscountType : undefined,
        promotionDiscountValue: form.isPromotional ? Number(form.promotionDiscountValue || 0) : undefined,
        promotionStartDate: form.isPromotional ? new Date(form.promotionStartDate) : undefined,
        promotionEndDate: form.isPromotional ? new Date(form.promotionEndDate) : undefined,
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
    <div className="mx-auto max-w-4xl space-y-3 pb-3">
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

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Category *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.services.length})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Service *</label>
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
                  {getServicesForCategory(form.categoryId).map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <div className="space-y-3">
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Package title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="e.g. Romance in Bloom"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={4}
                    placeholder="Describe the package outcome, style, and what customers should expect."
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Max Guests</label>
                    <input
                      type="number"
                      min="0"
                      value={form.maxGuests}
                      onChange={(e) => setField('maxGuests', e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Duration (hrs)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.durationHours}
                      onChange={(e) => setField('durationHours', e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Package price *</label>
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
                    <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Currency</label>
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
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Discount type</label>
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
                          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">
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

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Start Date *</label>
                          <input
                            type="date"
                            value={form.promotionStartDate}
                            onChange={(e) => setField('promotionStartDate', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">End Date *</label>
                          <input
                            type="date"
                            value={form.promotionEndDate}
                            onChange={(e) => setField('promotionEndDate', e.target.value)}
                            min={form.promotionStartDate || new Date().toISOString().split('T')[0]}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-600">Package Image</label>
              <div className="mt-1">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Package preview"
                      className="h-40 w-40 rounded-2xl object-cover border border-gray-200"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-orange-400 hover:bg-orange-50/30"
                  >
                    <Upload size={32} className="text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Click to upload package image</p>
                    <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 5MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <div className="mt-2 flex items-start gap-2 rounded-xl bg-blue-50 p-3 border border-blue-100">
                <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Note:</span> If you don't upload an image, the category's default image will be used for this package.
                </p>
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
              disabled={saving || uploadingImage}
              className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              <span className="flex items-center justify-center gap-2">
                {(saving || uploadingImage) ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {uploadingImage ? 'Uploading Image...' : saving ? 'Creating...' : 'Create Package'}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}