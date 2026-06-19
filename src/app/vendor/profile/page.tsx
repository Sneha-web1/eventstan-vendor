'use client';

import { useEffect, useState } from 'react';
import {
  Save, MapPin, Phone, Mail, Shield, Loader2, Building2,
  User, CreditCard, CalendarClock, Landmark, BadgeCheck,
  Globe, FileText, Percent, Lock, ChevronDown
} from 'lucide-react';
import { vendorApi } from '@/api/vendorApi';

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
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isPlanExpired(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

/* ─── sub-components ───────────────────────────────────────── */
function SectionCard({ title, icon: Icon, children, defaultOpen = false }: {
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
          className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
  type = 'text',
  readOnly = false,
  placeholder = '',
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
      <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={`w-full py-2.5 text-sm border rounded-xl focus:outline-none transition
            ${Icon ? 'pl-9 pr-4' : 'px-4'}
            ${readOnly
              ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
              : 'border-gray-200 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white text-gray-800'
            }`}
        />
        {readOnly && <Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />}
      </div>
    </div>
  );
}

/* ─── main page ────────────────────────────────────────────── */
export default function ProfilePage() {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    vendorApi.profile.get<VendorProfile>()
      .then(setProfile)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof VendorProfile>(key: K, value: VendorProfile[K]) =>
    setProfile((cur) => cur ? { ...cur, [key]: value } : cur);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await vendorApi.profile.update<VendorProfile>({
        companyName: profile.companyName,
        contactPerson: profile.contactPerson,
        email: profile.email,
        phone: profile.phone,
        about: profile.about ?? '',
        businessLocation: profile.businessLocation ?? '',
        address: profile.address ?? '',
        specialization: profile.specialization ?? '',
        primaryMobile: profile.primaryMobile ?? '',
        cities: profile.cities,
        capacityPerDay: profile.capacityPerDay,
        telephone: profile.telephone ?? '',
      });
      setProfile(updated);
      setMessage('Profile saved successfully.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save profile');
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
        {error || 'Vendor profile not found.'}
      </div>
    );
  }

  const expired = isPlanExpired(profile.planExpiry);

  return (
    <div className="space-y-6 max-w-4xl pb-10">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage business information used by customers and EventStan.</p>
      </div>

      {/* ── Alerts ── */}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm flex items-center gap-2">
          <Shield size={15} /> {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* ── Avatar card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {profile.companyName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{profile.companyName}</p>
          <p className="text-xs text-gray-400 mt-0.5">@{profile.userName ?? '—'}</p>
          <span className={`inline-flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full
            ${profile.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <BadgeCheck size={11} />
            {profile.status.replaceAll('_', ' ')}
          </span>
        </div>
        {profile.planDetails && (
          <div className="ml-auto text-right shrink-0">
            <p className="text-xs font-semibold text-orange-600">{profile.planDetails}</p>
            <p className={`text-xs mt-0.5 ${expired ? 'text-red-500' : 'text-gray-400'}`}>
              {expired ? 'Expired' : 'Valid until'} {formatDate(profile.planExpiry)}
            </p>
          </div>
        )}
      </div>

      {/* ── 1. Personal Information ── */}
      <SectionCard title="Personal Information" icon={User} defaultOpen>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First Name" value={profile.firstName ?? ''} onChange={(v) => update('firstName', v)} icon={User} />
          <Field label="Last Name"  value={profile.lastName  ?? ''} onChange={(v) => update('lastName',  v)} icon={User} />
          <Field label="Username"   value={profile.userName  ?? ''} readOnly icon={User} />
          <Field label="Primary Email" value={profile.primaryEmail ?? ''} readOnly type="email" icon={Mail} />
          <Field label="Telephone"  value={profile.telephone ?? ''} onChange={(v) => update('telephone', v)} icon={Phone} />
          <Field label="Primary Mobile" value={profile.primaryMobile ?? ''} onChange={(v) => update('primaryMobile', v)} icon={Phone} />
        </div>
      </SectionCard>

      {/* ── 2. Business Information ── */}
      <SectionCard title="Business Information" icon={Building2}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Business Name"    value={profile.companyName}          onChange={(v) => update('companyName', v)}      icon={Building2} />
          <Field label="Contact Person"   value={profile.contactPerson}        onChange={(v) => update('contactPerson', v)} />
          <Field label="Email Address"    value={profile.email}                onChange={(v) => update('email', v)}            icon={Mail} type="email" />
          <Field label="Phone Number"     value={profile.phone}                onChange={(v) => update('phone', v)}            icon={Phone} />
          <Field label="Specialization"   value={profile.specialization ?? ''} onChange={(v) => update('specialization', v)} />
          <Field label="Business Location" value={profile.businessLocation ?? ''} onChange={(v) => update('businessLocation', v)} icon={MapPin} />
          <Field label="Address"          value={profile.address ?? ''}        onChange={(v) => update('address', v)}          icon={MapPin} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {/* Cities */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Service Cities</label>
            <div className="relative">
              <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={profile.cities.join(', ')}
                onChange={(e) => update('cities', e.target.value.split(',').map((c) => c.trim()).filter(Boolean))}
                placeholder="Dubai, Abu Dhabi, Sharjah"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Comma-separated list of cities</p>
          </div>

          {/* Capacity */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Daily Booking Capacity</label>
            <input
              type="number"
              min={1}
              value={profile.capacityPerDay}
              onChange={(e) => update('capacityPerDay', Math.max(1, Number(e.target.value)))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
            />
          </div>
        </div>

        {/* About */}
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Business Description</label>
          <textarea
            value={profile.about ?? ''}
            onChange={(e) => update('about', e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{profile.about?.length ?? 0} / 500</p>
        </div>
      </SectionCard>

      {/* ── 3. Legal & Compliance ── */}
      <SectionCard title="Legal & Compliance" icon={FileText}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Trade License Number" value={profile.tradeLicenseNumber ?? ''} readOnly icon={FileText} />
          <Field label="VAT Number"           value={profile.vatNumber ?? ''}          readOnly icon={FileText} />
          <Field label="Visa Type"            value={profile.visaType ?? ''}           readOnly icon={Shield} />
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <Lock size={10} /> These fields are managed by EventStan. Contact support to update them.
        </p>
      </SectionCard>

      {/* ── 4. Plan & Commission ── */}
      <SectionCard title="Plan & Commission" icon={CalendarClock}>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Field label="Active Plan" value={profile.planDetails ?? '—'} readOnly icon={BadgeCheck} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Commission</label>
            <div className="relative">
              <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                readOnly
                value={profile.commissionPercent ? `${profile.commissionPercent}%` : '—'}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <Lock size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Plan Expiry</label>
            <div className={`px-4 py-2.5 text-sm rounded-xl border ${expired ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
              {formatDate(profile.planExpiry)} {expired && '· Expired'}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <Lock size={10} /> Plan and commission details are set by EventStan.
        </p>
      </SectionCard>

      {/* ── 5. Bank Details ── */}
      <SectionCard title="Bank Details" icon={Landmark}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Bank Name"       value={profile.bankName ?? ''}        readOnly icon={Landmark} />
          <Field label="Account Name"    value={profile.accountFullName ?? ''} readOnly icon={User} />
          <Field label="Account Number"  value={profile.accountNumber ?? ''}   readOnly icon={CreditCard} />
          <Field label="IBAN"            value={profile.ibanNo ?? ''}          readOnly icon={CreditCard} />
          <Field label="SWIFT / BIC"     value={profile.swift ?? ''}           readOnly icon={Globe} />
          <Field label="Branch Address"  value={profile.branchAddress ?? ''}   readOnly icon={MapPin} />
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <Lock size={10} /> Bank details are managed by EventStan. Contact support to update them.
        </p>
      </SectionCard>

      {/* ── Save button ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-3.5 rounded-2xl font-semibold transition-colors"
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}