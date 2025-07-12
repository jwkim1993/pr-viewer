import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

interface ElectronAPI {
  getAccessToken: () => Promise<string>;
  setAccessToken: (token: string) => Promise<void>;
  getWatchedRepos: () => Promise<any[]>;
  setWatchedRepos: (repos: any[]) => Promise<void>;
  githubOAuth: () => Promise<string>;
  fetchUserRepos: () => Promise<any[]>;
  fetchPullRequests: (repos: any[]) => Promise<any[]>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

const App: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await window.electronAPI.getAccessToken();
        setAccessToken(token);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const token = await window.electronAPI.githubOAuth();
      await window.electronAPI.setAccessToken(token);
      setAccessToken(token);
    } catch (error) {
      console.error('Login failed:', error);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
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
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!accessToken) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Dashboard onLogout={handleLogout} />;
};

export default App;