import React from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  className?: string;
  compact?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '', compact = false }) => {
  const { i18n, t } = useTranslation('common');

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    // Save to electron-store via IPC
    if (window.electronAPI) {
      window.electronAPI.setLanguage?.(language);
    }
  };

  const currentLanguage = i18n.language;

  if (compact) {
    return (
      <div className={`language-selector compact ${className}`}>
        <button 
          className="language-toggle"
          onClick={() => changeLanguage(currentLanguage === 'ko' ? 'en' : 'ko')}
          title={t('language.selectLanguage')}
        >
          {currentLanguage === 'ko' ? '🇰🇷' : '🇺🇸'}
        </button>
      </div>
    );
  }

  return (
    <div className={`language-selector ${className}`}>
      <label className="language-label">{t('language.selectLanguage')}</label>
      <div className="language-options">
        <button
          className={`language-option ${currentLanguage === 'ko' ? 'active' : ''}`}
          onClick={() => changeLanguage('ko')}
        >
          🇰🇷 {t('language.korean')}
        </button>
        <button
          className={`language-option ${currentLanguage === 'en' ? 'active' : ''}`}
          onClick={() => changeLanguage('en')}
        >
          🇺🇸 {t('language.english')}
        </button>
      </div>
    </div>
  );
};

export default LanguageSelector;