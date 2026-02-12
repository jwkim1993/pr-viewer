export interface AISummaryResult {
  summary: string;
  timestamp: number;
  fromCache: boolean;
}

export interface ClaudeApiKeyInfo {
  hasKey: boolean;
  maskedKey: string;
}

export interface ElectronAPI {
  getAccessToken: () => Promise<string>;
  setAccessToken: (token: string) => Promise<void>;
  getWatchedRepos: () => Promise<any[]>;
  setWatchedRepos: (repos: any[]) => Promise<void>;
  githubOAuth: () => Promise<string>;
  fetchUserRepos: () => Promise<any[]>;
  fetchPullRequests: (repos: any[]) => Promise<any[]>;
  openExternal: (url: string) => Promise<void>;
  toggleWidgetMode: () => Promise<void>;
  getWidgetMode: () => Promise<boolean>;
  onWidgetModeChanged: (callback: (isWidget: boolean) => void) => void;
  setLanguage: (language: string) => Promise<void>;
  getLanguage: () => Promise<string>;
  onLanguageChanged?: (callback: (language: string) => void) => void;
  setRefreshInterval: (interval: number) => Promise<void>;
  getRefreshInterval: () => Promise<number>;
  getGitHubConfig: () => Promise<{
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    apiUrl: string;
  }>;
  setGitHubEndpoints: (baseUrl: string, apiUrl: string) => Promise<void>;
  // Claude AI
  setClaudeApiKey: (key: string) => Promise<void>;
  getClaudeApiKey: () => Promise<ClaudeApiKeyInfo>;
  removeClaudeApiKey: () => Promise<void>;
  summarizePR: (owner: string, repo: string, prNumber: number) => Promise<AISummaryResult>;
  summarizePRComments: (owner: string, repo: string, prNumber: number) => Promise<AISummaryResult>;
  getPRSummaryCache: (owner: string, repo: string, prNumber: number, type: 'pr' | 'comments') => Promise<AISummaryResult | null>;
  clearPRSummaryCache: (owner: string, repo: string, prNumber: number, type: 'pr' | 'comments') => Promise<void>;
  // GitHub Actions
  approvePRLgtm: (owner: string, repo: string, prNumber: number) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}