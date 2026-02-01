---
slug: monorepo-turborepo-structure
title: Turborepo 기반 모노레포 구조로 개발 효율성 극대화하기
authors: son-hyejun
tags: [아키텍처, Turborepo, Monorepo, pnpm, 개발환경]
---

# Turborepo 기반 모노레포 구조로 개발 효율성 극대화하기

CodeJam은 **Turborepo**와 **pnpm workspace**를 활용한 모노레포 구조로 구성되어 있습니다. 이 글에서는 왜 모노레포를 선택했는지, 그리고 Turborepo가 어떻게 빌드 성능을 극대화하는지 알아봅니다.

<!--truncate-->

## 🏗️ 프로젝트 구조

CodeJam의 전체 구조는 다음과 같습니다:

```
web08-JAMstack/
├── apps/
│   ├── client/          # React 19 프론트엔드
│   ├── server/          # NestJS 백엔드
│   ├── piston/          # 코드 실행 엔진
│   └── storybook/       # UI 컴포넌트 문서
├── packages/
│   ├── common/          # 공유 타입 및 상수
│   ├── ui/              # 공유 UI 컴포넌트
│   └── cli/             # CLI 도구 (@codejam/cli)
├── pnpm-workspace.yaml  # pnpm workspace 설정
└── turbo.json           # Turborepo 설정
```

## 🤔 왜 모노레포인가?

### 1. 타입 공유의 용이성

Client와 Server가 같은 타입 정의를 사용하면 API 통신 시 타입 안정성이 보장됩니다:

```typescript
// packages/common/src/types/index.ts
export interface Participant {
  id: string;
  nickname: string;
  role: 'host' | 'editor' | 'viewer';
  color: string;
}

// apps/server/src/modules/room/room.service.ts
import { Participant } from '@codejam/common';

// apps/client/src/entities/participant/model.ts
import { Participant } from '@codejam/common';
```

### 2. 단일 의존성 관리

모든 패키지의 의존성이 루트 `package.json`과 `pnpm-lock.yaml`에서 중앙 관리됩니다:

- **버전 충돌 방지**: 여러 앱에서 같은 라이브러리의 다른 버전 사용 불가
- **디스크 공간 절약**: pnpm의 content-addressable storage로 중복 패키지 제거
- **일관된 환경**: 모든 개발자가 동일한 의존성 버전 사용

### 3. 원자적 커밋 (Atomic Commits)

하나의 기능 구현을 위해 여러 패키지를 수정해도 단일 커밋으로 관리 가능합니다:

```bash
# 예: Participant 타입 변경
git commit -m "feat: Add avatarUrl to Participant type

- Update type definition in @codejam/common
- Update server entity in apps/server
- Update client UI in apps/client"
```

## ⚡ Turborepo의 핵심 기능

### 1. 증분 빌드 (Incremental Builds)

변경된 패키지만 재빌드합니다:

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**동작 방식:**

1. `common` 패키지 수정
2. Turborepo가 해시 변경 감지
3. `common` 재빌드
4. `common`에 의존하는 `client`, `server`만 재빌드
5. `storybook`은 캐시에서 복원 (변경 없음)

### 2. 원격 캐싱 (Remote Caching)

팀원 간 빌드 결과를 공유하여 중복 빌드를 방지합니다:

```bash
# 팀원 A가 빌드
pnpm build  # 3분 소요

# GitHub Actions에 캐시 업로드

# 팀원 B가 동일 코드 빌드
pnpm build  # 5초 소요 (캐시 복원)
```

### 3. 병렬 실행 (Parallel Execution)

의존성 그래프를 기반으로 최적의 병렬 실행 계획을 수립합니다:

```
시간 →
┌─────────────┐
│   common    │ (빌드)
└─────────────┘
        │
    ┌───┴───┐
    ▼       ▼
┌────────┐ ┌────────┐
│ client │ │ server │ (병렬 빌드)
└────────┘ └────────┘
    │       │
    └───┬───┘
        ▼
    ┌────────┐
    │  cli   │ (빌드)
    └────────┘
```

## 📦 pnpm Workspace 활용

### 패키지 간 의존성 설정

```json
// apps/client/package.json
{
  "name": "@codejam/client",
  "dependencies": {
    "@codejam/common": "workspace:*",
    "@codejam/ui": "workspace:*"
  }
}
```

`workspace:*` 프로토콜을 사용하면:

- 로컬 패키지를 symlink로 연결
- 변경사항이 즉시 반영 (재설치 불필요)
- 배포 시 실제 버전 번호로 자동 치환

### 선택적 스크립트 실행

```bash
# 모든 앱 빌드
pnpm -r build

# client만 실행
pnpm --filter @codejam/client dev

# server와 의존성 함께 실행
pnpm --filter @codejam/server... dev
```

## 🚀 실전 개발 워크플로우

### 1. 로컬 개발

```bash
# 전체 개발 서버 실행
pnpm dev

# 결과:
# - apps/client → http://localhost:5173
# - apps/server → http://localhost:3000
# - apps/storybook → http://localhost:6006
```

### 2. 타입 변경 시나리오

```typescript
// 1. packages/common/src/types/index.ts 수정
export interface Participant {
  id: string;
  nickname: string;
  role: 'host' | 'editor' | 'viewer';
  color: string;
  avatarUrl?: string;  // 추가
}

// 2. packages/common 재빌드
pnpm --filter @codejam/common build

// 3. client, server에 자동 반영 (symlink)
// 4. TypeScript가 타입 에러 감지
// 5. 각 앱에서 avatarUrl 처리 로직 구현
```

### 3. CI/CD 파이프라인

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          cache: 'pnpm'

      # Turborepo 원격 캐시 활성화
      - run: pnpm turbo build --token=${{ secrets.TURBO_TOKEN }}
      - run: pnpm turbo test --token=${{ secrets.TURBO_TOKEN }}
```

## 📊 성능 비교

| 시나리오                  | 기존 (멀티레포) | 모노레포 + Turborepo |
| ------------------------- | --------------- | -------------------- |
| **초기 빌드**             | 5분             | 3분 (병렬화)         |
| **캐시 빌드**             | 5분             | 10초 (캐시 복원)     |
| **부분 변경 후 빌드**     | 5분             | 1분 (증분 빌드)      |
| **팀원 빌드 (동일 코드)** | 5분             | 5초 (원격 캐시)      |

## 🎯 모노레포의 트레이드오프

### 장점

✅ 타입 공유로 API 안정성 향상  
✅ 단일 저장소로 코드 검색 용이  
✅ 원자적 커밋으로 일관성 유지  
✅ Turborepo 캐싱으로 빌드 시간 단축

### 단점

⚠️ 초기 설정 복잡도 증가  
⚠️ 리포지토리 크기 증가  
⚠️ CI/CD 파이프라인 설계 필요  
⚠️ 팀원 간 학습 곡선 존재

## 🔧 실용적인 팁

### 1. 선택적 빌드로 시간 절약

```bash
# 변경된 패키지만 빌드
pnpm turbo build --filter=[HEAD^1]

# 특정 앱과 의존성만 빌드
pnpm turbo build --filter=@codejam/client...
```

### 2. 로그 레벨 조정

```bash
# 상세 로그 (디버깅)
pnpm turbo build --log-order=stream

# 요약만 출력 (CI)
pnpm turbo build --summarize
```

### 3. 개발 환경 최적화

```json
// turbo.json
{
  "pipeline": {
    "dev": {
      "cache": false, // 개발 모드는 캐싱 안 함
      "persistent": true // 프로세스 유지
    },
    "build": {
      "outputs": ["dist/**"], // 캐싱 대상 명시
      "dependsOn": ["^build"] // 의존성 먼저 빌드
    }
  }
}
```

## 🎓 결론

Turborepo와 pnpm workspace를 활용한 모노레포 구조는 초기 설정 비용이 있지만, 장기적으로 다음과 같은 이점을 제공합니다:

1. **개발 속도 향상**: 증분 빌드와 원격 캐싱으로 빌드 시간 90% 감소
2. **타입 안정성**: 공유 타입으로 런타임 에러 사전 방지
3. **일관성 유지**: 단일 저장소로 코드 스타일과 의존성 통일
4. **협업 효율성**: 원자적 커밋과 코드 검색 용이성으로 팀 생산성 향상

CodeJam과 같은 실시간 협업 서비스에서 모노레포는 필수적인 선택이었으며, Turborepo는 이를 실용적으로 만들어주는 핵심 도구입니다.

---

**참고 자료:**

- [Turborepo 공식 문서](https://turbo.build/repo/docs)
- [pnpm Workspace 가이드](https://pnpm.io/workspaces)
- [모노레포 패턴 비교](https://monorepo.tools/)
