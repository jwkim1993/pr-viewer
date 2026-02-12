import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    name: string;
    owner: {
      login: string;
    };
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

interface SummaryState {
  summary: string;
  timestamp: number;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
}

interface PullRequestListProps {
  pullRequests: PullRequest[];
  loading: boolean;
  watchedReposCount: number;
}

// Simple markdown renderer that handles common markdown patterns
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const rendered = useMemo(() => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let key = 0;

    const renderInline = (text: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = [];
      // Process bold, inline code, and plain text
      const inlineRegex = /(\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`)/g;
      let lastIndex = 0;
      let match;
      let pKey = 0;

      while ((match = inlineRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index));
        }
        if (match[2] || match[3]) {
          parts.push(<strong key={`b${pKey++}`}>{match[2] || match[3]}</strong>);
        } else if (match[4]) {
          parts.push(<code key={`c${pKey++}`}>{match[4]}</code>);
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }
      return parts.length > 0 ? parts : [text];
    };

    while (i < lines.length) {
      const line = lines[i];

      // Code block
      if (line.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        elements.push(
          <pre key={key++}><code>{codeLines.join('\n')}</code></pre>
        );
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;
        elements.push(<Tag key={key++}>{renderInline(text)}</Tag>);
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        elements.push(<hr key={key++} />);
        i++;
        continue;
      }

      // Unordered list
      if (/^\s*[-*+]\s+/.test(line)) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^\s*[-*+]\s+/, '');
          items.push(<li key={`li${key++}`}>{renderInline(itemText)}</li>);
          i++;
        }
        elements.push(<ul key={key++}>{items}</ul>);
        continue;
      }

      // Ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^\s*\d+\.\s+/, '');
          items.push(<li key={`li${key++}`}>{renderInline(itemText)}</li>);
          i++;
        }
        elements.push(<ol key={key++}>{items}</ol>);
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        elements.push(
          <blockquote key={key++}>
            {quoteLines.map((ql, qi) => <p key={qi}>{renderInline(ql)}</p>)}
          </blockquote>
        );
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Regular paragraph
      elements.push(<p key={key++}>{renderInline(line)}</p>);
      i++;
    }

    return elements;
  }, [content]);

  return <>{rendered}</>;
};

const PullRequestList: React.FC<PullRequestListProps> = ({ 
  pullRequests, 
  loading,
  watchedReposCount 
}) => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'repository'>('updated');
  const [filterRepo, setFilterRepo] = useState<string>('all');
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [expandedPR, setExpandedPR] = useState<number | null>(null);
  const [summaryType, setSummaryType] = useState<'pr' | 'comments'>('pr');
  const [summaries, setSummaries] = useState<Record<string, SummaryState>>({});
  const [lgtmStates, setLgtmStates] = useState<Record<number, 'idle' | 'loading' | 'success' | 'error'>>({});

  // Check if Claude API key is configured
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const keyInfo = await window.electronAPI.getClaudeApiKey();
        setHasClaudeKey(keyInfo.hasKey);
      } catch {
        setHasClaudeKey(false);
      }
    };
    checkApiKey();
    // Re-check periodically in case user changes settings
    const interval = setInterval(checkApiKey, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSummaryKey = (prId: number, type: 'pr' | 'comments') => `${prId}-${type}`;

  const getOwnerRepo = (pr: PullRequest) => {
    // Try to get from repository object first, fall back to parsing full_name
    if (pr.repository.owner?.login && pr.repository.name) {
      return { owner: pr.repository.owner.login, repo: pr.repository.name };
    }
    const parts = pr.repository.full_name.split('/');
    return { owner: parts[0], repo: parts[1] };
  };

  const handleSummarize = useCallback(async (pr: PullRequest, type: 'pr' | 'comments', forceRefresh = false) => {
    const key = getSummaryKey(pr.id, type);
    const { owner, repo } = getOwnerRepo(pr);

    setSummaries(prev => ({
      ...prev,
      [key]: { summary: '', timestamp: 0, loading: true, error: null, fromCache: false }
    }));

    try {
      if (forceRefresh) {
        await window.electronAPI.clearPRSummaryCache(owner, repo, pr.number, type);
      }

      const result = type === 'pr'
        ? await window.electronAPI.summarizePR(owner, repo, pr.number)
        : await window.electronAPI.summarizePRComments(owner, repo, pr.number);

      setSummaries(prev => ({
        ...prev,
        [key]: {
          summary: result.summary,
          timestamp: result.timestamp,
          loading: false,
          error: null,
          fromCache: result.fromCache,
        }
      }));
    } catch (error: any) {
      setSummaries(prev => ({
        ...prev,
        [key]: {
          summary: '',
          timestamp: 0,
          loading: false,
          error: error.message || t('common:ai.error'),
          fromCache: false,
        }
      }));
    }
  }, [t]);

  const handleToggleSummary = useCallback((pr: PullRequest, type: 'pr' | 'comments') => {
    const key = getSummaryKey(pr.id, type);
    
    if (expandedPR === pr.id && summaryType === type) {
      // Close if clicking the same button
      setExpandedPR(null);
      return;
    }

    setExpandedPR(pr.id);
    setSummaryType(type);

    // If we don't have a summary yet, fetch it
    if (!summaries[key] || summaries[key].error) {
      handleSummarize(pr, type);
    }
  }, [expandedPR, summaryType, summaries, handleSummarize]);

  const handleLgtm = useCallback(async (pr: PullRequest) => {
    if (!confirm(t('common:ai.lgtmConfirm'))) return;

    const { owner, repo } = getOwnerRepo(pr);
    setLgtmStates(prev => ({ ...prev, [pr.id]: 'loading' }));

    try {
      await window.electronAPI.approvePRLgtm(owner, repo, pr.number);
      setLgtmStates(prev => ({ ...prev, [pr.id]: 'success' }));
      setTimeout(() => {
        setLgtmStates(prev => ({ ...prev, [pr.id]: 'idle' }));
      }, 3000);
    } catch (error) {
      console.error('LGTM error:', error);
      setLgtmStates(prev => ({ ...prev, [pr.id]: 'error' }));
      setTimeout(() => {
        setLgtmStates(prev => ({ ...prev, [pr.id]: 'idle' }));
      }, 3000);
    }
  }, [t]);

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
          {filteredAndSortedPRs.map(pr => {
            const prSummaryKey = getSummaryKey(pr.id, 'pr');
            const commentsSummaryKey = getSummaryKey(pr.id, 'comments');
            const isExpanded = expandedPR === pr.id;
            const currentSummary = isExpanded ? summaries[getSummaryKey(pr.id, summaryType)] : null;

            return (
            <div key={pr.id} className="pr-item-wrapper">
              <div className="pr-item" onClick={() => openPR(pr.html_url)}>
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
                      <span className="approval-text">{t('dashboard:pullRequest.approvalCount', { count: pr.approvedCount })}</span>
                    </div>
                  ) : (
                    <div className="approval-status pending">
                      <span className="approval-icon">⏳</span>
                      <span className="approval-text">{t('dashboard:pullRequest.pendingApproval')}</span>
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
                    <span className="stat">💬 {t('dashboard:pullRequest.commentsCount', { count: pr.totalComments || (pr.comments + pr.review_comments) })}</span>
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
                  <span className="created">{t('dashboard:pullRequest.created', { time: formatTimeAgo(pr.created_at) })}</span>
                  <span className="updated">{t('dashboard:pullRequest.updated', { time: formatTimeAgo(pr.updated_at) })}</span>
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

              {hasClaudeKey && (
                <div className="ai-actions">
                  <button
                    className={`ai-button ${isExpanded && summaryType === 'pr' ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSummary(pr, 'pr');
                    }}
                    disabled={summaries[prSummaryKey]?.loading}
                  >
                    🤖 {t('common:ai.summarizePR')}
                  </button>
                  <button
                    className={`ai-button ${isExpanded && summaryType === 'comments' ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSummary(pr, 'comments');
                    }}
                    disabled={summaries[commentsSummaryKey]?.loading}
                  >
                    💬 {t('common:ai.summarizeComments')}
                  </button>
                </div>
              )}

              {isExpanded && currentSummary && (
                <div className="ai-summary-panel">
                  {currentSummary.loading ? (
                    <div className="ai-summary-loading">
                      <span className="spinner-small"></span>
                      <span>{t('common:ai.loading')}</span>
                    </div>
                  ) : currentSummary.error ? (
                    <div className="ai-summary-error">
                      <p>{t('common:ai.error')}</p>
                      <small>{currentSummary.error}</small>
                    </div>
                  ) : (
                    <>
                      <div className="ai-summary-header">
                        <span className="ai-summary-meta">
                          {t('common:ai.generatedAt')}: {new Date(currentSummary.timestamp).toLocaleString()}
                          {currentSummary.fromCache && <span className="cache-badge">{t('common:ai.cached')}</span>}
                        </span>
                        <div className="ai-summary-actions">
                          {(() => {
                            const lgtmState = lgtmStates[pr.id] || 'idle';
                            return (
                              <button
                                className={`ai-action-button lgtm-button ${lgtmState}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLgtm(pr);
                                }}
                                disabled={lgtmState === 'loading' || lgtmState === 'success'}
                              >
                                {lgtmState === 'loading' ? t('common:ai.lgtmLoading') :
                                 lgtmState === 'success' ? `✅ ${t('common:ai.lgtmSuccess')}` :
                                 lgtmState === 'error' ? `❌ ${t('common:ai.lgtmError')}` :
                                 `👍 ${t('common:ai.lgtm')}`}
                              </button>
                            );
                          })()}
                          <button
                            className="ai-action-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSummarize(pr, summaryType, true);
                            }}
                          >
                            🔄 {t('common:ai.resummarize')}
                          </button>
                          <button
                            className="ai-action-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPR(null);
                            }}
                          >
                            ✕ {t('common:ai.closeSummary')}
                          </button>
                        </div>
                      </div>
                      <div className="ai-summary-content markdown-body">
                        <SimpleMarkdown content={currentSummary.summary} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PullRequestList;