import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Korean translations
import koCommon from '../locales/ko/common.json';
import koAuth from '../locales/ko/auth.json';
import koDashboard from '../locales/ko/dashboard.json';

// English translations
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enDashboard from '../locales/en/dashboard.json';

const resources = {
  ko: {
    common: koCommon,
    auth: koAuth,
    dashboard: koDashboard,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false,
    },

    // Default namespace
    defaultNS: 'common',
    
    // Namespace separator
    nsSeparator: ':',
    
    // Key separator for nested keys
    keySeparator: '.',
  });

export default i18n;