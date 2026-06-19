'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, CalendarDays, Package,
  BookOpen, User, LogOut, ChevronRight, Menu, Loader2, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { vendorApi } from '@/api/vendorApi';
import { clearSession, getUser, type VendorUser } from '@/lib/auth';

const navItems = [
  { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/services',  label: 'Services',  icon: Briefcase },
  { href: '/vendor/packages',  label: 'Packages',  icon: Package },
  { href: '/vendor/bookings',  label: 'Bookings',  icon: BookOpen },
  { href: '/vendor/calendar',  label: 'Calendar',  icon: CalendarDays },
  { href: '/vendor/profile',   label: 'Profile',   icon: User },
];

async function logoutVendor() {
  if (typeof window === 'undefined') return;
  
  const token = localStorage.getItem('vendor_token');
  if (token) {
    try {
      await vendorApi.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [vendor] = useState<VendorUser | null>(() => getUser());

  useEffect(() => {
    const token = localStorage.getItem('vendor_token');
    if (!token && pathname !== '/vendor/login') {
      router.replace('/vendor/login');
    }
  }, [pathname, router]);

  const initials = vendor
    ? vendor.name?.split(' ').map((part) => part.charAt(0)).slice(0, 2).join('').toUpperCase() ||
      vendor.email.charAt(0).toUpperCase()
    : 'V';

  const fullName = vendor
    ? vendor.name || vendor.email.split('@')[0] || 'Vendor'
    : 'Vendor';

  async function confirmLogout() {
    setLoggingOut(true);
    try { 
      await logoutVendor(); 
    } catch { 
      // ignore 
    }
    clearSession();
    router.replace('/vendor/login');
  }

  // Don't show layout on login page
  if (pathname === '/vendor/login') return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Link href="https://event-stan.vercel.app" target="_blank" className="flex items-center gap-1">
            <span className="text-xl font-bold text-gray-900">Event</span>
            <span className="text-xl font-bold text-orange-500">Stan</span>
          </Link>
          <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Vendor</span>
        </div>

        {/* Vendor Info */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {vendor?.image ? (
              <img src={vendor.image} alt={fullName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                {initials || 'V'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
              <p className="text-xs text-gray-500 truncate">{vendor?.email ?? 'vendor@example.com'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${active ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                <Icon size={18} className={active ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-orange-400" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Main ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-30">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>

          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-900 capitalize">
              {navItems.find(n => n.href === pathname)?.label ?? 'Vendor Panel'}
            </h1>
          </div>

          {/* Avatar — click opens logout modal */}
          <button
            onClick={() => setShowLogout(true)}
            className="relative group focus:outline-none"
            title="Click to sign out"
          >
            {vendor?.image ? (
              <img src={vendor.image} alt={fullName} className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-orange-400 transition" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-transparent group-hover:ring-orange-300 transition">
                {initials || 'V'}
              </div>
            )}
            {/* small logout hint badge */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow">
              <LogOut size={8} className="text-gray-500" />
            </span>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* ── Logout Confirm Modal ── */}
      {showLogout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogout(false)} />

          {/* card */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col items-center gap-4">
            <button
              onClick={() => setShowLogout(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            {/* icon */}
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <LogOut size={26} className="text-red-500" />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">Sign out?</h2>
              <p className="text-sm text-gray-500 mt-1">
                You will be logged out of your vendor account.
              </p>
            </div>

            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={loggingOut}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                {loggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
