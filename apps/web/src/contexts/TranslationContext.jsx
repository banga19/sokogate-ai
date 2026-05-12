"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import en from '@/locales/en.js';
import sw from '@/locales/sw.js';

const translations = { en, sw };

const TranslationContext = createContext(null);

export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sokogate_language');
      if (stored) return stored;
      const browserLang = navigator.language?.split('-')[0];
      return browserLang === 'sw' ? 'sw' : 'en';
    }
    return 'en';
  });

  const t = useCallback((key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    if (!value) return key;

    if (typeof value === 'function') {
      // Spread params as positional arguments for compatibility
      return value(...Object.values(params));
    }
    return value;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('sokogate_language', language);
  }, [language]);

  const changeLanguage = useCallback((lang) => {
    if (lang === 'en' || lang === 'sw') {
      setLanguage(lang);
    }
  }, []);

  return (
    <TranslationContext.Provider value={{ language, t, changeLanguage, isSwahili: language === 'sw' }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
