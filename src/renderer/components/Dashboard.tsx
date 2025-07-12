import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import RepositoryManager from './RepositoryManager';
import PullRequestList from './PullRequestList';
import Settings from './Settings';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [activeTab, setActiveTab] = useState<'prs' | 'repos' | 'settings'>('prs');

  const [watchedRepos, setWatchedRepos] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isWidgetMode, setIsWidgetMode] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(5);

  useEffect(() => {
    loadWatchedRepos();
    initializeWidgetMode();
    loadRefreshInterval();
  }, []);

  const loadRefreshInterval = async () => {
    try {
      const interval = await window.electronAPI.getRefreshInterval();
      setRefreshInterval(interval || 5);
    } catch (error) {
      console.error('Error loading refresh interval:', error);
    }
  };

  // Listen for refresh interval changes
  useEffect(() => {
    const handleRefreshIntervalChange = () => {
      loadRefreshInterval();
    };

    // Add event listener for custom refresh interval change event
    window.addEventListener('refresh-interval-changed', handleRefreshIntervalChange);

    return () => {
      window.removeEventListener('refresh-interval-changed', handleRefreshIntervalChange);
    };
  }, []);

  const initializeWidgetMode = async () => {
    // 위젯 모드 상태 초기화
    const widgetMode = await (window.electronAPI as any).getWidgetMode();
    setIsWidgetMode(widgetMode);
    
    // 위젯 모드 변경 리스너 등록
    (window.electronAPI as any).onWidgetModeChanged((isWidget: boolean) => {
      setIsWidgetMode(isWidget);
    });
  };

  useEffect(() => {
    if (watchedRepos.length > 0) {
      fetchPullRequests();
    }
  }, [watchedRepos]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (watchedRepos.length > 0) {
        fetchPullRequests();
      }
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [watchedRepos, refreshInterval]);

  const loadWatchedRepos = async () => {
    try {
      const repos = await window.electronAPI.getWatchedRepos();
      setWatchedRepos(repos);
    } catch (error) {
      console.error('Error loading watched repos:', error);
    }
  };

  const fetchPullRequests = async () => {
    if (watchedRepos.length === 0) return;
    
    try {
      setLoading(true);
      const prs = await window.electronAPI.fetchPullRequests(watchedRepos);
      setPullRequests(prs);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching pull requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReposUpdated = async (repos: any[]) => {
    setWatchedRepos(repos);
    await window.electronAPI.setWatchedRepos(repos);
  };

  const toggleWidget = async () => {
    await (window.electronAPI as any).toggleWidgetMode();
  };

  return (
    <div className={`dashboard ${isWidgetMode ? 'widget-mode' : ''}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <h1>{t('common:app.title')}</h1>
          {lastUpdated && (
            <span className="last-updated">
              {t('dashboard:lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="header-right">
          {!isWidgetMode && (
            <nav className="tab-nav">
              <button
                className={`tab-button ${activeTab === 'prs' ? 'active' : ''}`}
                onClick={() => setActiveTab('prs')}
              >
{t('dashboard:pullRequests.title')} ({pullRequests.length})
              </button>
              <button
                className={`tab-button ${activeTab === 'repos' ? 'active' : ''}`}
                onClick={() => setActiveTab('repos')}
              >
{t('dashboard:repository.title')} ({watchedRepos.length})
              </button>
            </nav>
          )}
          
          <div className="header-actions">
            <button 
              className={`widget-button ${isWidgetMode ? 'active' : ''}`}
              onClick={toggleWidget}
              title={isWidgetMode ? t('dashboard:switchToNormalMode') : t('dashboard:switchToWidgetMode')}
            >
              {isWidgetMode ? '📱' : '🖥️'}
            </button>
            {!isWidgetMode && (
              <button 
                className={`widget-button ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
                title={t('common:buttons.settings')}
              >
                ⚙️
              </button>
            )}
            <button
              className="refresh-button"
              onClick={fetchPullRequests}
              disabled={loading || watchedRepos.length === 0}
            >
{loading ? t('dashboard:refreshing') : t('dashboard:pullRequests.refresh')}
            </button>
            {!isWidgetMode && (
              <button className="logout-button" onClick={onLogout}>
{t('common:buttons.logout')}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`dashboard-content ${isWidgetMode ? 'widget-mode' : ''}`}>
        {(activeTab === 'prs' || isWidgetMode) ? (
          <PullRequestList 
            pullRequests={pullRequests} 
            loading={loading}
            watchedReposCount={watchedRepos.length}
          />
        ) : activeTab === 'repos' ? (
          <RepositoryManager 
            watchedRepos={watchedRepos}
            onReposUpdated={handleReposUpdated}
          />
        ) : activeTab === 'settings' ? (
          <Settings />
        ) : null}
      </main>
    </div>
  );
};

export default Dashboard;