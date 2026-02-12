import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

const Settings: React.FC = () => {
  const { t } = useTranslation('common');
  const [selectedMenu, setSelectedMenu] = useState<'language' | 'general' | 'github' | 'ai'>('language');
  const [refreshInterval, setRefreshInterval] = useState<number>(5);
  const [githubConfig, setGitHubConfig] = useState({
    baseUrl: 'https://github.com',
    apiUrl: 'https://api.github.com'
  });
  const [showRestartMessage, setShowRestartMessage] = useState(false);
  
  // AI Settings state
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [claudeKeyInfo, setClaudeKeyInfo] = useState<{ hasKey: boolean; maskedKey: string }>({ hasKey: false, maskedKey: '' });
  const [aiStatusMessage, setAiStatusMessage] = useState('');

  useEffect(() => {
    // Load saved refresh interval and GitHub config
    const loadSettings = async () => {
      try {
        const interval = await window.electronAPI.getRefreshInterval();
        setRefreshInterval(interval || 5);
        
        const config = await window.electronAPI.getGitHubConfig();
        setGitHubConfig({
          baseUrl: config.baseUrl,
          apiUrl: config.apiUrl
        });

        // Load Claude API key info
        const keyInfo = await window.electronAPI.getClaudeApiKey();
        setClaudeKeyInfo(keyInfo);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
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

  const handleGitHubConfigChange = (field: 'baseUrl' | 'apiUrl', value: string) => {
    setGitHubConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveGitHubConfig = async () => {
    try {
      await window.electronAPI.setGitHubEndpoints(githubConfig.baseUrl, githubConfig.apiUrl);
      setShowRestartMessage(true);
      
      // Hide restart message after 5 seconds
      setTimeout(() => {
        setShowRestartMessage(false);
      }, 5000);
    } catch (error) {
      console.error('Error saving GitHub config:', error);
    }
  };

  const resetToDefaults = () => {
    setGitHubConfig({
      baseUrl: 'https://github.com',
      apiUrl: 'https://api.github.com'
    });
  };

  const handleSaveClaudeApiKey = async () => {
    if (!claudeApiKey.trim()) return;
    try {
      await window.electronAPI.setClaudeApiKey(claudeApiKey.trim());
      const keyInfo = await window.electronAPI.getClaudeApiKey();
      setClaudeKeyInfo(keyInfo);
      setClaudeApiKey('');
      setAiStatusMessage(t('settings.ai.apiKeySaved'));
      setTimeout(() => setAiStatusMessage(''), 3000);
    } catch (error) {
      console.error('Error saving Claude API key:', error);
    }
  };

  const handleRemoveClaudeApiKey = async () => {
    try {
      await window.electronAPI.removeClaudeApiKey();
      setClaudeKeyInfo({ hasKey: false, maskedKey: '' });
      setClaudeApiKey('');
      setAiStatusMessage(t('settings.ai.apiKeyRemoved'));
      setTimeout(() => setAiStatusMessage(''), 3000);
    } catch (error) {
      console.error('Error removing Claude API key:', error);
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
          <button
            className={`settings-menu-item ${selectedMenu === 'github' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('github')}
          >
            🐙 {t('settings.github.title')}
          </button>
          <button
            className={`settings-menu-item ${selectedMenu === 'ai' ? 'active' : ''}`}
            onClick={() => setSelectedMenu('ai')}
          >
            🤖 {t('settings.ai.title')}
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
        
        {selectedMenu === 'github' && (
          <div className="settings-section">
            <h3>🐙 {t('settings.github.title')}</h3>
            <p className="settings-description">
              {t('settings.github.description')}
            </p>
            
            {showRestartMessage && (
              <div className="restart-message">
                ⚠️ {t('settings.github.restartRequired')}
              </div>
            )}
            
            <div className="github-settings-form">
              <div className="setting-option">
                <label htmlFor="github-base-url">
                  {t('settings.github.baseUrl')}:
                  <input
                    id="github-base-url"
                    type="url"
                    value={githubConfig.baseUrl}
                    onChange={(e) => handleGitHubConfigChange('baseUrl', e.target.value)}
                    placeholder={t('settings.github.baseUrlPlaceholder')}
                  />
                </label>
                <small>{t('settings.github.baseUrlDescription')}</small>
              </div>
              
              <div className="setting-option">
                <label htmlFor="github-api-url">
                  {t('settings.github.apiUrl')}:
                  <input
                    id="github-api-url"
                    type="url"
                    value={githubConfig.apiUrl}
                    onChange={(e) => handleGitHubConfigChange('apiUrl', e.target.value)}
                    placeholder={t('settings.github.apiUrlPlaceholder')}
                  />
                </label>
                <small>{t('settings.github.apiUrlDescription')}</small>
              </div>
              
              <div className="github-settings-actions">
                <button 
                  className="save-button"
                  onClick={handleSaveGitHubConfig}
                >
                  💾 {t('settings.github.saveSettings')}
                </button>
                <button 
                  className="reset-button"
                  onClick={resetToDefaults}
                >
                  🔄 {t('settings.github.resetToDefault')}
                </button>
              </div>
            </div>
            
            <div className="github-settings-info">
              <h4>📋 {t('settings.github.examples')}:</h4>
              <div className="example-config">
                <strong>{t('settings.github.exampleDefault')}:</strong>
                <ul>
                  <li>Base URL: https://github.com</li>
                  <li>API URL: https://api.github.com</li>
                </ul>
              </div>
              <div className="example-config">
                <strong>{t('settings.github.exampleEnterprise')}:</strong>
                <ul>
                  <li>Base URL: https://your-domain.com</li>
                  <li>API URL: https://your-domain.com/api/v3</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {selectedMenu === 'ai' && (
          <div className="settings-section">
            <h3>🤖 {t('settings.ai.title')}</h3>
            <p className="settings-description">
              {t('settings.ai.description')}
            </p>

            <div className="ai-key-status">
              {claudeKeyInfo.hasKey ? (
                <div className="api-key-badge set">
                  ✅ {t('settings.ai.apiKeySet')} ({claudeKeyInfo.maskedKey})
                </div>
              ) : (
                <div className="api-key-badge not-set">
                  ⚠️ {t('settings.ai.apiKeyNotSet')}
                </div>
              )}
            </div>

            {aiStatusMessage && (
              <div className="ai-status-message">
                {aiStatusMessage}
              </div>
            )}

            <div className="ai-settings-form">
              <div className="setting-option">
                <label htmlFor="claude-api-key">
                  {t('settings.ai.claudeApiKey')}:
                  <input
                    id="claude-api-key"
                    type="password"
                    value={claudeApiKey}
                    onChange={(e) => setClaudeApiKey(e.target.value)}
                    placeholder={t('settings.ai.claudeApiKeyPlaceholder')}
                  />
                </label>
                <small>{t('settings.ai.claudeApiKeyDescription')}</small>
              </div>

              <div className="ai-settings-actions">
                <button
                  className="save-button"
                  onClick={handleSaveClaudeApiKey}
                  disabled={!claudeApiKey.trim()}
                >
                  💾 {t('settings.ai.saveApiKey')}
                </button>
                {claudeKeyInfo.hasKey && (
                  <button
                    className="reset-button"
                    onClick={handleRemoveClaudeApiKey}
                  >
                    🗑️ {t('settings.ai.removeApiKey')}
                  </button>
                )}
                <button
                  className="save-button secondary"
                  onClick={() => window.electronAPI.openExternal('https://console.anthropic.com/settings/keys')}
                >
                  🔑 {t('settings.ai.getApiKey')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;