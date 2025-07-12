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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}