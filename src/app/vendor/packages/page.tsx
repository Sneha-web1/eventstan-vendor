"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit3,
  Eye,
  Layers,
  Loader2,
  Package as PackageIcon,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import Pagination from "@/components/vendor/Pagination";

type SortKey = "title" | "price" | "status" | "services";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

interface PackageService {
  id: string;
  title: string;
  category?: { name: string };
  imageUrl?: string | null;
}

interface ApiPackageItem {
  id?: string;
  serviceId: string;
  service?: PackageService;
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
  created_at?: string;
}

function packageAmount(pkg: ApiPackage) {
  return pkg.money?.amount ?? pkg.amount ?? pkg.price ?? 0;
}

function packageCurrency(pkg: ApiPackage) {
  return pkg.money?.currency ?? pkg.currency ?? "AED";
}

function packageServices(pkg: ApiPackage): ApiPackageItem[] {
  if (pkg.items?.length) return pkg.items;
  return (pkg.itemIds ?? []).map((serviceId) => ({ serviceId }));
}

function ConfirmModal({
  open, title, message, confirmLabel = "Confirm",
  confirmClass = "bg-red-500 hover:bg-red-600",
  icon, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string;
  confirmLabel?: string; confirmClass?: string;
  icon?: React.ReactNode; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-label="Close" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4">
        <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" aria-label="Close modal">
          <X size={18} />
        </button>
        {icon && <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">{icon}</div>}
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        </div>
        <div className="flex gap-3 w-full mt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PackageDetailModal({ pkg, open, onClose }: { pkg: ApiPackage | null; open: boolean; onClose: () => void }) {
  if (!open || !pkg) return null;
  const services = packageServices(pkg);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[82vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{pkg.title || pkg.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Status</p>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${pkg.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {pkg.status === "ACTIVE" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {pkg.status === "ACTIVE" ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Price</p>
              <p className="text-xl font-bold text-gray-900">{packageAmount(pkg).toLocaleString()} {packageCurrency(pkg)}</p>
              <p className="text-xs text-gray-400">{pkg.price_unit || pkg.priceUnit || "package"}</p>
            </div>
          </div>
          {pkg.description && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{pkg.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Included Services ({services.length})</p>
            <div className="space-y-2">
              {services.map((item) => (
                <div key={item.serviceId} className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    {item.service?.imageUrl
                      ? <img src={item.service.imageUrl} alt={item.service.title} className="w-full h-full object-cover" />
                      : <PackageIcon size={14} className="text-orange-300" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.service?.title || item.serviceId}</p>
                    <p className="text-xs text-gray-400">{item.service?.category?.name || "Service"}</p>
                  </div>
                </div>
              ))}
              {services.length === 0 && <p className="text-sm text-gray-400">No services linked.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={13} className="text-gray-300 ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp size={13} className="text-orange-500 ml-1 inline" />
    : <ChevronDown size={13} className="text-orange-500 ml-1 inline" />;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ApiPackage | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ApiPackage | null>(null);
  const [viewTarget, setViewTarget] = useState<ApiPackage | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      setPackages(await vendorApi.packages.list<ApiPackage[]>());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchPackages(); }, []);

  // Reset to page 1 when search or sort changes
  useEffect(() => { setCurrentPage(1); }, [search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...packages]
      .filter((pkg) =>
        !q ||
        pkg.title.toLowerCase().includes(q) ||
        pkg.id.toLowerCase().includes(q) ||
        (pkg.description || "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "title")    cmp = a.title.localeCompare(b.title);
        if (sortKey === "price")    cmp = packageAmount(a) - packageAmount(b);
        if (sortKey === "status")   cmp = a.status.localeCompare(b.status);
        if (sortKey === "services") cmp = packageServices(a).length - packageServices(b).length;
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [packages, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const th = (key: SortKey, label: string) => (
    <th
      onClick={() => toggleSort(key)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-orange-600 whitespace-nowrap"
    >
      {label}
      <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await vendorApi.packages.delete(deleteTarget.id);
      setPackages((cur) => cur.filter((pkg) => pkg.id !== deleteTarget.id));
      setSuccess(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      window.setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to delete package.");
      window.setTimeout(() => setError(null), 4000);
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await vendorApi.packages.updateStatus(toggleTarget.id, newStatus);
      setPackages((cur) =>
        cur.map((pkg) => (pkg.id === toggleTarget.id ? { ...pkg, status: newStatus } : pkg))
      );
      setSuccess(`"${toggleTarget.title}" ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`);
      setToggleTarget(null);
      window.setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to update package status.");
      window.setTimeout(() => setError(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
          <p className="text-sm text-gray-500 mt-0.5">{packages.length} service bundles</p>
        </div>
        <Link
          href="/vendor/packages/add"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus size={16} /> Create Package
        </Link>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-600">{packages.filter((p) => p.status === "ACTIVE").length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-500">{packages.filter((p) => p.status !== "ACTIVE").length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Inactive</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search packages by title, description, or ID..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Layers size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No packages found</p>
            <p className="text-sm mt-1">{search ? "Try clearing search." : "Create your first package."}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {th("title", "Package")}
                    {th("services", "Services")}
                    {th("price", "Price")}
                    {th("status", "Status")}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((pkg) => {
                    const services = packageServices(pkg);
                    return (
                      <tr key={pkg.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                              <PackageIcon size={16} className="text-orange-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-[280px]">{pkg.title || pkg.name}</p>
                              {pkg.description && (
                                <p className="text-xs text-gray-500 mt-1 max-w-[340px] truncate">{pkg.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {services.slice(0, 2).map((item) => (
                              <span key={item.serviceId} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {item.service?.title || item.serviceId.slice(0, 10)}
                              </span>
                            ))}
                            {services.length > 2 && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                                +{services.length - 2} more
                              </span>
                            )}
                            {services.length === 0 && <span className="text-xs text-gray-400">No services</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                            {packageAmount(pkg).toLocaleString()} {packageCurrency(pkg)}
                          </div>
                          <div className="text-xs text-gray-400">{pkg.price_unit || pkg.priceUnit || "package"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setToggleTarget(pkg)}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                              pkg.status === "ACTIVE"
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {pkg.status === "ACTIVE" ? <ToggleRight size={14} className="text-green-500" /> : <ToggleLeft size={14} />}
                            {pkg.status === "ACTIVE" ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setViewTarget(pkg)} title="View Details" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50">
                              <Eye size={15} />
                            </button>
                            <Link href={`/vendor/packages/edit/${pkg.id}`} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50">
                              <Edit3 size={15} />
                            </Link>
                            <button onClick={() => setDeleteTarget(pkg)} title="Delete" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <PackageDetailModal pkg={viewTarget} open={!!viewTarget} onClose={() => setViewTarget(null)} />
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Package?"
        message={`"${deleteTarget?.title}" will be permanently deleted.`}
        confirmLabel="Delete"
        confirmClass="bg-red-500 hover:bg-red-600"
        icon={<Trash2 size={24} className="text-red-500" />}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmModal
        open={!!toggleTarget}
        title={toggleTarget?.status === "ACTIVE" ? "Deactivate Package?" : "Activate Package?"}
        message={
          toggleTarget?.status === "ACTIVE"
            ? `"${toggleTarget?.title}" will be hidden from customers.`
            : `"${toggleTarget?.title}" will become visible to customers.`
        }
        confirmLabel={toggleTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        confirmClass={toggleTarget?.status === "ACTIVE" ? "bg-gray-600 hover:bg-gray-700" : "bg-green-500 hover:bg-green-600"}
        icon={
          toggleTarget?.status === "ACTIVE"
            ? <ToggleLeft size={24} className="text-gray-500" />
            : <ToggleRight size={24} className="text-green-500" />
        }
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}