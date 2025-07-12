# GitHub PR Viewer

Mac용 GitHub Pull Request 모니터링 데스크톱 애플리케이션입니다.

## 주요 기능

- **GitHub OAuth 로그인**: 안전한 GitHub 계정 연동
- **Repository 관심 목록**: 원하는 저장소를 관심 목록에 추가하여 관리
- **실시간 PR 모니터링**: 관심 목록의 저장소에서 열린 Pull Request 실시간 조회
- **상세 정보 표시**: PR 제목, 번호, 작성자, 승인 상태, 댓글 수 등 상세 정보
- **자동 새로고침**: 5분마다 자동으로 데이터 업데이트
- **직관적인 UI**: GitHub와 유사한 인터페이스로 쉬운 사용

## 시작하기

### 필요 조건

- Node.js 18 이상
- GitHub OAuth App 등록 필요

### GitHub OAuth App 설정

1. GitHub에서 새로운 OAuth App 등록:
   - GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Application name: `GitHub PR Viewer`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/callback`

2. Client ID와 Client Secret 확인

### 설치 및 실행

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
```bash
cp .env.example .env
# .env 파일을 열어 GITHUB_CLIENT_SECRET 값 설정
```

3. 개발 모드 실행:
```bash
npm run dev
```

4. 프로덕션 빌드:
```bash
npm run build
npm start
```

5. 배포용 패키지 생성:
```bash
npm run dist
```

## 기술 스택

- **Electron**: Mac 네이티브 앱 프레임워크
- **React + TypeScript**: 사용자 인터페이스
- **GitHub API**: Pull Request 데이터 조회
- **Electron Store**: 로컬 데이터 저장

## 사용법

1. 앱 실행 후 "Login with GitHub" 버튼 클릭
2. GitHub OAuth 인증 완료
3. "Repositories" 탭에서 관심 있는 저장소를 관심 목록에 추가
4. "Pull Requests" 탭에서 실시간으로 PR 목록 확인
5. PR 항목 클릭하여 GitHub에서 바로 열기

## 라이선스

MIT License