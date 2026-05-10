"use client";
import { useCallback, useState } from 'react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import getFirebase from '@/lib/firebase';

function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const signOutUser = useCallback(async (options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { auth } = getFirebase();
      if (!auth) throw new Error("Firebase not initialized");
      
      await firebaseSignOut(auth);
      
      // Clear any local storage items related to auth
      localStorage.removeItem("sokogate_email");
      sessionStorage.removeItem("sokogate_auth_state");
      
      // Redirect if callbackUrl provided
      if (options?.callbackUrl) {
        window.location.href = options.callbackUrl;
      }
    } catch (err) {
      console.error("Sign-out error:", err);
      setError("An error occurred during sign-out.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    signOut: signOutUser,
    clearError: useCallback(() => setError(null), []),
  };
}

export default useAuth;
