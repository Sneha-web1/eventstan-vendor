// ─────────────────────────────────────────────────────────────
//  API Config — all requests go through Next.js proxy → /api/proxy/...
//  Next.js forwards them to Laravel (no CORS issues).
//
//  To switch env, set in .env:
//    NEXT_PUBLIC_ENV=live   → uses LARAVEL_LIVE in next.config.ts
//    (default)              → http://localhost:4000
// ─────────────────────────────────────────────────────────────

const BASE = '/api/proxy';

export const API = {
  // Auth
  login:  `${BASE}/api/vendor/login`,
  logout: `${BASE}/api/vendor/logout`,

  // Services
  services:       `${BASE}/api/vendor/services`,
  service:        (id: string | number) => `${BASE}/api/vendor/services/${id}`,
  serviceToggle:  (id: string | number) => `${BASE}/api/vendor/services/${id}/toggle`,
  serviceImages:  (id: string | number) => `${BASE}/api/vendor/services/${id}/images`,
  deleteImage:    (id: string | number, imgId: string | number) =>
                    `${BASE}/api/vendor/services/${id}/images/${imgId}`,

  // Packages
  packages:  `${BASE}/api/vendor/packages`,
  package:   (id: string | number) => `${BASE}/api/vendor/packages/${id}`,

  // Bookings
  bookings:       `${BASE}/api/vendor/bookings`,
  bookingAction:  (id: string | number) => `${BASE}/api/vendor/bookings/${id}/action`,

  // Profile / Dashboard
  profile:    `${BASE}/api/vendor/profile`,
  dashboard:  `${BASE}/api/vendor/dashboard`,
} as const;

/** Shared JSON headers (no body) */
export function jsonHeaders(token?: string | null): HeadersInit {
  return {
    'Content-Type':     'application/json',
    Accept:             'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Shared multipart headers — do NOT set Content-Type (browser sets boundary) */
export function multipartHeaders(token?: string | null): HeadersInit {
  return {
    Accept:             'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
