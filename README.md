# GitHub PR Viewer

A desktop application for monitoring GitHub Pull Requests on macOS, built with Electron and React.

## 🌟 Support the Project

If you find this project helpful, consider supporting its development:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://coff.ee/jayden.coffee)

Your support helps maintain and improve this project. Thank you! ☕

## ✨ Features

- **Multi-language Support**: Korean and English interface with automatic language detection
- **Flexible Authentication**: Support for Personal Access Token, Device Flow, and OAuth App authentication
- **Repository Management**: Add repositories to your watchlist for easy monitoring
- **Real-time PR Monitoring**: Live monitoring of Pull Requests from your watched repositories
- **Detailed Information**: View PR title, number, author, approval status, comments, and more
- **Customizable Refresh Interval**: Set auto-refresh intervals (1, 5, 10, or 30 minutes)
- **Widget Mode**: Compact overlay mode for continuous monitoring while working
- **System Tray Integration**: Access the app from the system tray with language switching
- **Intuitive UI**: GitHub-like interface for familiar user experience

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- macOS (primary target platform)

### Configuration Setup

1. **Create config.json** (Copy from config.example.json):
```bash
cp config.example.json config.json
```

2. **Configure GitHub credentials** in `config.json`:
```json
{
  "github": {
    "clientId": "your_github_client_id",
    "clientSecret": "your_github_client_secret"
  }
}
```

### GitHub OAuth App Setup (Optional)

For the most seamless experience, you can set up your own GitHub OAuth App:

1. **Create a new OAuth App** on GitHub:
   - Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Application name: `GitHub PR Viewer`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/callback`

2. **Copy the Client ID and Client Secret** to your `config.json`

### Installation & Running

1. **Install dependencies**:
```bash
npm install
```

2. **Development mode**:
```bash
npm run dev
```

3. **Production build**:
```bash
npm run build
npm start
```

4. **Create distribution package**:
```bash
npm run dist
```

## 🔐 Authentication Methods

The app supports three authentication methods:

### 1. Personal Access Token (Recommended for beginners)
- Generate a token from GitHub Settings → Developer settings → Personal access tokens
- Simple setup with immediate access
- Most secure for personal use

### 2. Device Flow
- Authenticate through GitHub's web interface
- No need for OAuth App setup
- User-friendly experience similar to other apps

### 3. OAuth App
- Create your own GitHub OAuth App
- Professional setup for production use
- Complete control over authentication flow

## 🛠️ Tech Stack

- **Electron**: Cross-platform desktop app framework
- **React + TypeScript**: Modern UI development
- **i18next**: Internationalization framework
- **GitHub REST API**: Pull Request data fetching
- **Electron Store**: Persistent local storage
- **Webpack**: Module bundling and development server

## 📱 Usage

1. **Launch the app** and choose your preferred authentication method
2. **Complete authentication** through GitHub
3. **Add repositories** in the "Repositories" tab to your watchlist
4. **Monitor Pull Requests** in real-time from the "Pull Requests" tab
5. **Configure settings** like language and refresh interval in the "Settings" tab
6. **Use Widget Mode** for compact overlay monitoring
7. **Click any PR** to open it directly in GitHub

## ⚙️ Settings

### Language Settings
- Switch between Korean (한국어) and English
- Automatic language detection based on system settings
- Language preference saved locally

### General Settings
- **Auto-start on boot**: Launch app automatically when system starts (TODO: Not implemented)
- **Refresh interval**: Customize how often the app checks for new Pull Requests (1-30 minutes)

### Widget Mode
- Compact overlay mode for continuous monitoring
- Stays on top of other windows
- Minimal interface optimized for small size

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔧 Development

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main application logic
│   └── preload.ts  # Preload script for secure IPC
├── renderer/       # React frontend
│   ├── components/ # React components
│   ├── styles.css  # Application styles
│   └── index.tsx   # Entry point
├── locales/        # Internationalization files
│   ├── ko/         # Korean translations
│   └── en/         # English translations
└── types/          # TypeScript type definitions
```

### Available Scripts

- `npm run dev` - Start development with hot reload
- `npm run build` - Build for production
- `npm start` - Run built application
- `npm run dist` - Create distribution packages
- `npm run pack` - Create application package without installer

## 🐛 Troubleshooting

### Common Issues

1. **Authentication fails**: Check your `config.json` file and ensure GitHub credentials are correct
2. **App won't start**: Ensure Node.js 18+ is installed and dependencies are installed
3. **No repositories showing**: Verify your GitHub token has appropriate repository access permissions
4. **Widget mode issues**: Try toggling widget mode off and on again

### Config File Issues

If the app can't find your config file, it will try these locations in order:
1. `./config.json` (development)
2. `../config.json` (production)
3. Application directory
4. Working directory

## 📋 Roadmap

- [ ] Auto-start on system boot functionality
- [ ] Notification system for new Pull Requests
- [ ] Additional authentication providers
- [ ] Windows and Linux support
- [ ] Custom themes and appearance settings
- [ ] Advanced filtering and sorting options
- [ ] Export and backup features

---

Built with ❤️ using Electron and React