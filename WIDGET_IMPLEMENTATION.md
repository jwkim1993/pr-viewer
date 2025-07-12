# 위젯 구현 방식

## macOS 위젯 구현 옵션

### 1. 현재 Electron 앱 기반 위젯 구현

#### 방법 1: 항상 위에 표시 (Always on Top)
```typescript
// main.ts에서 BrowserWindow 설정
const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    skipTaskbar: true, // Windows에서 작업표시줄에 표시하지 않음
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
};
```

#### 방법 2: 시스템 트레이 + 미니 윈도우
```typescript
// 시스템 트레이 아이콘 추가
import { Tray, Menu } from 'electron';

let tray: Tray;

const createTray = () => {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show PR Viewer', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip('GitHub PR Viewer');
};
```

### 2. macOS 네이티브 위젯 (WidgetKit) - 별도 개발 필요

#### Swift + WidgetKit으로 구현해야 함
- **장점**: 진짜 macOS 위젯, 알림 센터에 표시
- **단점**: Swift 개발 필요, Electron과 별도 구현

```swift
// Widget.swift (예시)
import WidgetKit
import SwiftUI

struct PRViewerWidget: Widget {
    let kind: String = "PRViewerWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PRViewerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("GitHub PR Viewer")
        .description("View your GitHub Pull Requests")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
```

### 3. 웹 기반 위젯 (Browser Extension)

#### Chrome/Safari Extension으로 구현
```typescript
// manifest.json
{
  "manifest_version": 3,
  "name": "GitHub PR Viewer",
  "version": "1.0",
  "action": {
    "default_popup": "popup.html"
  },
  "permissions": ["storage"],
  "host_permissions": ["https://api.github.com/*"]
}
```

## 추천 구현 방안

### 현재 Electron 앱에서 위젯 모드 추가

```typescript
// main.ts에 위젯 모드 추가
let isWidgetMode = false;

const toggleWidgetMode = () => {
  isWidgetMode = !isWidgetMode;
  
  if (isWidgetMode) {
    mainWindow.setSize(400, 600);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(false);
    mainWindow.setPosition(screen.getPrimaryDisplay().workAreaSize.width - 420, 50);
  } else {
    mainWindow.setSize(1200, 800);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(true);
    mainWindow.center();
  }
};

// IPC 핸들러 추가
ipcMain.handle('toggle-widget-mode', toggleWidgetMode);
```

### UI에서 위젯 모드 토글 버튼 추가

```tsx
// Dashboard.tsx에 추가
const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [isWidgetMode, setIsWidgetMode] = useState(false);

  const toggleWidget = async () => {
    await window.electronAPI.toggleWidgetMode();
    setIsWidgetMode(!isWidgetMode);
  };

  return (
    <div className={`dashboard ${isWidgetMode ? 'widget-mode' : ''}`}>
      <header className="dashboard-header">
        {/* 기존 헤더 */}
        <button onClick={toggleWidget}>
          {isWidgetMode ? '일반 모드' : '위젯 모드'}
        </button>
      </header>
      {/* 나머지 컨텐츠 */}
    </div>
  );
};
```

### 위젯 모드 CSS

```css
.dashboard.widget-mode {
  padding-top: 10px;
}

.dashboard.widget-mode .dashboard-header {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.dashboard.widget-mode .pr-item {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.dashboard.widget-mode .tab-nav {
  display: none; /* 위젯에서는 탭 숨김 */}
```

## 결론

**가장 실용적인 방법**: 현재 Electron 앱에 위젯 모드를 추가하는 것이 가장 빠르고 효율적입니다.

1. **쉬운 구현**: 기존 코드 재사용
2. **빠른 개발**: 새로운 기술 스택 불필요  
3. **유지보수**: 하나의 코드베이스로 관리

위젯 기능이 필요하시면 위의 방법으로 구현하겠습니다!