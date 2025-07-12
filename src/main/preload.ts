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
});