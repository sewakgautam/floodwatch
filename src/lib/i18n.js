'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import ne from '@/locales/ne.json';

if (!i18next.isInitialized) {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('fw_lang') : null;

  i18next.use(initReactI18next).init({
    resources: { en: { translation: en }, ne: { translation: ne } },
    lng: stored || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18next;
