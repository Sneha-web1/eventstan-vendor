'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, isLoggedIn } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(pathname !== '/vendor/login');

  useEffect(() => {
    // Login page is always public
    if (pathname === '/vendor/login') {
      return;
    }

    if (!isLoggedIn() || getUser()?.role !== 'VENDOR') {
      router.replace('/vendor/login');
    } else {
      queueMicrotask(() => setChecking(false));
    }
  }, [pathname, router]);

  if (checking && pathname !== '/vendor/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return <>{children}</>;
}
