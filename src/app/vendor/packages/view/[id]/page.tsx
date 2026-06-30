"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Package as PackageIcon,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Clock,
  Users,
  Star,
  Calendar,
  Building2,
  Tag,
  Sparkles,
  Gift,
  Layers,
  Info,
  Eye,
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
  features?: string[];
  max_guests?: number;
  duration_hours?: number;
  is_popular?: boolean;
  is_promotional?: boolean;
  promotion_discount_type?: string | null;
  promotion_discount_value?: number | null;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  showOnHomepage?: boolean;
  exactPrice?: number;
  exact_price?: number;
}

function packageAmount(pkg: ApiPackage) {
  return pkg.money?.amount ?? pkg.amount ?? pkg.price ?? pkg.exactPrice ?? pkg.exact_price ?? 0;
}

function packageCurrency(pkg: ApiPackage) {
  return pkg.money?.currency ?? pkg.currency ?? "USD";
}

function packageServices(pkg: ApiPackage): ApiPackageItem[] {
  if (pkg.items?.length) return pkg.items;
  return (pkg.itemIds ?? []).map((serviceId) => ({ serviceId }));
}

function getVendorName(pkg: ApiPackage, fallback?: string): string {
  if (pkg.vendor?.businessName) return pkg.vendor.businessName;
  if (pkg.vendor?.companyName) return pkg.vendor.companyName;
  if (pkg.vendor?.vendorName) return pkg.vendor.vendorName;
  if (pkg.vendor?.name) return pkg.vendor.name;
  if (fallback) return fallback;
  return "Vendor";
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
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "details">("overview");
  const [myVendorName, setMyVendorName] = useState<string>("");

  const packageId = params.id as string;

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await vendorApi.packages.get<ApiPackage>(packageId);
        setPkg(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load package details");
      } finally {
        setLoading(false);
      }
    };

    if (packageId) {
      fetchPackage();
    }
  }, [packageId]);

  useEffect(() => {
    const fetchVendorName = async () => {
      try {
        const profile = await vendorApi.profile.get<{ companyName?: string; name?: string }>();
        setMyVendorName(profile?.companyName || profile?.name || "");
      } catch {
        // ignore — fall back to default label
      }
    };
    fetchVendorName();
  }, []);

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
          <p className="text-sm text-gray-400 mt-1">Please wait</p>
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

  const services = packageServices(pkg);
  const amount = packageAmount(pkg);
  const currency = packageCurrency(pkg);
  const vendorName = getVendorName(pkg, myVendorName);
  const packageName = pkg.title || pkg.name || "Package";

  // Calculate promotional price
  const getPromotionalPrice = () => {
    if (!pkg.is_promotional) return null;
    if (pkg.promotion_discount_type === "PERCENTAGE" && pkg.promotion_discount_value) {
      return amount - (amount * pkg.promotion_discount_value / 100);
    }
    if (pkg.promotion_discount_type === "FIXED" && pkg.promotion_discount_value) {
      return amount - pkg.promotion_discount_value;
    }
    return null;
  };

  const promotionalPrice = getPromotionalPrice();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <span>{error}</span>
        </div>
      )}

      {/* Header with Breadcrumb */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/vendor/packages" className="hover:text-orange-500 transition-colors">Packages</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium truncate">{packageName}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shadow-sm">
              <PackageIcon size={28} className="text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{packageName}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Building2 size={14} className="text-orange-500" /> 
                  {vendorName}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/vendor/packages/edit/${pkg.id}`}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
            >
              <Edit3 size={16} /> Edit Package
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
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Status & Badges Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
            pkg.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            {pkg.status === "ACTIVE" ? <ToggleRight size={14} className="text-green-500" /> : <ToggleLeft size={14} />}
            {pkg.status === "ACTIVE" ? "Active" : "Inactive"}
          </span>
          {pkg.is_popular && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700">
              <Star size={14} className="fill-yellow-500" /> Popular
            </span>
          )}
          {pkg.is_promotional && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-full bg-red-100 text-red-700">
              <Tag size={14} /> Promotional
            </span>
          )}
          {pkg.showOnHomepage && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-full bg-purple-100 text-purple-700">
              <Eye size={14} /> Show on Homepage
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
          <span>Updated: {pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleDateString() : "—"}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <PackageIcon size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase">Price</p>
              {promotionalPrice ? (
                <div>
                  <p className="text-xl font-bold text-green-600">
                    {promotionalPrice.toLocaleString()} {currency}
                  </p>
                  <p className="text-xs text-gray-400 line-through">
                    {amount.toLocaleString()} {currency}
                  </p>
                </div>
              ) : (
                <p className="text-xl font-bold text-gray-900">
                  {amount.toLocaleString()} {currency}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">per {pkg.price_unit || pkg.priceUnit || "package"}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase">Capacity</p>
              <p className="text-xl font-bold text-gray-900">{pkg.max_guests || "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">max guests</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Clock size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase">Duration</p>
              <p className="text-xl font-bold text-gray-900">{pkg.duration_hours || "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">hours</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Layers size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase">Services</p>
              <p className="text-xl font-bold text-gray-900">{services.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">included</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 p-1 shadow-sm">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "overview"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Info size={16} /> Overview
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "services"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Layers size={16} /> Services ({services.length})
        </button>
        <button
          onClick={() => setActiveTab("details")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === "details"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Gift size={16} /> Inclusions & Features
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {pkg.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
                  Description
                </h3>
                <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{pkg.description}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pkg.inclusions && pkg.inclusions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-green-500 rounded-full"></span>
                    Inclusions
                    <span className="ml-auto text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                      {pkg.inclusions.length} items
                    </span>
                  </h3>
                  <ul className="space-y-2 bg-gray-50 rounded-xl p-4">
                    {pkg.inclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                        <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pkg.features && pkg.features.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                    Features
                    <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {pkg.features.length} items
                    </span>
                  </h3>
                  <ul className="space-y-2 bg-gray-50 rounded-xl p-4">
                    {pkg.features.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                        <Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Quick Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Vendor</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{vendorName}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Price Unit</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5 capitalize">{pkg.price_unit || pkg.priceUnit || "Standard"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Promotional</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{pkg.is_promotional ? "Yes" : "No"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Created</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">
                    {pkg.createdAt || pkg.created_at 
                      ? new Date(pkg.createdAt || pkg.created_at || "").toLocaleDateString() 
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
                Included Services
              </h3>
              <span className="text-sm bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-medium">
                {services.length} services
              </span>
            </div>
            {services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((item) => (
                  <div 
                    key={item.serviceId} 
                    className="flex items-start gap-4 p-4 bg-gradient-to-br from-orange-50/50 to-white border border-orange-100 rounded-xl hover:border-orange-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-white overflow-hidden shrink-0 flex items-center justify-center border border-orange-100 group-hover:border-orange-300 transition-colors shadow-sm">
                      {item.service?.imageUrl ? (
                        <img 
                          src={item.service.imageUrl} 
                          alt={item.service.title} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <PackageIcon size={20} className="text-orange-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {item.service?.title || "Service"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.service?.category?.name || "Service"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <PackageIcon size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium">No services linked</p>
                <p className="text-sm text-gray-400 mt-1">This package doesn't have any services yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pkg.inclusions && pkg.inclusions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-green-500 rounded-full"></span>
                    Inclusions
                    <span className="ml-auto text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                      {pkg.inclusions.length} items
                    </span>
                  </h3>
                  <ul className="space-y-2 bg-green-50/30 rounded-xl p-4 border border-green-100">
                    {pkg.inclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                        <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pkg.features && pkg.features.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                    Features
                    <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {pkg.features.length} items
                    </span>
                  </h3>
                  <ul className="space-y-2 bg-blue-50/30 rounded-xl p-4 border border-blue-100">
                    {pkg.features.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                        <Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Vendor Information */}
            <div className="bg-orange-50/30 rounded-xl p-5 border border-orange-100">
              <h3 className="text-sm font-semibold text-orange-700 uppercase mb-3 flex items-center gap-2">
                <Building2 size={16} /> Vendor Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-orange-600/70">Vendor Name</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{vendorName}</p>
                </div>
                <div>
                  <p className="text-xs text-orange-600/70">Package Name</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{packageName}</p>
                </div>
              </div>
            </div>

            {/* Promotional Details */}
            {pkg.is_promotional && (
              <div className="bg-red-50/50 rounded-xl p-5 border border-red-200">
                <h3 className="text-sm font-semibold text-red-700 uppercase mb-3 flex items-center gap-2">
                  <Tag size={16} /> Promotional Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-red-600/70">Discount Type</p>
                    <p className="text-sm font-semibold text-red-700 capitalize">{pkg.promotion_discount_type || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-600/70">Discount Value</p>
                    <p className="text-sm font-semibold text-red-700">
                      {pkg.promotion_discount_type === "PERCENTAGE" 
                        ? `${pkg.promotion_discount_value}%` 
                        : pkg.promotion_discount_value 
                          ? `${pkg.promotion_discount_value} ${currency}` 
                          : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-red-600/70">Promotional Price</p>
                    <p className="text-sm font-semibold text-red-700">
                      {promotionalPrice 
                        ? `${promotionalPrice.toLocaleString()} ${currency}` 
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Additional Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Show on Homepage</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">{pkg.showOnHomepage ? "Yes" : "No"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Created At</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">
                    {pkg.createdAt || pkg.created_at 
                      ? new Date(pkg.createdAt || pkg.created_at || "").toLocaleString() 
                      : "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">
                    {pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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