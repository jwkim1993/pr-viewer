import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface GitHubSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const GitHubSettingsModal: React.FC<GitHubSettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation('common');
  const [githubConfig, setGitHubConfig] = useState({
    baseUrl: 'https://github.com',
    apiUrl: 'https://api.github.com'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    try {
      const config = await window.electronAPI.getGitHubConfig();
      setGitHubConfig({
        baseUrl: config.baseUrl,
        apiUrl: config.apiUrl
      });
    } catch (error) {
      console.error('Error loading GitHub config:', error);
    }
  };

  const handleInputChange = (field: 'baseUrl' | 'apiUrl', value: string) => {
    setGitHubConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await window.electronAPI.setGitHubEndpoints(githubConfig.baseUrl, githubConfig.apiUrl);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving GitHub config:', error);
      alert('Failed to save GitHub settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setGitHubConfig({
      baseUrl: 'https://github.com',
      apiUrl: 'https://api.github.com'
    });
  };

  const presetGitHubCom = () => {
    setGitHubConfig({
      baseUrl: 'https://github.com',
      apiUrl: 'https://api.github.com'
    });
  };

  const presetEnterprise = () => {
    setGitHubConfig({
      baseUrl: 'https://github.enterprise.com',
      apiUrl: 'https://github.enterprise.com/api/v3'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content github-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🐙 {t('settings.github.title')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            {t('settings.github.description')}
          </p>
          
          <div className="preset-buttons">
            <button 
              className="preset-button github-com"
              onClick={presetGitHubCom}
            >
              🌐 GitHub.com
            </button>
            <button 
              className="preset-button enterprise"
              onClick={presetEnterprise}
            >
              🏢 GitHub Enterprise
            </button>
          </div>
          
          <div className="github-settings-form">
            <div className="setting-option">
              <label htmlFor="modal-github-base-url">
                {t('settings.github.baseUrl')}:
                <input
                  id="modal-github-base-url"
                  type="url"
                  value={githubConfig.baseUrl}
                  onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                  placeholder={t('settings.github.baseUrlPlaceholder')}
                />
              </label>
              <small>{t('settings.github.baseUrlDescription')}</small>
            </div>
            
            <div className="setting-option">
              <label htmlFor="modal-github-api-url">
                {t('settings.github.apiUrl')}:
                <input
                  id="modal-github-api-url"
                  type="url"
                  value={githubConfig.apiUrl}
                  onChange={(e) => handleInputChange('apiUrl', e.target.value)}
                  placeholder={t('settings.github.apiUrlPlaceholder')}
                />
              </label>
              <small>{t('settings.github.apiUrlDescription')}</small>
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
        
        <div className="modal-footer">
          <button 
            className="reset-button"
            onClick={resetToDefaults}
            disabled={loading}
          >
            🔄 {t('settings.github.resetToDefault')}
          </button>
          <div className="modal-actions">
            <button 
              className="cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              {t('buttons.cancel')}
            </button>
            <button 
              className="save-button"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? '💾 저장 중...' : `💾 ${t('settings.github.saveSettings')}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitHubSettingsModal;