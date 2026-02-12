import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import GitHubSettingsModal from './GitHubSettingsModal';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t } = useTranslation('common');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [githubEndpoint, setGitHubEndpoint] = useState('GitHub.com');

  useEffect(() => {
    loadGitHubEndpoint();
  }, []);

  const loadGitHubEndpoint = async () => {
    try {
      const config = await window.electronAPI.getGitHubConfig();
      if (config.baseUrl === 'https://github.com') {
        setGitHubEndpoint('GitHub.com');
      } else {
        const domain = config.baseUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
        setGitHubEndpoint(domain);
      }
    } catch (error) {
      console.error('Error loading GitHub endpoint:', error);
    }
  };

  const handleSettingsModalSave = () => {
    loadGitHubEndpoint(); // Reload endpoint info
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <h1>{t('app.title')}</h1>
          <p>{t('app.description')}</p>
        </div>
        
        <div className="login-content">
          <div className="github-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.300 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </div>
          
          <div className="github-endpoint-banner">
            <div className="endpoint-info">
              <span className="endpoint-label">{t('login.connectingTo')}</span>
              <span className="endpoint-value">{githubEndpoint}</span>
            </div>
          </div>
          
          <button className="login-button" onClick={onLogin}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.300 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            {t('buttons.login')}
          </button>
          
          <div className="login-description">
            <p>{t('app.loginDescription')}</p>
            <button 
              className="change-settings-link"
              onClick={() => setShowSettingsModal(true)}
            >
              {t('login.changeSettings')}
            </button>
          </div>
        </div>
      </div>
      
      <GitHubSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSettingsModalSave}
      />
    </div>
  );
};

export default LoginScreen;