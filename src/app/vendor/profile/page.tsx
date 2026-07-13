"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  MapPin,
  Phone,
  Mail,
  Shield,
  Loader2,
  Building2,
  User,
  CreditCard,
  CalendarClock,
  Landmark,
  BadgeCheck,
  Globe,
  FileText,
  Percent,
  Lock,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { updateSessionUser } from "@/lib/auth";

interface VendorProfile {
  id: string;
  // Business
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  about?: string | null;
  businessLocation?: string | null;
  address?: string | null;
  specialization?: string | null;
  primaryMobile?: string | null;
  cities: string[];
  capacityPerDay: number;
  status: string;
  // Personal
  firstName?: string | null;
  lastName?: string | null;
  userName?: string | null;
  primaryEmail?: string | null;
  telephone?: string | null;
  // Legal / Business
  tradeLicenseNumber?: string | null;
  vatNumber?: string | null;
  visaType?: string | null;
  // Plan
  planDetails?: string | null;
  planExpiry?: string | null;
  commissionPercent?: string | null;
  agreementFileUrl?: string | null;
  agreementFileKey?: string | null;
  // Bank
  bankName?: string | null;
  accountFullName?: string | null;
  ibanNo?: string | null;
  accountNumber?: string | null;
  swift?: string | null;
  branchAddress?: string | null;
}

/* ─── helpers ──────────────────────────────────────────────── */
function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isPlanExpired(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

function hasValue(value: string | number | string[] | null | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return value > 0;
  return Boolean(value && String(value).trim());
}

/* ─── sub-components ───────────────────────────────────────── */
function SectionCard({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <Icon size={14} className="text-orange-500" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-6 pb-6 pt-1">{children}</div>}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  readOnly = false,
  placeholder = "",
}: {
  label: string;
  icon?: React.ElementType;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-1 block">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={`w-full py-2.5 text-sm border rounded-xl focus:outline-none transition
            ${Icon ? "pl-9 pr-4" : "px-4"}
            ${
              readOnly
                ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
                : "border-gray-200 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white text-gray-800"
            }`}
        />
        {readOnly && (
          <Lock
            size={11}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300"
          />
        )}
      </div>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    vendorApi.profile
      .get<VendorProfile>()
      .then(setProfile)
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load profile",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof VendorProfile>(
    key: K,
    value: VendorProfile[K],
  ) => setProfile((cur) => (cur ? { ...cur, [key]: value } : cur));

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await vendorApi.profile.update<VendorProfile>({
        companyName: profile.companyName,
        contactPerson: profile.contactPerson,
        email: profile.email,
        phone: profile.phone,
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        userName: profile.userName ?? "",
        primaryEmail: profile.primaryEmail ?? "",
        telephone: profile.telephone ?? "",
        primaryMobile: profile.primaryMobile ?? "",
        about: profile.about ?? "",
        businessLocation: profile.businessLocation ?? "",
        address: profile.address ?? "",
        specialization: profile.specialization ?? "",
        cities: profile.cities,
        capacityPerDay: profile.capacityPerDay,
        tradeLicenseNumber: profile.tradeLicenseNumber ?? "",
        vatNumber: profile.vatNumber ?? "",
        visaType: profile.visaType ?? "",
        planDetails: profile.planDetails ?? "",
        planExpiry: profile.planExpiry ?? "",
        commissionPercent: profile.commissionPercent
          ? Number(profile.commissionPercent)
          : 0,
        agreementFileUrl: profile.agreementFileUrl ?? "",
        agreementFileKey: profile.agreementFileKey ?? "",
        bankName: profile.bankName ?? "",
        accountFullName: profile.accountFullName ?? "",
        ibanNo: profile.ibanNo ?? "",
        accountNumber: profile.accountNumber ?? "",
        swift: profile.swift ?? "",
        branchAddress: profile.branchAddress ?? "",
      });
      setProfile(updated);
      updateSessionUser({
        companyName: updated.companyName,
        email: updated.email,
        phone: updated.phone,
        updatedProfile: true,
      });
      setMessage("Profile saved successfully.");
      router.replace("/vendor/dashboard");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save profile",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── loading / error states ── */
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={28} />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error || "Vendor profile not found."}
      </div>
    );
  }

  const expired = isPlanExpired(profile.planExpiry);
  const completionChecks = [
    { label: "Business name", done: hasValue(profile.companyName) },
    { label: "Contact person", done: hasValue(profile.contactPerson) },
    { label: "Login email", done: hasValue(profile.email) },
    { label: "Phone number", done: hasValue(profile.phone) },
    { label: "Description", done: hasValue(profile.about) },
    { label: "Business location", done: hasValue(profile.businessLocation) },
    { label: "Address", done: hasValue(profile.address) },
    { label: "Specialization", done: hasValue(profile.specialization) },
    { label: "Service cities", done: hasValue(profile.cities) },
    { label: "Trade license", done: hasValue(profile.tradeLicenseNumber) },
    { label: "VAT number", done: hasValue(profile.vatNumber) },
    { label: "Primary mobile", done: hasValue(profile.primaryMobile) },
    { label: "Bank name", done: hasValue(profile.bankName) },
    { label: "Account name", done: hasValue(profile.accountFullName) },
    { label: "IBAN", done: hasValue(profile.ibanNo) },
  ];
  const completedFields = completionChecks.filter((item) => item.done).length;
  const totalFields = completionChecks.length;
  const completionPercent = Math.round((completedFields / totalFields) * 100);
  const missingFields = completionChecks
    .filter((item) => !item.done)
    .map((item) => item.label);

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage business information used by customers and EventStan.
        </p>
      </div>

      {/* ── Alerts ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Profile completion
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {completedFields} of {totalFields} key profile fields completed
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-500">
              {completionPercent}%
            </p>
            <p className="text-xs text-gray-400">
              {completionPercent === 100
                ? "Profile complete"
                : "Complete more fields to strengthen your profile"}
            </p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        {missingFields.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              Still missing
            </p>
            <div className="flex flex-wrap gap-2">
              {missingFields.map((field) => (
                <span
                  key={field}
                  className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}
        {completionPercent === 100 && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 size={16} />
            Your profile is fully completed.
          </div>
        )}
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm flex items-center gap-2">
          <Shield size={15} /> {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Avatar card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {profile.companyName
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {profile.companyName}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            @{profile.userName ?? "—"}
          </p>
          <span
            className={`inline-flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full
            ${profile.status === "APPROVED" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
          >
            <BadgeCheck size={11} />
            {profile.status.replaceAll("_", " ")}
          </span>
        </div>
        {profile.planDetails && (
          <div className="ml-auto text-right shrink-0">
            <p className="text-xs font-semibold text-orange-600">
              {profile.planDetails}
            </p>
            <p
              className={`text-xs mt-0.5 ${expired ? "text-red-500" : "text-gray-400"}`}
            >
              {expired ? "Expired" : "Valid until"}{" "}
              {formatDate(profile.planExpiry)}
            </p>
          </div>
        )}
      </div>

      {/* ── 1. Personal Information ── */}
      <SectionCard title="Personal Information" icon={User} defaultOpen>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="First Name"
            value={profile.firstName ?? ""}
            onChange={(v) => update("firstName", v)}
            icon={User}
          />
          <Field
            label="Last Name"
            value={profile.lastName ?? ""}
            onChange={(v) => update("lastName", v)}
            icon={User}
          />
          <Field
            label="Username"
            value={profile.userName ?? ""}
            onChange={(v) => update("userName", v)}
            icon={User}
          />
          <Field
            label="Primary Email"
            value={profile.primaryEmail ?? ""}
            onChange={(v) => update("primaryEmail", v)}
            type="email"
            icon={Mail}
          />
          <Field
            label="Telephone"
            value={profile.telephone ?? ""}
            onChange={(v) => update("telephone", v)}
            icon={Phone}
          />
          <Field
            label="Primary Mobile"
            value={profile.primaryMobile ?? ""}
            onChange={(v) => update("primaryMobile", v)}
            icon={Phone}
          />
        </div>
      </SectionCard>

      {/* ── 2. Business Information ── */}
      <SectionCard title="Business Information" icon={Building2}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Business Name"
            value={profile.companyName}
            onChange={(v) => update("companyName", v)}
            icon={Building2}
          />
          <Field
            label="Contact Person"
            value={profile.contactPerson}
            onChange={(v) => update("contactPerson", v)}
          />
          <Field
            label="Email Address"
            value={profile.email}
            onChange={(v) => update("email", v)}
            icon={Mail}
            type="email"
          />
          <Field
            label="Phone Number"
            value={profile.phone}
            onChange={(v) => update("phone", v)}
            icon={Phone}
          />
          <Field
            label="Specialization"
            value={profile.specialization ?? ""}
            onChange={(v) => update("specialization", v)}
          />
          <Field
            label="Business Location"
            value={profile.businessLocation ?? ""}
            onChange={(v) => update("businessLocation", v)}
            icon={MapPin}
          />
          <Field
            label="Address"
            value={profile.address ?? ""}
            onChange={(v) => update("address", v)}
            icon={MapPin}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {/* Cities */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Service Cities
            </label>
            <div className="relative">
              <Globe
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={profile.cities.join(", ")}
                onChange={(e) =>
                  update(
                    "cities",
                    e.target.value
                      .split(",")
                      .map((c) => c.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="Dubai, Abu Dhabi, Sharjah"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Comma-separated list of cities
            </p>
          </div>

          {/* Capacity */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Daily Booking Capacity
            </label>
            <input
              type="number"
              min={1}
              value={profile.capacityPerDay}
              onChange={(e) =>
                update("capacityPerDay", Math.max(1, Number(e.target.value)))
              }
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            />
          </div>
        </div>

        {/* About */}
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Business Description
          </label>
          <textarea
            value={profile.about ?? ""}
            onChange={(e) => update("about", e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            {profile.about?.length ?? 0} / 500
          </p>
        </div>
      </SectionCard>

      {/* ── 3. Legal & Compliance ── */}
      <SectionCard title="Legal & Compliance" icon={FileText}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Trade License Number"
            value={profile.tradeLicenseNumber ?? ""}
            onChange={(v) => update("tradeLicenseNumber", v)}
            icon={FileText}
          />
          <Field
            label="VAT Number"
            value={profile.vatNumber ?? ""}
            onChange={(v) => update("vatNumber", v)}
            icon={FileText}
          />
          <Field
            label="Visa Type"
            value={profile.visaType ?? ""}
            onChange={(v) => update("visaType", v)}
            icon={Shield}
          />
        </div>
      </SectionCard>

      {/* ── 4. Plan & Commission ── */}
      <SectionCard title="Plan & Commission" icon={CalendarClock}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Active Plan"
            value={profile.planDetails ?? ""}
            onChange={(v) => update("planDetails", v)}
            icon={BadgeCheck}
          />
          <Field
            label="Commission %"
            value={profile.commissionPercent ?? ""}
            onChange={(v) => update("commissionPercent", v)}
            type="number"
            icon={Percent}
          />
          <Field
            label="Plan Expiry"
            value={profile.planExpiry?.slice(0, 10) ?? ""}
            onChange={(v) => update("planExpiry", v)}
            type="date"
            icon={CalendarClock}
          />
          <Field
            label="Agreement File URL"
            value={profile.agreementFileUrl ?? ""}
            onChange={(v) => update("agreementFileUrl", v)}
            icon={FileText}
          />
          <Field
            label="Agreement File Key"
            value={profile.agreementFileKey ?? ""}
            onChange={(v) => update("agreementFileKey", v)}
            icon={FileText}
          />
        </div>
      </SectionCard>

      {/* ── 5. Bank Details ── */}
      <SectionCard title="Bank Details" icon={Landmark}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Bank Name"
            value={profile.bankName ?? ""}
            onChange={(v) => update("bankName", v)}
            icon={Landmark}
          />
          <Field
            label="Account Name"
            value={profile.accountFullName ?? ""}
            onChange={(v) => update("accountFullName", v)}
            icon={User}
          />
          <Field
            label="Account Number"
            value={profile.accountNumber ?? ""}
            onChange={(v) => update("accountNumber", v)}
            icon={CreditCard}
          />
          <Field
            label="IBAN"
            value={profile.ibanNo ?? ""}
            onChange={(v) => update("ibanNo", v)}
            icon={CreditCard}
          />
          <Field
            label="SWIFT / BIC"
            value={profile.swift ?? ""}
            onChange={(v) => update("swift", v)}
            icon={Globe}
          />
          <Field
            label="Branch Address"
            value={profile.branchAddress ?? ""}
            onChange={(v) => update("branchAddress", v)}
            icon={MapPin}
          />
        </div>
      </SectionCard>

      {/* ── Save button ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold transition-colors"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Save size={18} />
        )}
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
