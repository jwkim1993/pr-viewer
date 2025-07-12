import React, { useState, useEffect } from 'react';
import RepositoryManager from './RepositoryManager';
import PullRequestList from './PullRequestList';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'prs' | 'repos'>('prs');
  const [watchedRepos, setWatchedRepos] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isWidgetMode, setIsWidgetMode] = useState(false);

  useEffect(() => {
    loadWatchedRepos();
    initializeWidgetMode();
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
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [watchedRepos]);

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
          <h1>GitHub PR Viewer</h1>
          {lastUpdated && (
            <span className="last-updated">
              마지막 업데이트: {lastUpdated.toLocaleTimeString()}
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
                Pull Requests ({pullRequests.length})
              </button>
              <button
                className={`tab-button ${activeTab === 'repos' ? 'active' : ''}`}
                onClick={() => setActiveTab('repos')}
              >
                Repositories ({watchedRepos.length})
              </button>
            </nav>
          )}
          
          <div className="header-actions">
            <button 
              className={`widget-button ${isWidgetMode ? 'active' : ''}`}
              onClick={toggleWidget}
              title={isWidgetMode ? '일반 모드로 전환' : '위젯 모드로 전환'}
            >
              {isWidgetMode ? '📱' : '🖥️'}
            </button>
            <button
              className="refresh-button"
              onClick={fetchPullRequests}
              disabled={loading || watchedRepos.length === 0}
            >
              {loading ? '새로고침 중...' : '새로고침'}
            </button>
            {!isWidgetMode && (
              <button className="logout-button" onClick={onLogout}>
                로그아웃
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
        ) : (
          <RepositoryManager 
            watchedRepos={watchedRepos}
            onReposUpdated={handleReposUpdated}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;