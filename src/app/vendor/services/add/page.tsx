"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  X,
  Upload,
  Tag,
  Package,
  Save,
  ImagePlus,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { getUser } from "@/lib/auth";

const CURRENCIES = ["AED", "USD", "EUR", "SAR"] as const;

const CITIES = [
  { id: "dubai", name: "Dubai" },
  { id: "abu_dhabi", name: "Abu Dhabi" },
  { id: "sharjah", name: "Sharjah" },
  { id: "ajman", name: "Ajman" },
  { id: "ras_al_khaimah", name: "Ras Al Khaimah" },
  { id: "fujairah", name: "Fujairah" },
  { id: "umm_al_quwain", name: "Umm Al Quwain" },
] as const;

const PRICE_UNITS = [
  "per event",
  "per person",
  "per hour",
  "per day",
  "per package",
] as const;

interface SubServiceForm {
  id: string;
  title: string;
  description: string;
  amount: string;
  currency: string;
  imageFile: File | null;
  imagePreview: string;
  existingImageUrl: string;
}

const emptyForm = {
  title: "",
  description: "",
  city: "",
  amount: "",
  currency: "AED",
  priceMax: "",
  priceUnit: "per event",
  tags: [] as string[],
  features: [] as string[],
  imageUrl: "",
  categoryId: "",
};

function getVendorId(): string {
  return getUser()?.vendorId ?? "";
}

export default function AddServicePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [vendorId, setVendorId] = useState<string>("");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  
  const [mainImage, setMainImage] = useState<{ file: File | null; preview: string }>({ file: null, preview: "" });
  const [galleryImages, setGalleryImages] = useState<{ file: File; preview: string }[]>([]);
  const [subServices, setSubServices] = useState<SubServiceForm[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [featuresInput, setFeaturesInput] = useState("");

  useEffect(() => {
    // Get vendor ID on component mount
    const id = getVendorId();
    if (!id) {
      queueMicrotask(() => setError("Vendor information not found. Please ensure you are logged in as a vendor."));
    } else {
      queueMicrotask(() => setVendorId(id));
    }

    const fetchMasterData = async () => {
      try {
        const [countries, categoryRows] = await Promise.all([
          vendorApi.masterData.countries<Array<{ code: string; defaultCurrency: string }>>(),
          vendorApi.masterData.categories<Array<{ id: string; name: string }>>(),
        ]);
        const uae = countries.find((country) => country.code === "AE");
        setCategories(categoryRows);
        setForm((current) => ({
          ...current,
          currency: uae?.defaultCurrency ?? current.currency,
          categoryId: current.categoryId || categoryRows[0]?.id || "",
        }));
      } catch (err) {
        console.error("Error fetching countries:", err);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    return () => {
      if (mainImage.preview && mainImage.preview.startsWith('blob:')) {
        URL.revokeObjectURL(mainImage.preview);
      }
      galleryImages.forEach(img => {
        if (img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
      });
      subServices.forEach(sub => {
        if (sub.imagePreview && sub.imagePreview.startsWith('blob:')) URL.revokeObjectURL(sub.imagePreview);
      });
    };
  }, [mainImage, galleryImages, subServices]);

  const setFormField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const handleMainImageUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      if (mainImage.preview && mainImage.preview.startsWith('blob:')) {
        URL.revokeObjectURL(mainImage.preview);
      }
      const preview = URL.createObjectURL(file);
      setMainImage({ file, preview });
      const result = await vendorApi.uploads.image(file, "services");
      setFormField("imageUrl", result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setGalleryImages(prev => [...prev, ...newImages]);
  };

  const removeGalleryImage = (index: number) => {
    if (galleryImages[index]?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(galleryImages[index].preview);
    }
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const addSubService = () => {
    setSubServices(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        amount: "",
        currency: "AED",
        imageFile: null,
        imagePreview: "",
        existingImageUrl: "",
      },
    ]);
  };

  const removeSubService = (index: number) => {
    const sub = subServices[index];
    if (sub.imagePreview && sub.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(sub.imagePreview);
    }
    setSubServices(prev => prev.filter((_, i) => i !== index));
  };

  const setSubField = <K extends keyof Omit<SubServiceForm, 'id'>>(
    index: number,
    key: K,
    value: SubServiceForm[K],
  ) => {
    setSubServices(prev => prev.map((sub, i) => i === index ? { ...sub, [key]: value } : sub));
  };

  const handleSubImageUpload = async (index: number, file: File) => {
    try {
      const sub = subServices[index];
      if (sub.imagePreview && sub.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(sub.imagePreview);
      }
      const preview = URL.createObjectURL(file);
      setSubServices(prev => prev.map((s, i) => i === index ? { ...s, imageFile: file, imagePreview: preview } : s));
      
      const result = await vendorApi.uploads.image(file, "subservices");
      setSubServices(prev => prev.map((s, i) => i === index ? { ...s, existingImageUrl: result.url } : s));
    } catch (err) {
      console.error("Sub-service image upload failed:", err);
      setError("Failed to upload sub-service image");
    }
  };

  const addTag = () => {
    if (tagsInput.trim() && !form.tags.includes(tagsInput.trim())) {
      setFormField("tags", [...form.tags, tagsInput.trim()]);
      setTagsInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormField("tags", form.tags.filter(t => t !== tag));
  };

  const addFeature = () => {
    if (featuresInput.trim() && !form.features.includes(featuresInput.trim())) {
      setFormField("features", [...form.features, featuresInput.trim()]);
      setFeaturesInput("");
    }
  };

  const removeFeature = (feature: string) => {
    setFormField("features", form.features.filter(f => f !== feature));
  };

  const uploadGalleryImages = async (): Promise<string[]> => {
    const galleryUrls: string[] = [];
    for (const img of galleryImages) {
      try {
        const result = await vendorApi.uploads.image(img.file, "services");
        galleryUrls.push(result.url);
      } catch (err) {
        console.error("Gallery upload failed:", err);
        throw new Error(`Failed to upload gallery image: ${img.file.name}`);
      }
    }
    return galleryUrls;
  };

  const validate = () => {
    if (!form.title.trim()) return "Service title is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.city || !form.city.trim()) return "City is required.";
    if (!form.amount || Number(form.amount) <= 0) return "Valid price is required.";
    if (form.priceMax && Number(form.priceMax) < Number(form.amount)) return "Max price cannot be less than base price.";
    for (const sub of subServices) {
      if (!sub.title.trim()) return "Sub-service title is required.";
      if (!sub.description.trim()) return "Sub-service description is required.";
      if (!sub.amount || Number(sub.amount) <= 0) return "Valid sub-service price is required.";
    }
    return "";
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!vendorId) {
      setError("Vendor information not found. Please logout and login again.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      
      // Upload main image if exists
      let mainImageUrl = "";
      if (mainImage.file) {
        const result = await vendorApi.uploads.image(mainImage.file, "services");
        mainImageUrl = result.url;
      }

      // Upload gallery images
      const galleryUrls = await uploadGalleryImages();

      // Create main service (no status field)
      const servicePayload = {
        vendorId,
        categoryId: form.categoryId,
        title: form.title.trim(),
        description: form.description.trim(),
        city: form.city.trim(),
        price: {
          amount: Number(form.amount),
          currency: form.currency,
        },
        priceMax: form.priceMax ? Number(form.priceMax) : Number(form.amount),
        priceUnit: form.priceUnit,
        imageUrl: mainImageUrl || undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
        gallery: galleryUrls.length > 0 ? galleryUrls : undefined,
        features: form.features.length > 0 ? form.features : undefined,
      };

      const createdService = await vendorApi.services.create<{ id: string }>(servicePayload);
      const serviceId = createdService.id;

      // Create sub-services (no status field)
      for (const sub of subServices) {
        await vendorApi.services.createSubService(serviceId, {
          title: sub.title.trim(),
          description: sub.description.trim(),
          price: {
            amount: Number(sub.amount),
            currency: sub.currency,
          },
          imageUrl: sub.existingImageUrl || undefined,
        });
      }

      router.push("/vendor/services");
    } catch (err) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to create service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Service</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Fill in the details to list a new service
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Basic Information</h2>
          
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Service Title *</label>
            <input 
              value={form.title} 
              onChange={(e) => setFormField("title", e.target.value)} 
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" 
              placeholder="e.g., Wedding Photography Package"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Category *</label>
            <select
              value={form.categoryId}
              onChange={(e) => setFormField("categoryId", e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">City *</label>
            <select
              value={form.city}
              onChange={(e) => setFormField("city", e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            >
              <option value="">Select a city</option>
              {CITIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Description *</label>
            <textarea 
              value={form.description} 
              onChange={(e) => setFormField("description", e.target.value)} 
              rows={4} 
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none" 
              placeholder="Describe what makes your service special..."
            />
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Base Price *</label>
              <input 
                type="number" 
                min="0" 
                step="0.01"
                value={form.amount} 
                onChange={(e) => setFormField("amount", e.target.value)} 
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" 
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Max Price (Optional)</label>
              <input 
                type="number" 
                min="0" 
                step="0.01"
                value={form.priceMax} 
                onChange={(e) => setFormField("priceMax", e.target.value)} 
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" 
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Currency</label>
              <select 
                value={form.currency} 
                onChange={(e) => setFormField("currency", e.target.value)} 
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              >
                {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Price Unit</label>
              <select 
                value={form.priceUnit} 
                onChange={(e) => setFormField("priceUnit", e.target.value)} 
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              >
                {PRICE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Images</h2>
          
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Main Image</label>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                {mainImage.preview ? (
                  <>
                    <img src={mainImage.preview} alt={form.title} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => { setMainImage({ file: null, preview: "" }); setFormField("imageUrl", ""); }} 
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-red-500 hover:bg-white transition"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => fileRef.current?.click()} 
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-orange-400 transition"
                  >
                    <ImagePlus size={24} />
                    <span className="text-xs">Upload</span>
                  </button>
                )}
              </div>
              <div className="flex-1">
                <input 
                  ref={fileRef} 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleMainImageUpload(e.target.files?.[0])} 
                />
                <button 
                  type="button" 
                  onClick={() => fileRef.current?.click()} 
                  disabled={uploading} 
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-orange-200 text-orange-600 text-sm font-semibold hover:bg-orange-50 disabled:opacity-60 transition"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? "Uploading..." : "Upload Image"}
                </button>
                <p className="text-xs text-gray-400 mt-2">Recommended: JPG, PNG, WebP, max 5MB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Gallery Images</label>
            <input 
              ref={galleryInputRef} 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={(e) => handleGalleryUpload(e.target.files)} 
            />
            <button 
              onClick={() => galleryInputRef.current?.click()} 
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-orange-400 transition-colors mb-3"
            >
              <Upload size={20} className="mx-auto text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Click to upload gallery images</p>
            </button>
            
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img src={img.preview} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button 
                      onClick={() => removeGalleryImage(idx)} 
                      className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Tags & Features</h2>
          
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Tags</label>
            <div className="flex gap-2 mb-3">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tags like: Wedding, Premium, Luxury"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
              <button 
                type="button" 
                onClick={addTag} 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                  <Tag size={10} />
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Features / What&apos;s Included</label>
            <div className="flex gap-2 mb-3">
              <input
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                placeholder="e.g., Free cancellation, Professional equipment"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
              <button 
                type="button" 
                onClick={addFeature} 
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.features.map((feature, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                  <CheckCircle2 size={10} />
                  {feature}
                  <button type="button" onClick={() => removeFeature(feature)} className="hover:text-green-900">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              <Package size={14} className="inline mr-1" />
              Sub-Services
              {subServices.length > 0 && (
                <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  {subServices.length}
                </span>
              )}
            </h2>
            <button 
              type="button" 
              onClick={addSubService} 
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-50 transition"
            >
              <Plus size={13} /> Add Sub-Service
            </button>
          </div>

          {subServices.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <Package size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No sub-services added</p>
              <p className="text-xs text-gray-400">Add optional add-ons or packages</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subServices.map((sub, idx) => (
                <div key={sub.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Sub-Service #{idx + 1}</span>
                    <button 
                      type="button" 
                      onClick={() => removeSubService(idx)} 
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Title *</label>
                    <input 
                      value={sub.title} 
                      onChange={(e) => setSubField(idx, "title", e.target.value)} 
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white" 
                      placeholder="e.g., Video add-on, Additional hour"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Description *</label>
                    <textarea 
                      value={sub.description} 
                      onChange={(e) => setSubField(idx, "description", e.target.value)} 
                      rows={2} 
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none bg-white" 
                      placeholder="Describe what this sub-service includes..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Price *</label>
                      <input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        value={sub.amount} 
                        onChange={(e) => setSubField(idx, "amount", e.target.value)} 
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Currency</label>
                      <select 
                        value={sub.currency} 
                        onChange={(e) => setSubField(idx, "currency", e.target.value)} 
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white"
                      >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Sub-Service Image</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id={`sub-image-${idx}`} 
                      onChange={(e) => e.target.files?.[0] && handleSubImageUpload(idx, e.target.files[0])} 
                    />
                    {!sub.imagePreview ? (
                      <button 
                        type="button" 
                        onClick={() => document.getElementById(`sub-image-${idx}`)?.click()} 
                        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-orange-400 transition"
                      >
                        <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-500">Upload image for this sub-service</p>
                      </button>
                    ) : (
                      <div className="relative">
                        <img src={sub.imagePreview} alt={sub.title} className="w-full h-40 object-cover rounded-lg" />
                        <button 
                          type="button" 
                          onClick={() => {
                            if (sub.imagePreview.startsWith('blob:')) URL.revokeObjectURL(sub.imagePreview);
                            setSubField(idx, "imagePreview", "");
                            setSubField(idx, "imageFile", null);
                            setSubField(idx, "existingImageUrl", "");
                          }} 
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pb-6">
        <button 
          type="button" 
          onClick={() => router.back()} 
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button 
          type="button" 
          onClick={save} 
          disabled={saving || uploading || !vendorId} 
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-2 transition"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Save size={16} /> Create Service</>}
        </button>
      </div>
    </div>
  );
}
