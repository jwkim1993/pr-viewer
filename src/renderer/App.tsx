import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const { i18n, t } = useTranslation('common');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load saved language preference
        const savedLanguage = await window.electronAPI.getLanguage();
        if (savedLanguage && savedLanguage !== i18n.language) {
          await i18n.changeLanguage(savedLanguage);
        }

        // Check authentication
        const token = await window.electronAPI.getAccessToken();
        setAccessToken(token);
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    // Listen for language changes from main process (tray menu)
    const handleLanguageChange = (language: string) => {
      i18n.changeLanguage(language);
    };

    // Set up IPC listener for language changes (this would need to be added to preload)
    if (window.electronAPI.onLanguageChanged) {
      window.electronAPI.onLanguageChanged(handleLanguageChange);
    }

    initializeApp();
  }, [i18n]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const token = await window.electronAPI.githubOAuth();
      await window.electronAPI.setAccessToken(token);
      setAccessToken(token);
    } catch (error) {
      console.error('Login failed:', error);
      
      // Check if error is due to user cancellation
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
        // User cancelled - just return to login screen without showing error
        console.log('Login cancelled by user');
      } else {
        // Actual error - show error message
        alert(t('auth:errors.networkError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await window.electronAPI.setAccessToken('');
    setAccessToken(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (!accessToken) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
};

export default App;