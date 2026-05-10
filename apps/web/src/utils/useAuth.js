"use client";
import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { signIn, signOut, useSession } from "@auth/create/react";

function isDevIframe() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch { return true; }
}

function useAuth() {
  const navigate = useNavigate();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  
  // Loading states for different operations
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs to prevent memory leaks
  const isMountedRef = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check session status on mount and when session changes
  useEffect(() => {
    if (sessionStatus === "loading") {
      setIsCheckingSession(true);
    } else {
      setIsCheckingSession(false);
      
      // If we have a session but it might be expired, try to refresh
      if (session && sessionStatus === "authenticated") {
        // Optionally validate token expiration here
        // This would require access to the token expiry time
      }
    }
  }, [sessionStatus, session]);

  const devSocialShim = useCallback((provider, cb) => {
    if (!isMountedRef.current) return;
    
    const params = new URLSearchParams({ provider });
    if (cb) params.set('callbackUrl', cb);
    navigate('/__create/social-dev-shim?' + params.toString());
  }, [navigate]);

  const signInWithCredentials = useCallback(async (options) => {
    if (!isMountedRef.current) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn("credentials-signin", {
        ...options,
        callbackUrl: options.callbackUrl || null
      });
      
      if (!isMountedRef.current) return null;
      
      // Handle successful sign-in
      if (result?.error) {
        setError(result.error);
        return result;
      }
      
      // Clear any previous errors on success
      setError(null);
      return result;
    } catch (err) {
      if (!isMountedRef.current) return null;
      
      console.error("Credentials sign-in error:", err);
      setError("An error occurred during sign-in. Please try again.");
      return { error: "An error occurred during sign-in. Please try again." };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const signUpWithCredentials = useCallback(async (options) => {
    if (!isMountedRef.current) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn("credentials-signup", {
        ...options,
        callbackUrl: options.callbackUrl || null
      });
      
      if (!isMountedRef.current) return null;
      
      if (result?.error) {
        setError(result.error);
        return result;
      }
      
      setError(null);
      return result;
    } catch (err) {
      if (!isMountedRef.current) return null;
      
      console.error("Credentials sign-up error:", err);
      setError("An error occurred during sign-up. Please try again.");
      return { error: "An error occurred during sign-up. Please try again." };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const signInWithGoogle = useCallback(async (options) => {
    if (!isMountedRef.current) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cb = options?.callbackUrl || null;
      if (isDevIframe()) {
        devSocialShim("google", cb);
        return { url: `/__create/social-dev-shim?provider=google${cb ? `&callbackUrl=${encodeURIComponent(cb)}` : ""}` };
      }
      
      const result = await signIn("google", { ...options, callbackUrl: cb });
      
      if (!isMountedRef.current) return null;
      
      if (result?.error) {
        setError(result.error);
        return result;
      }
      
      setError(null);
      return result;
    } catch (err) {
      if (!isMountedRef.current) return null;
      
      console.error("Google sign-in error:", err);
      setError("Google sign-in failed. Please try again.");
      return { error: "Google sign-in failed. Please try again." };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [devSocialShim]);

  const signOutUser = useCallback(async (options = {}) => {
    if (!isMountedRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await signOut(options);
      
      if (!isMountedRef.current) return;
      
      // Clear any local storage items related to auth
      localStorage.removeItem("sogogate_email");
      sessionStorage.removeItem("sogogate_auth_state");
      
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      console.error("Sign-out error:", err);
      setError("An error occurred during sign-out.");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  return {
    // Session info
    session,
    sessionStatus,
    isLoading,
    isCheckingSession,
    error,
    
    // Actions
    signInWithCredentials,
    signUpWithCredentials,
    signInWithGoogle,
    signOut: signOutUser,
    
    // Helper functions
    clearError: useCallback(() => setError(null), []),
    isAuthenticated: () => sessionStatus === "authenticated" && !!session,
    isLoadingState: () => isLoading || isCheckingSession
  };
}

export default useAuth;
