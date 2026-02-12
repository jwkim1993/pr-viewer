import { app, BrowserWindow, ipcMain, shell, protocol, Tray, Menu, nativeImage, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { Octokit } from '@octokit/rest';
import Anthropic from '@anthropic-ai/sdk';

const store = new Store();

// Load configuration
let config: any = {};
try {
  // Try multiple possible paths for config.json (private, gitignored)
  const possiblePaths = [
    path.join(__dirname, '../../config.json'),          // Development
    path.join(process.resourcesPath, '../../config.json'), // Production (Mac)
    path.join(process.cwd(), 'config.json'),            // Working directory
    path.join(app.getAppPath(), '../config.json'),      // App directory
  ];
  
  // Fallback: config.public.json (public, bundled with app)
  const publicConfigPaths = [
    path.join(__dirname, '../../config.public.json'),          // Development
    path.join(process.resourcesPath, '../../config.public.json'), // Production (Mac)
    path.join(process.cwd(), 'config.public.json'),            // Working directory
    path.join(app.getAppPath(), '../config.public.json'),      // App directory
    path.join(app.getAppPath(), 'config.public.json'),         // Inside app.asar
  ];
  
  let configPath = '';
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      configPath = tryPath;
      break;
    }
  }
  
  if (configPath) {
    console.log('Loading config from:', configPath);
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    // Fallback to config.public.json
    let publicConfigPath = '';
    for (const tryPath of publicConfigPaths) {
      if (fs.existsSync(tryPath)) {
        publicConfigPath = tryPath;
        break;
      }
    }
    
    if (publicConfigPath) {
      console.log('Loading public config from:', publicConfigPath);
      config = JSON.parse(fs.readFileSync(publicConfigPath, 'utf8'));
    } else {
      console.warn('No config file found, using environment variables or defaults');
      console.log('Tried config.json paths:', possiblePaths);
      console.log('Tried config.public.json paths:', publicConfigPaths);
    }
  }
} catch (error) {
  console.error('Error loading config:', error);
}

// Get GitHub credentials from config or environment variables
const getGitHubConfig = () => {
  return {
    clientId: config.github?.clientId || process.env.GITHUB_CLIENT_ID || '',
    clientSecret: config.github?.clientSecret || process.env.GITHUB_CLIENT_SECRET || '',
    baseUrl: store.get('github.baseUrl') as string || config.github?.baseUrl || process.env.GITHUB_BASE_URL || 'https://github.com',
    apiUrl: store.get('github.apiUrl') as string || config.github?.apiUrl || process.env.GITHUB_API_URL || 'https://api.github.com'
  };
};

let mainWindow: BrowserWindow;
let tray: Tray;
let isWidgetMode = false;

// Register custom protocol
if (!app.isDefaultProtocolClient('github-pr-viewer')) {
  app.setAsDefaultProtocolClient('github-pr-viewer');
}

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  // 창 닫기 시 숨기기 (완전 종료 방지)
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow.hide();
    }
  });
};

const createTray = (): void => {
  let iconPath: string;
  
  if (process.env.NODE_ENV === 'development') {
    iconPath = path.join(__dirname, '../../assets/icons/tray-icon.png');
  } else {
    // 프로덕션에서는 extraResources 폴더 경로 사용
    iconPath = path.join(process.resourcesPath, '..', 'assets', 'icons', 'tray-icon.png');
  }
  
  console.log('Tray icon path:', iconPath);
  console.log('Icon file exists:', require('fs').existsSync(iconPath));
  console.log('process.resourcesPath:', process.resourcesPath);
  
  const icon = nativeImage.createFromPath(iconPath);
  console.log('Icon is empty:', icon.isEmpty());
  
  if (icon.isEmpty()) {
    console.error('Tray icon is empty, trying alternative paths');
    
    // 여러 가능한 경로들을 시도
    const possiblePaths = [
      path.join(process.resourcesPath, 'assets', 'icons', 'tray-icon.png'),
      path.join(__dirname, '../assets/icons/tray-icon.png'),
      path.join(app.getAppPath(), 'assets/icons/tray-icon.png'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icons', 'tray-icon.png')
    ];
    
    let iconFound = false;
    for (const tryPath of possiblePaths) {
      console.log('Trying path:', tryPath);
      console.log('Path exists:', require('fs').existsSync(tryPath));
      
      if (require('fs').existsSync(tryPath)) {
        const tryIcon = nativeImage.createFromPath(tryPath);
        if (!tryIcon.isEmpty()) {
          console.log('Successfully loaded icon from:', tryPath);
          tryIcon.setTemplateImage(true);
          tray = new Tray(tryIcon);
          iconFound = true;
          break;
        }
      }
    }
    
    if (!iconFound) {
      // 최후 수단: 시스템 기본 아이콘 사용
      console.error('Using system default icon');
      const systemIcon = nativeImage.createFromNamedImage('NSStatusNone', [16, 16]);
      tray = new Tray(systemIcon);
    }
  } else {
    console.log('Successfully loaded icon from main path');
    icon.setTemplateImage(true);
    tray = new Tray(icon);
  }
  
  const currentLanguage = store.get('app.language', 'ko') as string;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'GitHub PR Viewer',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: currentLanguage === 'ko' ? '보이기' : 'Show',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          if (process.platform === 'darwin') {
            app.dock.show();
          }
        }
      }
    },
    {
      label: currentLanguage === 'ko' ? '숨기기' : 'Hide',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
          if (process.platform === 'darwin') {
            app.dock.hide();
          }
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: currentLanguage === 'ko' ? '위젯 모드' : 'Widget Mode',
      type: 'checkbox',
      checked: isWidgetMode,
      click: toggleWidgetMode
    },
    {
      type: 'separator'
    },
    {
      label: currentLanguage === 'ko' ? '언어' : 'Language',
      submenu: [
        {
          label: '🇰🇷 한국어',
          type: 'radio',
          checked: currentLanguage === 'ko',
          click: () => {
            store.set('app.language', 'ko');
            mainWindow?.webContents.send('language-changed', 'ko');
            createTray(); // Recreate tray with new language
          }
        },
        {
          label: '🇺🇸 English',
          type: 'radio',
          checked: currentLanguage === 'en',
          click: () => {
            store.set('app.language', 'en');
            mainWindow?.webContents.send('language-changed', 'en');
            createTray(); // Recreate tray with new language
          }
        }
      ]
    },
    {
      type: 'separator'
    },
    {
      label: currentLanguage === 'ko' ? '종료' : 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('GitHub PR Viewer');
};

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // macOS에서는 트레이 아이콘이 있으므로 앱을 종료하지 않음
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Cmd+Q로 앱 종료 가능하게 하기
app.on('before-quit', (event) => {
  // macOS에서 Cmd+Q를 눌렀을 때 실제로 종료하도록 함
  if (process.platform === 'darwin') {
    app.exit();
  }
});

// 위젯 모드 토글 함수
const toggleWidgetMode = () => {
  if (!mainWindow) return;
  
  isWidgetMode = !isWidgetMode;
  
  if (isWidgetMode) {
    // 위젯 모드로 전환
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    mainWindow.setSize(400, 600);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(false);
    mainWindow.setPosition(screenWidth - 420, 50); // 우측 상단에 위치
    mainWindow.setSkipTaskbar(true); // 독에서 숨기기
  } else {
    // 일반 모드로 전환
    mainWindow.setSize(1200, 800);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(true);
    mainWindow.center();
    mainWindow.setSkipTaskbar(false); // 독에 다시 표시
  }
  
  // renderer에 위젯 모드 상태 전달
  mainWindow.webContents.send('widget-mode-changed', isWidgetMode);
};

// IPC 핸들러 추가
ipcMain.handle('toggle-widget-mode', toggleWidgetMode);
ipcMain.handle('get-widget-mode', () => isWidgetMode);

ipcMain.handle('get-access-token', () => {
  return store.get('github.accessToken');
});

ipcMain.handle('set-access-token', (_, token: string) => {
  store.set('github.accessToken', token);
});

ipcMain.handle('get-watched-repos', () => {
  return store.get('watchedRepos', []);
});

ipcMain.handle('set-watched-repos', (_, repos: any[]) => {
  store.set('watchedRepos', repos);
});

ipcMain.handle('github-oauth', async () => {
  console.log('GitHub OAuth handler called');
  return await showAuthChoice();
});

// GitHub 인증 방식 선택 화면을 보여주는 함수
async function showAuthChoice(): Promise<string> {
  const authWindow = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  const choiceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>GitHub 인증 방식 선택</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
          text-align: center; 
          padding: 2rem; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .option {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1rem 0;
          cursor: pointer;
          transition: all 0.3s;
          border: 2px solid transparent;
        }
        .option:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #28a745;
          transform: translateY(-2px);
        }
        .option-title {
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: #28a745;
        }
        .option-desc {
          font-size: 0.9rem;
          line-height: 1.5;
          opacity: 0.9;
        }
        .recommended {
          border-color: #ffc107;
        }
        .recommended .option-title {
          color: #ffc107;
        }
        .recommended::before {
          content: "⭐ 추천";
          background: #ffc107;
          color: black;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
          position: absolute;
          top: -8px;
          left: 16px;
        }
        .warning {
          background: rgba(255, 193, 7, 0.2);
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 1rem;
          margin: 1.5rem 0;
          font-size: 0.9rem;
        }
        .button {
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 1rem;
        }
        .button:hover {
          background: #545b62;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 GitHub 인증</h1>
        <p>GitHub에 로그인하는 방법을 선택하세요</p>
        
        <div class="option recommended" onclick="usePAT()" style="position: relative;">
          <div class="option-title">Personal Access Token</div>
          <div class="option-desc">
            GitHub에서 토큰을 생성하고 입력하는 방식입니다.<br>
            간단하고 안전하며, 즉시 사용할 수 있습니다.
          </div>
        </div>
        
        <div class="option" onclick="tryDeviceFlow()">
          <div class="option-title">Device Flow</div>
          <div class="option-desc">
            GitHub 웹사이트에서 코드를 입력하여 인증하는 방식입니다.<br>
            다른 앱들처럼 GitHub에서 직접 계정을 선택하고 승인할 수 있습니다.
          </div>
        </div>
        
        <div class="option" onclick="showOAuthSetup()">
          <div class="option-title">OAuth App 설정</div>
          <div class="option-desc">
            직접 OAuth App을 등록하고 Client ID/Secret을 입력하는 방식입니다.<br>
            프로덕션 환경에서 권장됩니다.
          </div>
        </div>
        
        <div class="warning">
          💡 처음 사용하시는 경우 <strong>Personal Access Token</strong>을 권장합니다.
        </div>
        
        <button class="button" onclick="closeWindow()">취소</button>
      </div>
      
      <script>
        const { ipcRenderer } = require('electron');
        
        function usePAT() {
          ipcRenderer.send('auth-choice', { type: 'PAT' });
        }
        
        function tryDeviceFlow() {
          ipcRenderer.send('auth-choice', { type: 'DEVICE_FLOW' });
        }
        
        function showOAuthSetup() {
          ipcRenderer.send('auth-choice', { type: 'OAUTH_SETUP' });
        }
        
        function closeWindow() {
          ipcRenderer.send('auth-choice', { type: 'CLOSE' });
        }
      </script>
    </body>
    </html>
  `;
  
  authWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(choiceHtml));
  authWindow.show();
  
  return new Promise<string>((resolve, reject) => {
    let isResolved = false;
    
    const handleAuthChoice = (event: any, data: any) => {
      if (isResolved) return;
      
      console.log('Auth choice received:', data);
      isResolved = true;
      authWindow.close();
      ipcMain.removeListener('auth-choice', handleAuthChoice);
      
      switch (data.type) {
        case 'PAT':
          startPATFlow().then(resolve as any).catch(reject);
          break;
        case 'DEVICE_FLOW':
          startDeviceFlow().then(resolve as any).catch((error) => {
            console.log('Device Flow failed:', error.message);
            // Device Flow 실패시 오류 메시지와 함께 다시 선택 화면으로
            if (error.message.includes('Device Flow not available') || error.message.includes('device_flow_disabled')) {
              console.log('Device Flow not supported, showing error message');
              showDeviceFlowError().then(resolve as any).catch(reject);
            } else {
              reject(error);
            }
          });
          break;
        case 'OAUTH_SETUP':
          startOAuthSetup().then(resolve as any).catch(reject);
          break;
        case 'CLOSE':
          reject(new Error('Authentication cancelled'));
          break;
        default:
          reject(new Error('Unknown auth choice'));
      }
    };
    
    ipcMain.on('auth-choice', handleAuthChoice);
    
    authWindow.on('closed', () => {
      if (!isResolved) {
        isResolved = true;
        ipcMain.removeListener('auth-choice', handleAuthChoice);
        reject(new Error('Authentication cancelled'));
      }
    });
  }).catch(async (error) => {
    // RESTART_AUTH_CHOICE 오류가 발생하면 다시 선택 화면을 보여줌
    if (error.message === 'RESTART_AUTH_CHOICE') {
      console.log('Restarting auth choice');
      return await showAuthChoice();
    } else {
      throw error;
    }
  });
}

// Device Flow 오류 메시지 표시 함수
async function showDeviceFlowError() {
  const authWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Device Flow 지원 안됨</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
          text-align: center; 
          padding: 2rem; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          max-width: 500px;
          margin: 0 auto;
        }
        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .message {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1.5rem 0;
          text-align: left;
          line-height: 1.6;
        }
        .button {
          background: #28a745;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          margin: 0.5rem;
          min-width: 140px;
        }
        .button:hover {
          background: #1e7e34;
        }
        .button.secondary {
          background: #6c757d;
        }
        .button.secondary:hover {
          background: #545b62;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">⚠️</div>
        <h1>Device Flow를 사용할 수 없습니다</h1>
        
        <div class="message">
          <p><strong>문제:</strong> 이 GitHub OAuth App에서 Device Flow가 활성화되지 않았습니다.</p>
          <p><strong>해결방법:</strong> 다른 인증 방식을 선택해주세요.</p>
          <ul>
            <li><strong>Personal Access Token:</strong> 가장 간단하고 추천하는 방식</li>
            <li><strong>OAuth App 설정:</strong> 직접 OAuth App을 등록하는 방식</li>
          </ul>
        </div>
        
        <button class="button" onclick="usePAT()">Personal Access Token 사용</button>
        <button class="button secondary" onclick="backToChoice()">다시 선택하기</button>
      </div>
      
      <script>
        const { ipcRenderer } = require('electron');
        
        function usePAT() {
          ipcRenderer.send('device-flow-error-action', { type: 'USE_PAT' });
        }
        
        function backToChoice() {
          ipcRenderer.send('device-flow-error-action', { type: 'BACK_TO_CHOICE' });
        }
      </script>
    </body>
    </html>
  `;
  
  return new Promise((resolve, reject) => {
    authWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
    authWindow.show();
    
    let isResolved = false;
    
    const handleErrorAction = (event: any, data: any) => {
      if (isResolved) return;
      
      console.log('Device Flow error action received:', data);
      isResolved = true;
      authWindow.close();
      ipcMain.removeListener('device-flow-error-action', handleErrorAction);
      
      if (data.type === 'USE_PAT') {
        startPATFlow().then(resolve).catch(reject);
      } else if (data.type === 'BACK_TO_CHOICE') {
        // 다시 GitHub OAuth 선택 화면으로 돌아가기
        reject(new Error('RESTART_AUTH_CHOICE'));
      } else {
        reject(new Error('Authentication cancelled'));
      }
    };
    
    ipcMain.on('device-flow-error-action', handleErrorAction);
    
    authWindow.on('closed', () => {
      if (!isResolved) {
        console.log('Device Flow error window closed by user');
        isResolved = true;
        ipcMain.removeListener('device-flow-error-action', handleErrorAction);
        reject(new Error('Authentication cancelled'));
      }
    });
  });
}

// Device Flow 시도 함수
async function startDeviceFlow() {
  try {
    console.log('Attempting Device Flow...');
    const { clientId, baseUrl } = getGitHubConfig();
    
    const deviceResponse = await fetch(`${baseUrl}/login/device/code`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        scope: 'repo read:user'
      }),
    });
    
    const deviceData = await deviceResponse.json();
    
    if (deviceData.error) {
      throw new Error(`Device Flow not available: ${deviceData.error_description}`);
    }
    
    // Device Flow UI 표시 (이전에 구현한 것과 동일)
    const authWindow = new BrowserWindow({
      width: 600,
      height: 500,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    
    const authHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GitHub 인증</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            text-align: center; 
            padding: 2rem; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            margin: 0 auto;
          }
          .code {
            font-size: 2rem;
            font-weight: bold;
            letter-spacing: 0.5rem;
            margin: 1.5rem 0;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            user-select: all;
            cursor: pointer;
          }
          .code:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          .button {
            background: #28a745;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 1rem 0.5rem;
            min-width: 160px;
          }
          .button:hover {
            background: #1e7e34;
          }
          .waiting {
            margin-top: 2rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            font-size: 0.9rem;
          }
          .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin-right: 0.5rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 GitHub Device Flow</h1>
          <p>1. 아래 버튼을 클릭하여 GitHub를 엽니다</p>
          <p>2. 다음 코드를 입력하세요:</p>
          
          <div class="code" onclick="copyCode()" title="클릭하여 복사">${deviceData.user_code}</div>
          
          <button class="button" onclick="openGitHub()">
            GitHub에서 인증하기
          </button>
          
          <div class="waiting">
            <div class="spinner"></div>
            인증을 완료하면 자동으로 로그인됩니다...
          </div>
        </div>
        
        <script>
          function openGitHub() {
            require('electron').shell.openExternal('${deviceData.verification_uri}');
          }
          
          function copyCode() {
            require('electron').clipboard.writeText('${deviceData.user_code}');
            
            // 복사 피드백
            const codeElement = document.querySelector('.code');
            const originalText = codeElement.textContent;
            codeElement.textContent = '복사됨!';
            codeElement.style.background = 'rgba(40, 167, 69, 0.3)';
            
            setTimeout(() => {
              codeElement.textContent = originalText;
              codeElement.style.background = 'rgba(255, 255, 255, 0.2)';
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;
    
    authWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(authHtml));
    authWindow.show();
    
    // 폴링으로 토큰 확인
    const interval = deviceData.interval * 1000 || 5000;
    const expiresIn = deviceData.expires_in * 1000 || 900000;
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() - startTime > expiresIn) {
          authWindow.close();
          reject(new Error('Device flow expired'));
          return;
        }
        
        try {
          const { baseUrl } = getGitHubConfig();
          const tokenResponse = await fetch(`${baseUrl}/login/oauth/access_token`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId,
              device_code: deviceData.device_code,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
          });
          
          const tokenData = await tokenResponse.json();
          
          if (tokenData.access_token) {
            authWindow.close();
            resolve(tokenData.access_token);
          } else if (tokenData.error === 'authorization_pending') {
            setTimeout(poll, interval);
          } else if (tokenData.error === 'slow_down') {
            setTimeout(poll, interval + 5000);
          } else {
            authWindow.close();
            reject(new Error(tokenData.error_description || tokenData.error));
          }
        } catch (error) {
          setTimeout(poll, interval);
        }
      };
      
      setTimeout(poll, interval);
      
      authWindow.on('closed', () => {
        reject(new Error('Authentication cancelled'));
      });
    });
    
  } catch (error) {
    console.error('Device Flow error:', error);
    throw error;
  }
}

// OAuth 설정 함수
async function startOAuthSetup() {
  const { baseUrl } = getGitHubConfig();
  
  const authWindow = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  const setupHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth App 설정</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
          text-align: center; 
          padding: 2rem; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          max-width: 600px;
          margin: 0 auto;
        }
        .input-container {
          margin: 1rem 0;
          text-align: left;
        }
        .input-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .input-field {
          width: 100%;
          padding: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1rem;
          font-family: monospace;
        }
        .input-field::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
        .input-field:focus {
          outline: none;
          border-color: #28a745;
          background: rgba(255, 255, 255, 0.2);
        }
        .button {
          background: #28a745;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          margin: 0.5rem;
          min-width: 120px;
        }
        .button:hover {
          background: #1e7e34;
        }
        .button.secondary {
          background: #6c757d;
        }
        .button.secondary:hover {
          background: #545b62;
        }
        .info {
          text-align: left;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .link {
          color: #17a2b8;
          text-decoration: underline;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>OAuth App 설정</h1>
        <p>GitHub에서 OAuth App을 등록하고 Client ID와 Secret을 입력하세요.</p>
        
        <div class="info">
          <p><strong>1. GitHub에서 OAuth App 등록:</strong></p>
          <p><span class="link" onclick="openGitHubApps()">GitHub Developer Settings</span>에서 "New OAuth App"을 클릭하세요.</p>
          <p><strong>2. 설정 값:</strong></p>
          <p>• Application name: GitHub PR Viewer</p>
          <p>• Homepage URL: http://localhost</p>
          <p>• Authorization callback URL: http://localhost:17183/callback</p>
        </div>
        
        <div class="input-container">
          <label class="input-label">Client ID</label>
          <input 
            type="text" 
            class="input-field" 
            id="clientId"
            placeholder="Ov23liv0e8LlR47lCd9l"
            value=""
          />
        </div>
        
        <div class="input-container">
          <label class="input-label">Client Secret</label>
          <input 
            type="password" 
            class="input-field" 
            id="clientSecret"
            placeholder="5e0dbbe6a41d384ac1ea5f5b0d3512e392e25b40"
            value=""
          />
        </div>
        
        <button class="button" onclick="startOAuth()">OAuth 로그인</button>
        <button class="button secondary" onclick="usePAT()">Personal Token 사용</button>
        <button class="button secondary" onclick="closeWindow()">취소</button>
        
        <script>
          const { ipcRenderer } = require('electron');
          
          function openGitHubApps() {
            require('electron').shell.openExternal('` + baseUrl + `/settings/developers');
          }
          
          function startOAuth() {
            const clientId = document.getElementById('clientId').value.trim();
            const clientSecret = document.getElementById('clientSecret').value.trim();
            
            if (!clientId || !clientSecret) {
              alert('Client ID와 Client Secret을 모두 입력해주세요.');
              return;
            }
            
            ipcRenderer.send('oauth-setup-action', { 
              type: 'OAUTH_LOGIN', 
              clientId: clientId, 
              clientSecret: clientSecret 
            });
          }
          
          function usePAT() {
            ipcRenderer.send('oauth-setup-action', { type: 'USE_PAT' });
          }
          
          function closeWindow() {
            ipcRenderer.send('oauth-setup-action', { type: 'BACK_TO_CHOICE' });
          }
        </script>
      </div>
    </body>
    </html>
  `;
  
  return new Promise((resolve, reject) => {
    authWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(setupHtml));
    authWindow.show();
    
    let isResolved = false;
    
    const handleOAuthSetupAction = (event: any, data: any) => {
      if (isResolved) return;
      
      console.log('OAuth setup action received:', data);
      isResolved = true;
      authWindow.close();
      ipcMain.removeListener('oauth-setup-action', handleOAuthSetupAction);
      
      if (data.type === 'OAUTH_LOGIN') {
        startActualOAuth(data.clientId, data.clientSecret).then(resolve).catch(reject);
      } else if (data.type === 'USE_PAT') {
        startPATFlow().then(resolve).catch(reject);
      } else if (data.type === 'BACK_TO_CHOICE') {
        reject(new Error('RESTART_AUTH_CHOICE'));
      } else {
        reject(new Error('OAuth setup cancelled'));
      }
    };
    
    ipcMain.on('oauth-setup-action', handleOAuthSetupAction);
    
    authWindow.on('closed', () => {
      if (!isResolved) {
        console.log('OAuth setup window closed by user');
        isResolved = true;
        ipcMain.removeListener('oauth-setup-action', handleOAuthSetupAction);
        reject(new Error('OAuth setup cancelled'));
      }
    });
  });
}

// 실제 OAuth 플로우 함수
async function startActualOAuth(clientId: string, clientSecret: string) {
  const authWindow = new BrowserWindow({
    width: 500,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const callbackPort = 17183;
  const redirectUri = `http://localhost:${callbackPort}/callback`;
  const scope = 'repo';
  const { baseUrl } = getGitHubConfig();
  
  const authUrl = `${baseUrl}/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  
  authWindow.loadURL(authUrl);
  authWindow.show();

  return new Promise((resolve, reject) => {
    const handleNavigation = async (url: string) => {
      if (url.startsWith(redirectUri)) {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        
        if (error) {
          authWindow.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }
        
        if (code) {
          try {
            // 코드로 액세스 토큰 교환
            const { baseUrl } = getGitHubConfig();
            const response = await fetch(`${baseUrl}/login/oauth/access_token`, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
              }),
            });
            
            const data = await response.json();
            authWindow.close();
            
            if (data.access_token) {
              resolve(data.access_token);
            } else {
              reject(new Error(`Failed to get access token: ${data.error_description || data.error}`));
            }
          } catch (error) {
            authWindow.close();
            reject(error);
          }
        }
      }
    };

    authWindow.webContents.on('will-redirect', (event, navigationUrl) => {
      handleNavigation(navigationUrl);
    });

    authWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      handleNavigation(navigationUrl);
    });

    authWindow.on('closed', () => {
      reject(new Error('Authentication cancelled'));
    });
  });
}

// Personal Access Token 플로우 함수
async function startPATFlow() {
  const { baseUrl } = getGitHubConfig();
  
  const authWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  
  const patHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Personal Access Token</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
          text-align: center; 
          padding: 2rem; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          max-width: 500px;
          margin: 0 auto;
        }
        .input-container {
          margin: 1.5rem 0;
        }
        .token-input {
          width: 100%;
          padding: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 1rem;
          font-family: monospace;
          text-align: center;
        }
        .token-input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }
        .token-input:focus {
          outline: none;
          border-color: #28a745;
          background: rgba(255, 255, 255, 0.2);
        }
        .button {
          background: #28a745;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          margin: 0.5rem;
          min-width: 120px;
        }
        .button:hover {
          background: #1e7e34;
        }
        .button.secondary {
          background: #6c757d;
        }
        .button.secondary:hover {
          background: #545b62;
        }
        .link {
          color: #17a2b8;
          text-decoration: underline;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Personal Access Token</h1>
        <p><span class="link" onclick="openGitHub()">GitHub에서 토큰 생성</span> 후 아래에 입력하세요.</p>
        <p>필요 권한: <strong>repo</strong></p>
        
        <div class="input-container">
          <input 
            type="password" 
            class="token-input" 
            id="tokenInput"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            maxlength="100"
          />
        </div>
        
        <button class="button" onclick="saveToken()">로그인</button>
        <button class="button secondary" onclick="closeWindow()">취소</button>
        
        <script>
          const { ipcRenderer } = require('electron');
          
          function openGitHub() {
            require('electron').shell.openExternal('` + baseUrl + `/settings/tokens');
          }
          
          function saveToken() {
            const token = document.getElementById('tokenInput').value.trim();
            if (!token) {
              alert('토큰을 입력해주세요.');
              return;
            }
            ipcRenderer.send('pat-action', { type: 'PAT_TOKEN', token: token });
          }
          
          function closeWindow() {
            ipcRenderer.send('pat-action', { type: 'BACK_TO_CHOICE' });
          }
          
          document.getElementById('tokenInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              saveToken();
            }
          });
        </script>
      </body>
    </html>
  `;
  
  return new Promise((resolve, reject) => {
    authWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(patHtml));
    authWindow.show();
    
    let isResolved = false;
    
    // IPC 리스너 추가
    const handlePATAction = (event: any, data: any) => {
      if (isResolved) return;
      
      console.log('PAT action received:', data);
      
      if (data.type === 'PAT_TOKEN') {
        console.log('PAT token received');
        isResolved = true;
        authWindow.close();
        ipcMain.removeListener('pat-action', handlePATAction);
        resolve(data.token);
      } else if (data.type === 'BACK_TO_CHOICE') {
        console.log('PAT flow cancelled, going back to choice');
        isResolved = true;
        authWindow.close();
        ipcMain.removeListener('pat-action', handlePATAction);
        reject(new Error('RESTART_AUTH_CHOICE'));
      }
    };
    
    ipcMain.on('pat-action', handlePATAction);
    
    authWindow.on('closed', () => {
      if (!isResolved) {
        console.log('PAT window closed by user');
        isResolved = true;
        ipcMain.removeListener('pat-action', handlePATAction);
        reject(new Error('Authentication cancelled'));
      }
    });
  });
}

ipcMain.handle('fetch-user-repos', async () => {
  const token = store.get('github.accessToken') as string;
  if (!token) throw new Error('No access token');

  const { apiUrl } = getGitHubConfig();
  const octokit = new Octokit({ 
    auth: token,
    baseUrl: apiUrl === 'https://api.github.com' ? undefined : apiUrl
  });
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    visibility: 'all',
    sort: 'updated',
    per_page: 100,
  });
  
  return data;
});

ipcMain.handle('fetch-pull-requests', async (_, repos: any[]) => {
  const token = store.get('github.accessToken') as string;
  if (!token) throw new Error('No access token');

  const { apiUrl } = getGitHubConfig();
  const octokit = new Octokit({ 
    auth: token,
    baseUrl: apiUrl === 'https://api.github.com' ? undefined : apiUrl
  });
  const allPRs = [];

  for (const repo of repos) {
    try {
      const { data: prs } = await octokit.rest.pulls.list({
        owner: repo.owner.login,
        repo: repo.name,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
      });

      for (const pr of prs) {
        try {
          const [reviewsResponse, commentsResponse] = await Promise.all([
            octokit.rest.pulls.listReviews({
              owner: repo.owner.login,
              repo: repo.name,
              pull_number: pr.number,
            }),
            octokit.rest.issues.listComments({
              owner: repo.owner.login,
              repo: repo.name,
              issue_number: pr.number,
            })
          ]);

          const approvedReviews = reviewsResponse.data.filter(review => review.state === 'APPROVED');
          const commentsCount = commentsResponse.data.length;
          
          allPRs.push({
            ...pr,
            repository: repo,
            approvedCount: approvedReviews.length,
            isApproved: approvedReviews.length > 0,
            totalComments: commentsCount,
            comments: commentsCount,
            review_comments: 0, // 리뷰 댓글은 별도 API 호출 필요하지만 성능상 생략
          });
        } catch (prError) {
          console.error(`Error fetching details for PR #${pr.number}:`, prError);
          // 에러가 있어도 기본 PR 정보는 포함
          allPRs.push({
            ...pr,
            repository: repo,
            approvedCount: 0,
            isApproved: false,
            totalComments: 0,
            comments: 0,
            review_comments: 0,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching PRs for ${repo.full_name}:`, error);
    }
  }

  return allPRs;
});

ipcMain.handle('open-external', (_, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle('set-language', (_, language: string) => {
  store.set('app.language', language);
});

ipcMain.handle('get-language', () => {
  const savedLanguage = store.get('app.language');
  if (savedLanguage) {
    return savedLanguage;
  }
  
  // Auto-detect system language
  const systemLanguage = app.getLocale();
  const detectedLanguage = systemLanguage.startsWith('ko') ? 'ko' : 'en';
  
  // Save the detected language
  store.set('app.language', detectedLanguage);
  return detectedLanguage;
});

ipcMain.handle('set-refresh-interval', (_, interval: number) => {
  store.set('app.refreshInterval', interval);
});

ipcMain.handle('get-refresh-interval', () => {
  return store.get('app.refreshInterval', 5); // Default to 5 minutes
});

ipcMain.handle('get-github-config', () => {
  return getGitHubConfig();
});

ipcMain.handle('set-github-endpoints', (_, baseUrl: string, apiUrl: string) => {
  store.set('github.baseUrl', baseUrl);
  store.set('github.apiUrl', apiUrl);
});

// ============================================================
// Claude AI - API Key Management
// ============================================================

ipcMain.handle('set-claude-api-key', (_, key: string) => {
  store.set('ai.claudeApiKey', key);
});

ipcMain.handle('get-claude-api-key', () => {
  const key = store.get('ai.claudeApiKey') as string;
  if (!key) return { hasKey: false, maskedKey: '' };
  const masked = key.substring(0, 7) + '...' + key.substring(key.length - 4);
  return { hasKey: true, maskedKey: masked };
});

ipcMain.handle('remove-claude-api-key', () => {
  store.delete('ai.claudeApiKey');
});

// ============================================================
// Claude AI - PR Summary
// ============================================================

ipcMain.handle('summarize-pr', async (_, owner: string, repo: string, prNumber: number) => {
  const claudeApiKey = store.get('ai.claudeApiKey') as string;
  if (!claudeApiKey) throw new Error('Claude API key is not set');

  // Check cache first
  const cacheKey = `ai.summaries.pr.${owner}/${repo}/${prNumber}`;
  const cached = store.get(cacheKey) as { summary: string; timestamp: number } | undefined;
  if (cached) {
    return { summary: cached.summary, timestamp: cached.timestamp, fromCache: true };
  }

  const token = store.get('github.accessToken') as string;
  if (!token) throw new Error('No GitHub access token');

  const { apiUrl } = getGitHubConfig();
  const octokit = new Octokit({
    auth: token,
    baseUrl: apiUrl === 'https://api.github.com' ? undefined : apiUrl
  });

  // Fetch PR details
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Fetch changed files with patches
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  // Build context for Claude
  const filesContext = files.map(f => {
    let entry = `File: ${f.filename} (${f.status}, +${f.additions} -${f.deletions})`;
    if (f.patch) {
      entry += `\n\`\`\`diff\n${f.patch}\n\`\`\``;
    }
    return entry;
  }).join('\n\n');

  // Detect user language for response
  const language = (store.get('app.language') as string) || 'en';
  const langInstruction = language === 'ko'
    ? '한국어로 답변해주세요.'
    : 'Please respond in English.';

  const prompt = `You are a code review assistant. Analyze the following Pull Request and provide a concise summary.

${langInstruction}

## PR Information
- Title: ${pr.title}
- Author: ${pr.user?.login || 'unknown'}
- Branch: ${pr.head.ref} → ${pr.base.ref}
- Changed files: ${files.length}
- Additions: ${pr.additions}, Deletions: ${pr.deletions}

## PR Description
${pr.body || '(No description provided)'}

## Changed Files and Diffs
${filesContext}

## Instructions
Please provide:
1. A brief overall summary of what this PR does (2-3 sentences)
2. Key changes organized by category (e.g., features, bug fixes, refactoring)
3. Any potential concerns or areas that might need attention

Keep the summary concise but informative.`;

  const anthropic = new Anthropic({ apiKey: claudeApiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const summary = message.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  const timestamp = Date.now();
  store.set(cacheKey, { summary, timestamp, model: 'claude-sonnet-4-20250514' });

  return { summary, timestamp, fromCache: false };
});

// ============================================================
// Claude AI - PR Comments/Reviews Summary
// ============================================================

ipcMain.handle('summarize-pr-comments', async (_, owner: string, repo: string, prNumber: number) => {
  const claudeApiKey = store.get('ai.claudeApiKey') as string;
  if (!claudeApiKey) throw new Error('Claude API key is not set');

  // Check cache first
  const cacheKey = `ai.summaries.comments.${owner}/${repo}/${prNumber}`;
  const cached = store.get(cacheKey) as { summary: string; timestamp: number } | undefined;
  if (cached) {
    return { summary: cached.summary, timestamp: cached.timestamp, fromCache: true };
  }

  const token = store.get('github.accessToken') as string;
  if (!token) throw new Error('No GitHub access token');

  const { apiUrl } = getGitHubConfig();
  const octokit = new Octokit({
    auth: token,
    baseUrl: apiUrl === 'https://api.github.com' ? undefined : apiUrl
  });

  // Fetch PR details for context
  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Fetch all reviews, review comments, and issue comments in parallel
  const [reviewsResponse, reviewCommentsResponse, issueCommentsResponse] = await Promise.all([
    octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    }),
    octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    }),
    octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    }),
  ]);

  const reviews = reviewsResponse.data;
  const reviewComments = reviewCommentsResponse.data;
  const issueComments = issueCommentsResponse.data;

  // Build reviews context
  const reviewsContext = reviews
    .filter(r => r.body || r.state !== 'COMMENTED')
    .map(r => `[Review by ${r.user?.login || 'unknown'} - ${r.state}]${r.body ? '\n' + r.body : ''}`)
    .join('\n\n');

  // Build review comments context (inline code comments)
  const reviewCommentsContext = reviewComments
    .map(c => `[Inline comment by ${c.user?.login || 'unknown'} on ${c.path}:${c.line || c.original_line || '?'}]\n${c.body}`)
    .join('\n\n');

  // Build issue comments context (general PR comments)
  const issueCommentsContext = issueComments
    .map(c => `[Comment by ${c.user?.login || 'unknown'}]\n${c.body}`)
    .join('\n\n');

  if (!reviewsContext && !reviewCommentsContext && !issueCommentsContext) {
    const noCommentsMsg = (store.get('app.language') as string) === 'ko'
      ? '이 PR에는 리뷰나 댓글이 없습니다.'
      : 'There are no reviews or comments on this PR.';
    return { summary: noCommentsMsg, timestamp: Date.now(), fromCache: false };
  }

  // Detect user language for response
  const language = (store.get('app.language') as string) || 'en';
  const langInstruction = language === 'ko'
    ? '한국어로 답변해주세요.'
    : 'Please respond in English.';

  const prompt = `You are a code review assistant. Analyze the following Pull Request reviews and comments, then provide a concise summary.

${langInstruction}

## PR Information
- Title: ${pr.title}
- Author: ${pr.user?.login || 'unknown'}
- PR #${prNumber} in ${owner}/${repo}

## Reviews (${reviews.length} total)
${reviewsContext || '(No reviews)'}

## Inline Code Comments (${reviewComments.length} total)
${reviewCommentsContext || '(No inline comments)'}

## General Comments (${issueComments.length} total)
${issueCommentsContext || '(No general comments)'}

## Instructions
Please provide:
1. Overall review status (approved, changes requested, pending)
2. Key discussion points and feedback themes
3. Specific changes requested by reviewers (if any)
4. Any unresolved concerns or open questions

Keep the summary concise but capture all important feedback.`;

  const anthropic = new Anthropic({ apiKey: claudeApiKey });
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const summary = message.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  const timestamp = Date.now();
  store.set(cacheKey, { summary, timestamp, model: 'claude-sonnet-4-20250514' });

  return { summary, timestamp, fromCache: false };
});

// ============================================================
// Claude AI - Cache Management
// ============================================================

ipcMain.handle('get-pr-summary-cache', (_, owner: string, repo: string, prNumber: number, type: 'pr' | 'comments') => {
  const cacheKey = `ai.summaries.${type}.${owner}/${repo}/${prNumber}`;
  const cached = store.get(cacheKey) as { summary: string; timestamp: number } | undefined;
  if (cached) {
    return { summary: cached.summary, timestamp: cached.timestamp, fromCache: true };
  }
  return null;
});

ipcMain.handle('clear-pr-summary-cache', (_, owner: string, repo: string, prNumber: number, type: 'pr' | 'comments') => {
  const cacheKey = `ai.summaries.${type}.${owner}/${repo}/${prNumber}`;
  store.delete(cacheKey);
});

// ============================================================
// GitHub - LGTM (Approve PR + Comment)
// ============================================================

ipcMain.handle('approve-pr-lgtm', async (_, owner: string, repo: string, prNumber: number) => {
  const token = store.get('github.accessToken') as string;
  if (!token) throw new Error('No GitHub access token');

  const { apiUrl } = getGitHubConfig();
  const octokit = new Octokit({
    auth: token,
    baseUrl: apiUrl === 'https://api.github.com' ? undefined : apiUrl
  });

  // Submit approval review with LGTM comment
  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: 'APPROVE',
    body: 'LGTM 👍',
  });

  return { success: true };
});