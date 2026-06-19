export interface VendorUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  vendorId?: string | null;
  vendorStatus?: string | null;
  companyName?: string | null;
  image?: string | null;
}

const TOKEN_KEY = 'vendor_token';
const USER_KEY = 'vendor_data';

export function saveSession(token: string, user: VendorUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ user }));
  localStorage.setItem('user_role', user.role);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('user_role');
}

export function getToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}

export function getUser(): VendorUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as
      | VendorUser
      | { user?: VendorUser }
      | null;
    if (!stored) return null;
    if ('user' in stored) return stored.user ?? null;
    return stored as VendorUser;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}
