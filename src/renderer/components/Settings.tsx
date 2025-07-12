import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

const Settings: React.FC = () => {
  const { t } = useTranslation('common');
  const [selectedMenu, setSelectedMenu] = useState<'language' | 'general'>('language');
  const [refreshInterval, setRefreshInterval] = useState<number>(5);

  useEffect(() => {
    // Load saved refresh interval
    const loadRefreshInterval = async () => {
      try {
        const interval = await window.electronAPI.getRefreshInterval();
        setRefreshInterval(interval || 5);
      } catch (error) {
        console.error('Error loading refresh interval:', error);
      }
    };
    loadRefreshInterval();
  }, []);

  const handleRefreshIntervalChange = async (newInterval: number) => {
    try {
      setRefreshInterval(newInterval);
      await window.electronAPI.setRefreshInterval(newInterval);
      
      // Notify other components about the refresh interval change
      window.dispatchEvent(new CustomEvent('refresh-interval-changed'));
    } catch (error) {
      console.error('Error saving refresh interval:', error);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-sidebar">
        <h2 className="settings-title">{t('buttons.settings')}</h2>
        <nav className="settings-menu">
          <button
            className={`settings-menu-item ${selectedMenu === 'language' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('language')}
          >
            🌐 {t('settings.language.title')}
          </button>
          <button
            className={`settings-menu-item ${selectedMenu === 'general' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('general')}
          >
            ⚙️ {t('settings.general.title')}
          </button>
        </nav>
      </div>
      
      <div className="settings-content">
        {selectedMenu === 'language' && (
          <div className="settings-section">
            <h3>{t('settings.language.title')}</h3>
            <p className="settings-description">
              {t('settings.language.description')}
            </p>
            <LanguageSelector />
          </div>
        )}
        
        {selectedMenu === 'general' && (
          <div className="settings-section">
            <h3>{t('settings.general.title')}</h3>
            <p className="settings-description">
              {t('settings.general.description')}
            </p>
            <div className="setting-option">
              <label>
                <input type="checkbox" disabled />
                {t('settings.general.autoStart')}
              </label>
            </div>
            <div className="setting-option">
              <label>
                {t('settings.general.refreshInterval')}:
                <select 
                  id="refresh-interval"
                  value={refreshInterval}
                  onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                >
                  <option value="1">1</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="30">30</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;