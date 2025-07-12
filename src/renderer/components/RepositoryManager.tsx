import React, { useState, useEffect } from 'react';

interface RepositoryManagerProps {
  watchedRepos: any[];
  onReposUpdated: (repos: any[]) => void;
}

const RepositoryManager: React.FC<RepositoryManagerProps> = ({ 
  watchedRepos, 
  onReposUpdated 
}) => {
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUserRepos();
  }, []);

  const fetchUserRepos = async () => {
    try {
      setLoading(true);
      const repos = await window.electronAPI.fetchUserRepos();
      setUserRepos(repos || []);
    } catch (error) {
      console.error('Error fetching user repos:', error);
      setUserRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const isWatched = (repo: any) => {
    return watchedRepos.some(watchedRepo => watchedRepo.id === repo.id);
  };

  const filteredRepos = userRepos.filter(repo =>
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !isWatched(repo)
  );

  const toggleWatch = (repo: any) => {
    if (isWatched(repo)) {
      const updatedRepos = watchedRepos.filter(watchedRepo => watchedRepo.id !== repo.id);
      onReposUpdated(updatedRepos);
    } else {
      const updatedRepos = [...watchedRepos, repo];
      onReposUpdated(updatedRepos);
    }
  };

  const removeFromWatch = (repo: any) => {
    const updatedRepos = watchedRepos.filter(watchedRepo => watchedRepo.id !== repo.id);
    onReposUpdated(updatedRepos);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>저장소 목록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="repository-manager">
      <div className="watched-repos-section">
        <h2>관심 목록 ({watchedRepos.length}개)</h2>
        {watchedRepos.length === 0 ? (
          <div className="empty-state">
            <p>아직 관심 목록에 추가된 저장소가 없습니다.</p>
            <p>아래에서 저장소를 선택하여 관심 목록에 추가해보세요.</p>
          </div>
        ) : (
          <div className="repo-grid">
            {watchedRepos.map(repo => (
              <div key={repo.id} className="repo-card watched">
                <div className="repo-header">
                  <h3>{repo.full_name}</h3>
                  <button
                    className="remove-button"
                    onClick={() => removeFromWatch(repo)}
                    title="관심 목록에서 제거"
                  >
                    ✕
                  </button>
                </div>
                <p className="repo-description">{repo.description || '설명 없음'}</p>
                <div className="repo-meta">
                  <span className="language">{repo.language || 'Unknown'}</span>
                  <span className="updated">
                    {new Date(repo.updated_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="available-repos-section">
        <div className="section-header">
          <h2>사용 가능한 저장소 ({filteredRepos.length}개)</h2>
          <div className="search-container">
            <input
              type="text"
              placeholder="저장소 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="repo-grid">
          {filteredRepos.map(repo => (
            <div key={repo.id} className="repo-card">
              <div className="repo-header">
                <h3>{repo.full_name}</h3>
                <button
                  className="watch-button"
                  onClick={() => toggleWatch(repo)}
                >
                  관심 목록에 추가
                </button>
              </div>
              <p className="repo-description">{repo.description || '설명 없음'}</p>
              <div className="repo-meta">
                <span className="language">{repo.language || 'Unknown'}</span>
                <span className="stars">⭐ {repo.stargazers_count}</span>
                <span className="updated">
                  {new Date(repo.updated_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              {repo.private && (
                <span className="private-badge">Private</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RepositoryManager;