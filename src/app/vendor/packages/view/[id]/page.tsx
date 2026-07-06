"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Mail,
  MapPin,
  Package as PackageIcon,
  Phone,
  Star,
  Tag,
  Truck,
  Users,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Eye,
  Building2,
  Sparkles,
  Layers,
  Info,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";

interface PackageService {
  id: string;
  title: string;
  category?: { name: string };
  imageUrl?: string | null;
  description?: string;
}

interface ApiPackageItem {
  id?: string;
  serviceId: string;
  service?: PackageService;
}

interface Vendor {
  id: string;
  name?: string;
  businessName?: string;
  companyName?: string;
  vendorName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface ApiPackage {
  id: string;
  vendorId: string;
  vendor?: Vendor;
  title: string;
  name?: string;
  description?: string;
  amount?: number;
  currency?: string;
  price?: number;
  money?: { amount: number; currency: string };
  price_unit?: string;
  priceUnit?: string;
  status: string;
  itemIds?: string[];
  items?: ApiPackageItem[];
  inclusions?: string[];
  includedItems?: string[];
  features?: string[];
  max_guests?: number;
  maxGuests?: number;
  duration_hours?: number;
  durationHours?: number;
  is_popular?: boolean;
  isPopular?: boolean;
  is_promotional?: boolean;
  isPromotional?: boolean;
  promotion_discount_type?: string | null;
  promotionDiscountType?: string | null;
  promotion_discount_value?: number | null;
  promotionDiscountValue?: number | null;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  showOnHomepage?: boolean;
  show_on_homepage?: boolean;
  exactPrice?: number;
  exact_price?: number;
  vendorPhone?: string;
  vendorEmail?: string;
  imageUrl?: string;
  image_url?: string;
  minGuests?: number;
  min_order?: number;
  original_price?: number;
  promotional_price?: number;
  promotionalPrice?: number;
  service_id?: string;
}

function packageAmount(pkg: ApiPackage) {
  return pkg.money?.amount ?? pkg.amount ?? pkg.price ?? pkg.exactPrice ?? pkg.exact_price ?? 0;
}

function packageCurrency(pkg: ApiPackage) {
  return pkg.money?.currency ?? pkg.currency ?? "AED";
}

export default function PackageViewPage() {
  const params = useParams();
  const router = useRouter();
  const [pkg, setPkg] = useState<ApiPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState(false);
  const [showAllInclusions, setShowAllInclusions] = useState(false);

  const packageId = params.id as string;
  
  const hasFetched = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPackage = useCallback(async () => {
    if (hasFetched.current) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await vendorApi.packages.get<ApiPackage>(packageId);
      
      if (!abortController.signal.aborted) {
        setPkg(data);
        hasFetched.current = true;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (!abortController.signal.aborted) {
        setError(err instanceof Error ? err.message : "Failed to load package details");
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [packageId]);

  useEffect(() => {
    hasFetched.current = false;
    
    if (packageId) {
      fetchPackage();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [packageId, fetchPackage]);

  const handleToggle = async () => {
    if (!pkg) return;
    const newStatus = pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await vendorApi.packages.updateStatus(pkg.id, newStatus);
      setPkg({ ...pkg, status: newStatus });
      setSuccess(`Package ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully`);
      setToggleConfirm(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to update package status.");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleDelete = async () => {
    if (!pkg) return;
    try {
      await vendorApi.packages.delete(pkg.id);
      router.push("/vendor/packages");
    } catch {
      setError("Failed to delete package.");
      setTimeout(() => setError(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-orange-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-500 font-medium">Loading package details...</p>
        </div>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Package Not Found</h3>
        <p className="text-gray-500 mt-2">{error || "The package you're looking for doesn't exist."}</p>
        <Link 
          href="/vendor/packages" 
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft size={18} /> Back to Packages
        </Link>
      </div>
    );
  }

  const amount = packageAmount(pkg);
  const currency = packageCurrency(pkg);
  const packageName = pkg.title || pkg.name || "Package";
  
  const includedItems = pkg.inclusions || pkg.includedItems || [];
  const features = pkg.features || [];
  
  const maxGuests = pkg.maxGuests ?? pkg.max_guests ?? null;
  const duration = pkg.durationHours ?? pkg.duration_hours ?? null;
  const priceUnit = pkg.priceUnit || pkg.price_unit || "per event";
  
  const isPopular = pkg.isPopular ?? pkg.is_popular ?? false;
  const isPromotional = pkg.isPromotional ?? pkg.is_promotional ?? false;
  const showOnHomepage = pkg.showOnHomepage ?? pkg.show_on_homepage ?? false;
  const createdAt = pkg.createdAt || pkg.created_at;
  
  const packageImage = pkg.imageUrl || pkg.image_url || null;
  const defaultImage = `https://eventstancom.vercel.app/images/featured-services/featured-services-1.jpg`;

  const getPromotionalPrice = () => {
    if (!isPromotional) return null;
    
    if (pkg.promotional_price) return pkg.promotional_price;
    if (pkg.promotionalPrice) return pkg.promotionalPrice;
    
    const discountType = pkg.promotionDiscountType || pkg.promotion_discount_type;
    const discountValue = pkg.promotionDiscountValue ?? pkg.promotion_discount_value;
    
    if (discountType === "PERCENTAGE" && discountValue) {
      return amount - (amount * discountValue / 100);
    }
    if (discountType === "FLAT" && discountValue) {
      return amount - discountValue;
    }
    return null;
  };

  const promotionalPrice = getPromotionalPrice();
  const services = pkg.items || [];

  // Show only 4 items initially, then "View More"
  const displayInclusions = showAllInclusions ? includedItems : includedItems.slice(0, 4);
  const hasMoreInclusions = includedItems.length > 4;

  // Get service names for display - full names
  const serviceNames = services.map(item => item.service?.title || item.serviceId).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/vendor/packages"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Packages
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/vendor/packages/edit/${pkg.id}`}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Edit3 size={16} /> Edit
          </Link>
          <button
            onClick={() => setToggleConfirm(true)}
            className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              pkg.status === "ACTIVE"
                ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                : "border-green-200 text-green-700 hover:bg-green-50"
            }`}
          >
            {pkg.status === "ACTIVE" ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
            {pkg.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* ✅ SINGLE CARD */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* 1. Package Image */}
        <div className="relative w-full h-56 md:h-72 bg-gradient-to-r from-orange-100 to-orange-200 overflow-hidden">
          <img
            src={packageImage || defaultImage}
            alt={packageName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultImage;
            }}
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              pkg.status === "ACTIVE" 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-500"
            }`}>
              {pkg.status === "ACTIVE" ? "● Active" : "● Inactive"}
            </span>
            {isPopular && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">
                ★ Popular
              </span>
            )}
            {isPromotional && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
                🔥 Promotional
              </span>
            )}
          </div>
        </div>

        {/* 2. Quick Stats - Top par icons ke saath */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 md:p-5 bg-orange-50/50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <PackageIcon size={16} className="text-orange-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Price</p>
              <p className="text-sm font-bold text-gray-900">
                {promotionalPrice ? (
                  <>
                    <span className="text-green-600">{promotionalPrice.toLocaleString()} {currency}</span>
                    <span className="text-xs text-gray-400 line-through ml-1">{amount.toLocaleString()} {currency}</span>
                  </>
                ) : (
                  <>{amount.toLocaleString()} {currency}</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Users size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Capacity</p>
              <p className="text-sm font-bold text-gray-900">{maxGuests || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Duration</p>
              <p className="text-sm font-bold text-gray-900">{duration || "—"}h</p>
            </div>
          </div>
          <div className="flex items-center gap-3 col-span-2 md:col-span-1">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <PackageIcon size={16} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Services</p>
              <p className="text-sm font-medium text-gray-900 break-words">
                {serviceNames.length > 0 ? serviceNames.join(", ") : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Header Section - Package title ke saath */}
        <div className="p-5 md:p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {packageName}
                </h1>
              </div>
              {services.length > 0 && services[0]?.service?.category?.name && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                    {services[0].service.category.name}
                  </span>
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-2 justify-end">
                {promotionalPrice ? (
                  <>
                    <span className="text-xl font-bold text-green-600">
                      {promotionalPrice.toLocaleString()} {currency}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {amount.toLocaleString()} {currency}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-gray-900">
                    {amount.toLocaleString()} {currency}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 capitalize">{priceUnit}</p>
              {maxGuests && (
                <p className="text-xs text-gray-400 mt-0.5">
                  min 1 – max {maxGuests} guests
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 4. Description */}
        {pkg.description && (
          <div className="p-5 md:p-6 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                <Info size={14} className="text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-1.5">Description</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{pkg.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. What's Included + Features - Same row mein */}
        <div className="p-5 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* What's Included */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                What's Included {includedItems.length > 0 && `(${includedItems.length})`}
              </h2>
              {includedItems.length > 0 ? (
                <div className="space-y-1.5">
                  {displayInclusions.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-2.5 p-2 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                      <span className="text-gray-700 text-sm">{item}</span>
                    </div>
                  ))}
                  {hasMoreInclusions && (
                    <button
                      onClick={() => setShowAllInclusions(!showAllInclusions)}
                      className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-600 mt-2 transition-colors"
                    >
                      {showAllInclusions ? (
                        <>Show Less <ChevronUp size={14} /></>
                      ) : (
                        <>View More ({includedItems.length - 3} more) <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No items listed</p>
              )}
            </div>

            {/* Features */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                Features {features.length > 0 && `(${features.length})`}
              </h2>
              {features.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {features.map((feature, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No features listed</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} aria-label="Close" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <button onClick={() => setDeleteConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 size={28} className="text-red-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Delete Package?</h2>
              <p className="text-sm text-gray-500 mt-2">"{packageName}" will be permanently deleted.</p>
              <p className="text-xs text-red-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition">
                Delete Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Confirmation Modal */}
      {toggleConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setToggleConfirm(false)} aria-label="Close" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <button onClick={() => setToggleConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              pkg.status === "ACTIVE" ? "bg-gray-50" : "bg-green-50"
            }`}>
              {pkg.status === "ACTIVE" 
                ? <ToggleLeft size={28} className="text-gray-500" /> 
                : <ToggleRight size={28} className="text-green-500" />
              }
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {pkg.status === "ACTIVE" ? "Deactivate" : "Activate"} Package?
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                {pkg.status === "ACTIVE"
                  ? `"${packageName}" will be hidden from customers.`
                  : `"${packageName}" will become visible to customers.`}
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={() => setToggleConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={handleToggle}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition ${
                  pkg.status === "ACTIVE" ? "bg-gray-600 hover:bg-gray-700" : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {pkg.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}