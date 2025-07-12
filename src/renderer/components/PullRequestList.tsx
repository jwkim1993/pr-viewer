import React, { useState } from 'react';

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
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
  };

  if (watchedReposCount === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h2>관심 목록이 비어있습니다</h2>
        <p>Repositories 탭에서 관심 있는 저장소를 추가해주세요.</p>
      </div>
    );
  }

  if (loading && pullRequests.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Pull Request를 불러오는 중...</p>
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
            <option value="all">모든 저장소 ({pullRequests.length}개)</option>
            {repositories.map(repo => {
              const count = pullRequests.filter(pr => pr.repository.full_name === repo).length;
              return (
                <option key={repo} value={repo}>
                  {repo} ({count}개)
                </option>
              );
            })}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="updated">최근 업데이트순</option>
            <option value="created">생성일순</option>
            <option value="repository">저장소명순</option>
          </select>
        </div>
        
        {loading && (
          <div className="loading-indicator">
            <span className="spinner-small"></span>
            업데이트 중...
          </div>
        )}
      </div>

      {filteredAndSortedPRs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <h2>Pull Request가 없습니다</h2>
          <p>관심 목록의 저장소에 현재 열린 Pull Request가 없습니다.</p>
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
                      <span className="approval-text">{pr.approvedCount} 승인</span>
                    </div>
                  ) : (
                    <div className="approval-status pending">
                      <span className="approval-icon">⏳</span>
                      <span className="approval-text">승인 대기</span>
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
                    <span className="stat">💬 {pr.totalComments || (pr.comments + pr.review_comments)} 댓글</span>
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
                  <span className="created">생성: {formatTimeAgo(pr.created_at)}</span>
                  <span className="updated">업데이트: {formatTimeAgo(pr.updated_at)}</span>
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