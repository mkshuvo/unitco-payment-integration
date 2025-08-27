"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, hasRole } from '../lib/auth';
import { CircularProgress, Box } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  adminOnly?: boolean;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/'];

// Admin-only routes
const ADMIN_ROUTES = ['/admin'];

export default function AuthGuard({ children, requiredRole, adminOnly }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if current route is public
        const isPublicRoute = PUBLIC_ROUTES.some(route => 
          pathname === route || pathname.startsWith(route)
        );

        if (isPublicRoute) {
          setIsAuthenticated(true);
          setHasRequiredRole(true);
          setIsLoading(false);
          return;
        }

        // Get current user
        const user = await getCurrentUser();
        
        if (!user) {
          // Not authenticated, redirect to login
          router.replace('/login');
          return;
        }

        setIsAuthenticated(true);

        // Check admin routes
        const isAdminRoute = ADMIN_ROUTES.some(route => 
          pathname.startsWith(route)
        );

        if (isAdminRoute || adminOnly) {
          const isAdmin = await hasRole('ADMIN');
          if (!isAdmin) {
            // Not admin, redirect to dashboard
            router.replace('/dashboard');
            return;
          }
        }

        // Check specific role requirement
        if (requiredRole) {
          const roleCheck = await hasRole(requiredRole);
          if (!roleCheck) {
            // Doesn't have required role, redirect to dashboard
            router.replace('/dashboard');
            return;
          }
        }

        setHasRequiredRole(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, redirect to login
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router, requiredRole, adminOnly]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show children only if authenticated and has required role
  if (isAuthenticated && hasRequiredRole) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}
