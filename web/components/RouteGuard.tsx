"use client";

import { usePathname } from 'next/navigation';
import AuthGuard from './AuthGuard';

interface RouteGuardProps {
  children: React.ReactNode;
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();

  // Determine authentication requirements based on route
  const getAuthConfig = () => {
    // Admin routes require ADMIN role
    if (pathname.startsWith('/admin')) {
      return { adminOnly: true };
    }

    // Banking routes require USER or higher
    if (pathname.startsWith('/banking')) {
      return { requiredRole: 'USER' };
    }

    // Payment routes require USER or higher
    if (pathname.startsWith('/payments')) {
      return { requiredRole: 'USER' };
    }

    // Dashboard requires authentication
    if (pathname.startsWith('/dashboard')) {
      return { requiredRole: 'USER' };
    }

    // Default: no specific requirements (handled by AuthGuard)
    return {};
  };

  const authConfig = getAuthConfig();

  return (
    <AuthGuard {...authConfig}>
      {children}
    </AuthGuard>
  );
}
