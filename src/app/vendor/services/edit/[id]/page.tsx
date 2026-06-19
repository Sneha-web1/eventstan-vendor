"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Save,
  X,
  Upload,
  Plus,
  Trash2,
  Tag,
  Package,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";

const PRICE_UNITS = ["per event", "per person", "per hour", "per day", "per package"] as const;
const CURRENCIES = ["AED", "USD", "EUR", "SAR"] as const;

interface SubService {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  imageUrl?: string;
  status: string;
}

interface ApiService {
  id: string;
  vendorId: string;
  categoryId: string;
  title: string;
  category?: string;
  description?: string;
  city?: string;
  price?: { amount: number; currency: string };
  price_max?: number;
  price_unit?: string;
  image_url?: string;
  status: string;
  tags?: string[];
  gallery?: string[];
  features?: string[];
  subServices?: SubService[];
}

interface SubServiceForm {
  id: string;
  title: string;
  description: string;
  amount: string;
  currency: string;
  imageFile: File | null;
  imagePreview: string;
  existingImageUrl: string;
  status: string;
  isExisting?: boolean; // true = loaded from API (update), false/undefined = new (create)
}

const emptyForm = {
  title: "",
  description: "",
  city: "",
  amount: "",
  currency: "AED",
  priceMax: "",
  priceUnit: "per event",
  status: "ACTIVE",
  tags: [] as string[],
  features: [] as string[],
  imageUrl: "",
};

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [service, setService] = useState<ApiService | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  const [mainImage, setMainImage] = useState<{ file: File | null; preview: string }>({ file: null, preview: "" });
  const [galleryImages, setGalleryImages] = useState<{ file: File; preview: string }[]>([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [subServices, setSubServices] = useState<SubServiceForm[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [featuresInput, setFeaturesInput] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError("");
        const data = await vendorApi.services.get<ApiService>(id);
        setService(data);
        setForm({
          title: data.title || "",
          description: data.description || "",
          city: data.city || "",
          amount: String(data.price?.amount ?? ""),
          currency: data.price?.currency || "AED",
          priceMax: String(data.price_max ?? ""),
          priceUnit: data.price_unit || "per event",
          status: data.status || "ACTIVE",
          tags: data.tags || [],
          features: data.features || [],
          imageUrl: data.image_url || "",
        });
        
        if (data.image_url) {
          setMainImage({ file: null, preview: data.image_url });
        }
        
        if (data.gallery && data.gallery.length > 0) {
          setExistingGallery(data.gallery);
        }
        
        if (data.subServices && data.subServices.length > 0) {
          setSubServices(data.subServices.map(sub => ({
            id: sub.id,
            title: sub.title,
            description: sub.description || "",
            amount: String(sub.amount),
            currency: sub.currency,
            imageFile: null,
            imagePreview: sub.imageUrl || "",
            existingImageUrl: sub.imageUrl || "",
            status: sub.status,
            isExisting: true,
          })));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load service");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

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
    
    for (const file of Array.from(files)) {
      try {
        const result = await vendorApi.uploads.image(file, "services");
        setExistingGallery(prev => [...prev, result.url]);
      } catch (err) {
        console.error("Gallery upload failed:", err);
      }
    }
  };

  const removeGalleryImage = (index: number, isExisting: boolean, existingIndex?: number) => {
    if (isExisting && existingIndex !== undefined) {
      setExistingGallery(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      const newIndex = index - existingGallery.length;
      if (galleryImages[newIndex]?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(galleryImages[newIndex].preview);
      }
      setGalleryImages(prev => prev.filter((_, i) => i !== newIndex));
    }
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
        status: "ACTIVE",
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

  const setSubField = (index: number, key: keyof Omit<SubServiceForm, 'id'>, value: string) => {
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

  const validate = () => {
    if (!form.title.trim()) return "Service title is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.city.trim()) return "City is required.";
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
    if (!id) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      
      await vendorApi.services.update(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        city: form.city.trim(),
        price: {
          amount: Number(form.amount),
          currency: form.currency,
        },
        priceMax: form.priceMax ? Number(form.priceMax) : Number(form.amount),
        priceUnit: form.priceUnit,
        imageUrl: form.imageUrl || (mainImage.preview && !mainImage.preview.startsWith('blob:') ? mainImage.preview : undefined),
        status: form.status,
        tags: form.tags,
        gallery: existingGallery,
        features: form.features,
      });

      for (const sub of subServices) {
        if (sub.isExisting) {
          await vendorApi.services.updateSubService(sub.id, {
            title: sub.title.trim(),
            description: sub.description.trim(),
            price: {
              amount: Number(sub.amount),
              currency: sub.currency,
            },
            imageUrl: sub.existingImageUrl,
            status: sub.status,
          });
        } else {
          await vendorApi.services.createSubService(id, {
            title: sub.title.trim(),
            description: sub.description.trim(),
            price: {
              amount: Number(sub.amount),
              currency: sub.currency,
            },
            imageUrl: sub.existingImageUrl || undefined,
          });
        }
      }

      router.push("/vendor/services");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update service");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400 mx-auto" />
        <p className="text-gray-400 text-sm mt-3">Loading service...</p>
      </div>
    );
  }

  if (!service && error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <AlertTriangle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold">Service not found</p>
          <button onClick={() => router.push("/vendor/services")} className="mt-4 text-orange-500 text-sm underline">
            Back to Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {service?.category ? `Editing ${service.category}` : "Update your service details"}
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
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Category</label>
            <div className="px-4 py-2.5 text-sm bg-gray-50 rounded-xl text-gray-700">
              {service?.category || "Uncategorized"}
            </div>
            <p className="text-xs text-gray-400 mt-1">Category cannot be changed after creation</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">City *</label>
            <input 
              value={form.city} 
              onChange={(e) => setFormField("city", e.target.value)} 
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" 
              placeholder="e.g., Dubai, Abu Dhabi"
            />
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
                  {uploading ? "Uploading..." : "Upload New Image"}
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
            
            {(existingGallery.length > 0 || galleryImages.length > 0) && (
              <div className="grid grid-cols-3 gap-2">
                {existingGallery.map((url, idx) => (
                  <div key={`existing-${idx}`} className="relative aspect-square">
                    <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button 
                      onClick={() => removeGalleryImage(idx, true, idx)} 
                      className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {galleryImages.map((img, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square">
                    <img src={img.preview} alt={`Gallery ${existingGallery.length + idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <button 
                      onClick={() => removeGalleryImage(existingGallery.length + idx, false)} 
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
                          onClick={() => setSubField(idx, "imagePreview", "")} 
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Status</label>
                    <select 
                      value={sub.status} 
                      onChange={(e) => setSubField(idx, "status", e.target.value)} 
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Status</h2>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Service Status</label>
            <select 
              value={form.status} 
              onChange={(e) => setFormField("status", e.target.value)} 
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            >
              <option value="ACTIVE">Active - Visible to customers</option>
              <option value="INACTIVE">Inactive - Hidden from customers</option>
              <option value="DRAFT">Draft - Still editing</option>
            </select>
          </div>
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
          disabled={saving || uploading} 
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-2 transition"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}
