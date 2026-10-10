'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '../services/auth.service';
import { stopLoginAudio } from '../utils/loginAudio';
import { isAdminUser, clearCrmStoreCache } from '../utils/crmStore';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  // Auto close mobile drawer on navigation
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Tab-isolated session token takes precedence over global localStorage token
      let token = sessionStorage.getItem('crm_token') || localStorage.getItem('crm_token');
      if (token && !sessionStorage.getItem('crm_token')) {
        // Inherit global session into this tab's isolated storage
        sessionStorage.setItem('crm_token', token);
      }
      const lastActivityStr = localStorage.getItem('crm_last_activity');
      const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 Hour

      // Check 1-Hour Inactivity Logout:
      if (token && lastActivityStr) {
        const lastAct = parseInt(lastActivityStr, 10);
        if (!isNaN(lastAct) && (Date.now() - lastAct >= IDLE_TIMEOUT_MS)) {
          console.warn('[Auth Init] 1 Hour of inactivity detected on startup. Logging out...');
          sessionStorage.setItem('crm_idle_logout_notice', '1_hour_inactivity');
          await authService.logout('idle_timeout');
          if (isMounted) {
            setUser(null);
            setLoading(false);
            if (pathname !== '/login') router.push('/login');
          }
          return;
        }
      }

      if (!token) {
        if (isMounted) setLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      try {
        const res = await authService.getMe();
        if (isMounted) {
          if (res.success && res.data) {
            setUser(res.data);
            sessionStorage.setItem('crm_session_active', 'true');
            sessionStorage.setItem('crm_user', JSON.stringify(res.data));
            if (!localStorage.getItem('crm_last_activity')) {
              localStorage.setItem('crm_last_activity', Date.now().toString());
            }
          } else {
            authService.logout();
            if (pathname !== '/login') router.push('/login');
          }
        }
      } catch (err) {
        const isNetworkError = err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Failed to fetch');
        if (isNetworkError) {
          console.warn('[Auth Init Warning]: Backend server is unreachable (port 5000). Retrying/offline.', err.message);
          if (isMounted && pathname !== '/login') {
            router.push('/login');
          }
        } else {
          console.error('[Auth Init Error]:', err.message);
          if (isMounted) {
            authService.logout();
            if (pathname !== '/login') router.push('/login');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  const login = useCallback(async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.data) {
      clearCrmStoreCache();
      setUser(res.data.user);
      router.push('/dashboard');
    }
    return res;
  }, [router]);

  const logout = useCallback(async (logoutType = 'manual') => {
    stopLoginAudio();
    clearCrmStoreCache();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('crm_play_login_song');
      sessionStorage.removeItem('crm_login_audio_pending');
      sessionStorage.removeItem('crm_login_audio_start_time');
      if (logoutType === 'idle_timeout') {
        sessionStorage.setItem('crm_idle_logout_notice', '1_hour_inactivity');
      }
    }
    await authService.logout(logoutType);
    setUser(null);
    router.push('/login');
  }, [router]);

  // ==========================================
  // 1-HOUR INACTIVITY AUTO-LOGOUT IDLE TIMER
  // ==========================================
  useEffect(() => {
    if (!user) return;

    // 1 Hour in milliseconds (60 minutes * 60 seconds * 1000 ms)
    const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
    let lastThrottledTime = Date.now();

    // Reset/update inactivity timer on mouse cursor move or keyboard interaction
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 3000) {
        lastThrottledTime = now;
        localStorage.setItem('crm_last_activity', now.toString());
      }
    };

    const checkInactivity = () => {
      const lastActStr = localStorage.getItem('crm_last_activity');
      if (lastActStr) {
        const lastAct = parseInt(lastActStr, 10);
        if (!isNaN(lastAct) && (Date.now() - lastAct >= IDLE_TIMEOUT_MS)) {
          console.warn('[Auto Logout] 1 Hour of user inactivity detected. Triggering idle logout...');
          logout('idle_timeout');
        }
      }
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'contextmenu'];
    activityEvents.forEach((eventType) => {
      window.addEventListener(eventType, handleUserActivity, { passive: true });
    });

    // Check inactivity every 5 seconds
    const checkIdleInterval = setInterval(checkInactivity, 5000);

    // Also check immediately when tab gains focus or becomes visible
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Cross-tab synchronization
    const handleStorageChange = (e) => {
      if (e.key === 'crm_token' && !e.newValue && !sessionStorage.getItem('crm_token')) {
        setUser(null);
        if (pathname !== '/login') router.push('/login');
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      activityEvents.forEach((eventType) => {
        window.removeEventListener(eventType, handleUserActivity);
      });
      clearInterval(checkIdleInterval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, logout, pathname, router]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authService.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  }, []);

  /**
   * Dynamic Permission Checker Helper: `can('permission:key')`
   */
  const can = useCallback((permissionKey) => {
    if (!user) return false;
    if (isAdminUser(user)) return true;
    
    const permissions = user.effectivePermissions || [];
    return permissions.includes(permissionKey);
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    refreshUser,
    can,
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    toggleMobileSidebar,
    closeMobileSidebar
  }), [user, loading, login, logout, refreshUser, can, sidebarCollapsed, toggleSidebar, mobileSidebarOpen, toggleMobileSidebar, closeMobileSidebar]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
