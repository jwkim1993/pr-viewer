import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAccessToken: () => ipcRenderer.invoke('get-access-token'),
  setAccessToken: (token: string) => ipcRenderer.invoke('set-access-token', token),
  getWatchedRepos: () => ipcRenderer.invoke('get-watched-repos'),
  setWatchedRepos: (repos: any[]) => ipcRenderer.invoke('set-watched-repos', repos),
  githubOAuth: () => ipcRenderer.invoke('github-oauth'),
  fetchUserRepos: () => ipcRenderer.invoke('fetch-user-repos'),
  fetchPullRequests: (repos: any[]) => ipcRenderer.invoke('fetch-pull-requests', repos),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  toggleWidgetMode: () => ipcRenderer.invoke('toggle-widget-mode'),
  getWidgetMode: () => ipcRenderer.invoke('get-widget-mode'),
  onWidgetModeChanged: (callback: (isWidget: boolean) => void) => {
    ipcRenderer.on('widget-mode-changed', (_, isWidget) => callback(isWidget));
  },
  setLanguage: (language: string) => ipcRenderer.invoke('set-language', language),
  getLanguage: () => ipcRenderer.invoke('get-language'),
  onLanguageChanged: (callback: (language: string) => void) => {
    ipcRenderer.on('language-changed', (_, language) => callback(language));
  },
  setRefreshInterval: (interval: number) => ipcRenderer.invoke('set-refresh-interval', interval),
  getRefreshInterval: () => ipcRenderer.invoke('get-refresh-interval'),
});