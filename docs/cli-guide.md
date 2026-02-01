---
sidebar_position: 8
title: CLI 도구 가이드
description: 터미널에서 CodeJam 룸을 빠르게 생성하고 관리하는 CLI 도구 사용법을 알아봅니다.
---

# 🖥️ CLI 도구 가이드

`@codejam/cli`는 터미널에서 CodeJam 협업 코딩 룸을 빠르게 생성하고 관리할 수 있는 명령줄 인터페이스 도구입니다.

---

## 📦 설치

npm을 통해 전역으로 설치할 수 있습니다:

```bash
npm install -g @codejam/cli
```

설치가 완료되면 `codejam` 명령어를 사용할 수 있습니다.

---

## 🚀 명령어

### `codejam start` - 퀵 룸 생성

빠른 시작 모드로 룸을 생성합니다 (참여자 6명, 비밀번호 없음):

```bash
codejam start
```

**출력 결과:**

```
✔ Quick room created!

┌───────────┐
│ Room Code │
├───────────┤
│ ABCDEF    │
└───────────┘

⠹ Opening https://lets-codejam.vercel.app/room/ABCDEF...
✔ Browser opened!
```

**옵션:**

- `--no-browser` - 브라우저 자동 열기 비활성화

**예시:**

```bash
# 브라우저 열지 않고 URL만 출력
codejam start --no-browser
```

---

### `codejam start --custom` - 커스텀 룸 생성

참여자 수, 비밀번호 등을 설정한 커스텀 룸을 생성합니다:

```bash
codejam start --custom --max 30 --password secret123
```

**출력 결과:**

```
✔ Custom room created!

┌───────────┬──────────────────┬───────────────┐
│ Room Code │ Max Participants │ Room Password │
├───────────┼──────────────────┼───────────────┤
│ ABCDEF    │ 30               │ secret123     │
└───────────┴──────────────────┴───────────────┘

⠹ Opening https://lets-codejam.vercel.app/room/ABCDEF...
✔ Browser opened!
```

**옵션:**

- `-m, --max <숫자>` - 최대 참여자 수 (1-150, 기본값: 6)
- `-p, --password <비밀번호>` - 참여자용 룸 비밀번호
- `--host-password <비밀번호>` - 호스트 권한용 비밀번호
- `--no-browser` - 브라우저 자동 열기 비활성화

**사용 예시:**

```bash
# 최대 30명, 룸 비밀번호 설정
codejam start --custom --max 30 --password secret123

# 대규모 강의용 (최대 150명, 호스트 비밀번호)
codejam start --custom --max 150 --host-password teacher2026

# 모든 옵션 사용
codejam start --custom --max 50 --password room123 --host-password host456 --no-browser
```

---

### `codejam enter` - 기존 룸 입장

룸 코드로 기존 룸에 입장합니다:

```bash
codejam enter ABCDEF
```

**출력 결과:**

```
⠹ Checking room status...
✔ Room is available!

Room Code: ABCDEF

⠹ Opening https://lets-codejam.vercel.app/room/ABCDEF...
✔ Browser opened!
```

**옵션:**

- `--no-browser` - 브라우저 자동 열기 비활성화

**예시:**

```bash
# 브라우저 열지 않고 URL만 출력
codejam enter ABCDEF --no-browser
```

---

### `codejam health` - 서버 상태 확인

CodeJam 서버의 상태를 확인합니다:

```bash
codejam health
```

**출력 결과:**

```
⠹ Checking server health...
✔ All Systems Operational
We're fully operational and ready to code together!
```

---

### `codejam update` - CLI 업데이트

CLI를 최신 버전으로 업데이트합니다:

```bash
codejam update
```

**출력 결과:**

```
⠹ Checking for updates...
⠹ Updating from 1.0.0 to 1.0.1...
✔ Successfully updated to version 1.0.1!

Update complete. If the command does not work, try opening a new terminal tab.
```

---

## 🛠️ 문제 해결

### 명령어를 찾을 수 없음: codejam

설치 후 터미널을 재시작해주세요. 그래도 문제가 지속되면:

```bash
# 설치 확인
which codejam

# npm 전역 경로 확인
npm config get prefix
```

### 연결 오류

서버에 연결할 수 없는 경우 `codejam health` 명령어로 서버 상태를 확인하세요.

### 권한 오류

설치 시 권한 오류가 발생하면:

```bash
# npm 전역 디렉토리를 사용자 소유로 변경 (권장)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# 다시 설치
npm install -g @codejam/cli
```

---

## 💡 사용 팁

1. **빠른 협업**: 페어 프로그래밍이나 코드 리뷰 시 `codejam start`로 즉시 시작
2. **강의 진행**: 대규모 강의는 `codejam start --custom --max 150 --host-password`로 호스트 권한 보호
3. **자동화**: CI/CD 파이프라인에서 `--no-browser` 옵션으로 룸 URL 자동 생성

---

:::tip NPM 패키지
CLI 도구는 npm 패키지로 배포되며, 누구나 설치하여 사용할 수 있습니다.  
[npm 패키지 보기](https://www.npmjs.com/package/@codejam/cli)
:::
