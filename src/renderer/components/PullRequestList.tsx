import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PullRequest {
  id: number;
  number: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  state: string;
  repository: {
    full_name: string;
  };
  approvedCount: number;
  isApproved: boolean;
  comments: number;
  review_comments: number;
  totalComments?: number;
  commits: number;
  additions: number;
  deletions: number;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

interface PullRequestListProps {
  pullRequests: PullRequest[];
  loading: boolean;
  watchedReposCount: number;
}

const PullRequestList: React.FC<PullRequestListProps> = ({ 
  pullRequests, 
  loading,
  watchedReposCount 
}) => {
  const { t, i18n } = useTranslation('dashboard');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'repository'>('updated');
  const [filterRepo, setFilterRepo] = useState<string>('all');

  const repositories = Array.from(
    new Set(pullRequests.map(pr => pr.repository.full_name))
  ).sort();

  const filteredAndSortedPRs = pullRequests
    .filter(pr => filterRepo === 'all' || pr.repository.full_name === filterRepo)
    .sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'repository':
          return a.repository.full_name.localeCompare(b.repository.full_name);
        default:
          return 0;
      }
    });

  const openPR = (url: string) => {
    window.electronAPI.openExternal(url);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('time.justNow');
    if (diffInHours < 24) return t('time.hoursAgo', { count: diffInHours });
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('time.daysAgo', { count: diffInDays });
    
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US';
    return date.toLocaleDateString(locale);
  };

  if (watchedReposCount === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h2>{t('emptyState.noWatchedRepos')}</h2>
        <p>{t('emptyState.addReposDescription')}</p>
      </div>
    );
  }

  if (loading && pullRequests.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>{t('loading.pullRequests')}</p>
      </div>
    );
  }

  return (
    <div className="pull-request-list">
      <div className="list-controls">
        <div className="filters">
          <select
            value={filterRepo}
            onChange={(e) => setFilterRepo(e.target.value)}
            className="filter-select"
          >
            <option value="all">{t('filters.allRepositories', { count: pullRequests.length })}</option>
            {repositories.map(repo => {
              const count = pullRequests.filter(pr => pr.repository.full_name === repo).length;
              return (
                <option key={repo} value={repo}>
                  {repo} {t('filters.itemCount', { count })}
                </option>
              );
            })}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="updated">{t('sort.recentUpdates')}</option>
            <option value="created">{t('sort.creationDate')}</option>
            <option value="repository">{t('sort.repositoryName')}</option>
          </select>
        </div>
        
        {loading && (
          <div className="loading-indicator">
            <span className="spinner-small"></span>
{t('loading.updating')}
          </div>
        )}
      </div>

      {filteredAndSortedPRs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h2>{t('emptyState.noPullRequests')}</h2>
          <p>{t('emptyState.noPullRequestsDescription')}</p>
        </div>
      ) : (
        <div className="pr-items">
          {filteredAndSortedPRs.map(pr => (
            <div key={pr.id} className="pr-item" onClick={() => openPR(pr.html_url)}>
              <div className="pr-header">
                <div className="pr-title-section">
                  <h3 className="pr-title">{pr.title}</h3>
                  <div className="pr-meta">
                    <span className="pr-number">#{pr.number}</span>
                    <span className="pr-repository">{pr.repository.full_name}</span>
                  </div>
                </div>
                
                <div className="pr-status">
                  {pr.isApproved ? (
                    <div className="approval-status approved">
                      <span className="approval-icon">✅</span>
                      <span className="approval-text">{t('pullRequest.approvalCount', { count: pr.approvedCount })}</span>
                    </div>
                  ) : (
                    <div className="approval-status pending">
                      <span className="approval-icon">⏳</span>
                      <span className="approval-text">{t('pullRequest.pendingApproval')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pr-details">
                <div className="pr-author">
                  <img 
                    src={pr.user.avatar_url} 
                    alt={pr.user.login}
                    className="author-avatar"
                  />
                  <span className="author-name">{pr.user.login}</span>
                </div>
                
                <div className="pr-stats">
                  {(pr.totalComments || (pr.comments + pr.review_comments)) > 0 && (
                    <span className="stat">💬 {t('pullRequest.commentsCount', { count: pr.totalComments || (pr.comments + pr.review_comments) })}</span>
                  )}
                  {typeof pr.commits === 'number' && (
                    <span className="stat">📦 {pr.commits} commits</span>
                  )}
                  {typeof pr.additions === 'number' && typeof pr.deletions === 'number' && (
                    <span className="stat">
                      <span className="additions">+{pr.additions}</span>
                      <span className="deletions">-{pr.deletions}</span>
                    </span>
                  )}
                </div>
                
                <div className="pr-timing">
                  <span className="created">{t('pullRequest.created', { time: formatTimeAgo(pr.created_at) })}</span>
                  <span className="updated">{t('pullRequest.updated', { time: formatTimeAgo(pr.updated_at) })}</span>
                </div>
              </div>

              {pr.labels && pr.labels.length > 0 && (
                <div className="pr-labels">
                  {pr.labels.map(label => (
                    <span
                      key={label.name}
                      className="pr-label"
                      style={{ backgroundColor: `#${label.color}` }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PullRequestList;