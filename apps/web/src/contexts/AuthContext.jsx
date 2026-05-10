"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import getFirebase from '@/lib/firebase';

const transformUser = (firebaseUser) => {
  if (!firebaseUser) return null;
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName,
    email: firebaseUser.email,
    image: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
  };
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const { auth } = getFirebase();
    if (!auth) {
      setStatus('unauthenticated');
      return;
    }

    // Check currentUser immediately
    const currentUser = auth.currentUser;
    if (currentUser) {
      const transformed = transformUser(currentUser);
      setUser(transformed);
      setStatus('authenticated');
    }

    // Listen for auth changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const transformed = transformUser(firebaseUser);
      setUser(transformed);
      setStatus(transformed ? 'authenticated' : 'unauthenticated');
    });

    return () => unsubscribe();
  }, []);

  const refetch = useCallback(() => {
    // No explicit refetch needed; Firebase realtime
  }, []);

  const value = {
    user,
    data: user ? { user } : null,
    status,
    loading: status === 'loading',
    refetch,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return context;
};

export { useUser as default };
