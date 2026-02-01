---
slug: codejam-system-architecture
title: CodeJam 시스템 아키텍처 Deep Dive
authors: son-hyejun
tags: [아키텍처, NestJS, Redis, PostgreSQL, 인프라, 기술]
---

# CodeJam 시스템 아키텍처 Deep Dive

CodeJam은 **Zero-Config, Login-Free**라는 철학 아래 설계된 실시간 협업 플랫폼입니다. 이 글에서는 CodeJam의 전체 시스템 아키텍처와 각 컴포넌트의 역할, 그리고 설계 결정의 이유를 상세히 설명합니다.

<!--truncate-->

## 🏗️ 전체 시스템 구조

CodeJam은 크게 4개의 레이어로 구성됩니다:

```
┌─────────────────────────────────────────┐
│         Client Layer                    │
│  React 19 + Vite + CodeMirror 6        │
└─────────────────────────────────────────┘
                    ↕️ HTTPS/WSS
┌─────────────────────────────────────────┐
│      Network Layer (Caddy)             │
│  Reverse Proxy + Auto HTTPS            │
└─────────────────────────────────────────┘
                    ↕️
┌─────────────────────────────────────────┐
│    Application Layer (NestJS)          │
│  Socket.IO Gateway + Business Logic    │
└─────────────────────────────────────────┘
                    ↕️
┌─────────────────────────────────────────┐
│         Data Layer                      │
│  PostgreSQL + Redis + Piston           │
└─────────────────────────────────────────┘
```

## 🔧 기술 스택 선택 이유

### Frontend: React 19 + Vite

**선택 이유:**

- **React 19**: 최신 Concurrent Features로 부드러운 UX
- **Vite**: 빠른 HMR로 개발 생산성 극대화
- **TypeScript**: 타입 안정성으로 런타임 에러 방지

**대안과 비교:**

- ~~Next.js~~: SSR 불필요 (CSR만으로 충분)
- ~~Vue~~: React 생태계 성숙도 및 팀 경험

### Editor: CodeMirror 6

**선택 이유:**

- **가벼움**: Monaco Editor 대비 10배 작은 번들 사이즈
- **확장성**: Extension 시스템으로 Yjs 통합 용이
- **모바일 최적화**: 터치 인터랙션 지원

**비교:**

| 항목         | CodeMirror 6 | Monaco Editor | Ace Editor |
| ------------ | ------------ | ------------- | ---------- |
| 번들 크기    | ~200KB       | ~2MB          | ~500KB     |
| Yjs 통합     | ✅ 공식 지원 | ❌ 없음       | ⚠️ 비공식  |
| 모바일       | ✅ 우수      | ⚠️ 보통       | ❌ 미흡    |
| 커스터마이징 | ✅ 우수      | ⚠️ 제한적     | ✅ 우수    |

### Backend: NestJS

**선택 이유:**

- **TypeScript 네이티브**: Frontend와 타입 공유 용이
- **의존성 주입**: 테스트 가능한 깔끔한 아키텍처
- **WebSocket 지원**: Socket.IO 통합 간편
- **Enterprise급**: Interceptor, Guard, Pipe 등 완성도 높은 기능

**대안과 비교:**

- ~~Express~~: 구조화되지 않아 대규모 프로젝트 관리 어려움
- ~~Fastify~~: 성능은 우수하나 생태계 부족

### Database: PostgreSQL + Redis

#### PostgreSQL

**용도:** 영구 데이터 저장 (Room, Participant, Snapshot)

**선택 이유:**

- ACID 트랜잭션 보장
- JSONB 타입으로 유연한 스키마
- TypeORM과 완벽한 호환

#### Redis

**용도:**

- Yjs 업데이트 임시 저장 (List)

**선택 이유:**

- 인메모리 데이터베이스로 초저지연 (< 1ms)
- Pub/Sub으로 다중 서버 간 통신
- List, String 등 다양한 자료구조 지원

**아키텍처:**

```
┌──────────────┐
│  Client A    │──┐
└──────────────┘  │
                  ↓
┌──────────────┐  ┌───────────────┐
│  NestJS      │→ │ Redis Pub/Sub │
│  Instance 1  │← └───────────────┘
└──────────────┘         ↕️
                  ┌───────────────┐
┌──────────────┐  │ Redis List    │
│  NestJS      │← │ (Updates)     │
│  Instance 2  │→ └───────────────┘
└──────────────┘
       ↑
       │
┌──────────────┐
│  Client B    │
└──────────────┘
```

### Code Execution: Piston

**선택 이유:**

- Docker 기반 샌드박스로 안전성 보장
- 다중 언어 지원 (JavaScript, Python, C++, Java 등)
- RESTful API로 통합 간편

**대안과 비교:**

- ~~Judge0~~: 유료 플랜 필요
- ~~자체 구현~~: 보안 위험 높고 유지보수 부담

## 📡 WebSocket 통신 구조

CodeJam은 Socket.IO를 사용하여 양방향 실시간 통신을 구현합니다.

### 주요 이벤트 흐름

#### 1. 방 입장 (JOIN_ROOM)

```typescript
// Client → Server
socket.emit('JOIN_ROOM', {
  roomCode: 'ABCDEF',
  nickname: 'Alice',
  password: '1234' // 선택사항
});

// Server 처리
@SubscribeMessage('JOIN_ROOM')
async handleJoinRoom(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: JoinRoomPayload
) {
  // 1. 인증 및 참가자 생성
  const participant = await this.authService.authenticate(payload);

  // 2. Socket 메타데이터 저장
  client.data = { roomId, participantId, role };

  // 3. Socket.IO Room 입장
  await client.join(roomId);

  // 4. Y.Doc 및 Awareness 전송
  const { doc, awareness } = await this.yRedisService.getDocument(roomId);
  client.emit('WELCOME', { doc, awareness });

  // 5. 다른 참가자들에게 알림
  this.server.to(roomId).emit('PT_JOINED', participant);
}
```

#### 2. 파일 업데이트 (UPDATE_FILE)

```typescript
// Client → Server
ydoc.on('update', (update: Uint8Array) => {
  socket.emit('UPDATE_FILE', {
    roomId,
    fileId,
    update: Array.from(update)
  });
});

// Server 처리
@SubscribeMessage('UPDATE_FILE')
async handleUpdateFile(
  @ConnectedSocket() client: Socket,
  @MessageBody() payload: UpdateFilePayload
) {
  const { roomId, fileId, update } = payload;

  // 1. Y.Doc에 업데이트 적용
  const doc = await this.yRedisService.getDocument(roomId);
  Y.applyUpdate(doc.ydoc, new Uint8Array(update));

  // 2. Redis에 저장
  await doc.pushUpdate(Buffer.from(update));

  // 3. 다른 참가자들에게 브로드캐스트
  client.to(roomId).emit('UPDATE_FILE', payload);
}
```

## 🔐 권한 관리 시스템

### 역할 계층

```typescript
enum ParticipantRole {
  HOST = 'HOST', // 방장 (1명)
  EDITOR = 'EDITOR', // 편집자 (최대 6명)
  VIEWER = 'VIEWER', // 관전자 (무제한)
}
```

### NestJS Guard를 활용한 권한 검증

```typescript
// HostGuard: Host만 실행 가능
@Injectable()
export class HostGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    return client.data?.role === ParticipantRole.HOST;
  }
}

// PermissionGuard: Editor 이상 권한 필요
@Injectable()
export class PermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    return [ParticipantRole.HOST, ParticipantRole.EDITOR]
      .includes(client.data?.role);
  }
}

// 사용 예시
@SubscribeMessage('DESTROY_ROOM')
@UseGuards(HostGuard)  // Host만 방 삭제 가능
async handleDestroyRoom() { /* ... */ }

@SubscribeMessage('EXECUTE_CODE')
@UseGuards(PermissionGuard)  // Editor 이상만 코드 실행
async handleExecuteCode() { /* ... */ }
```

### 편집자 수 제한

```typescript
const MAX_EDITORS = 6;

async promoteToEditor(participantId: string): Promise<void> {
  const editorCount = await this.participantRepository.count({
    where: { role: ParticipantRole.EDITOR }
  });

  if (editorCount >= MAX_EDITORS) {
    throw new WsException('EDITOR_LIMIT_EXCEEDED');
  }

  await this.participantRepository.update(participantId, {
    role: ParticipantRole.EDITOR
  });
}
```

## 🚀 성능 최적화

### 1. Yjs 컴팩션

누적된 업데이트를 압축하여 메모리 및 네트워크 사용량을 줄입니다:

```typescript
async compact() {
  // 현재 Y.Doc 상태를 스냅샷으로 인코딩
  const snapshot = Y.encodeStateAsUpdate(this.doc);

  // PostgreSQL에 저장
  await this.documentRepository.save({
    roomId: this.roomId,
    snapshot,
    clock: this._clock
  });

  // Redis의 오래된 업데이트 삭제
  await this.redis.del(`updates:${this.roomId}`);
  await this.redis.set(`offset:${this.roomId}`, this._clock);
}
```

**효과:**

- Redis 저장 공간 90% 감소
- 새 참가자 초기 로딩 시간 80% 단축

### 2. Rate Limiting (Throttling)

코드 실행 남용 방지:

```typescript
@Throttle({ default: { ttl: 60000, limit: 10 } })  // 1분에 10회
@SubscribeMessage('EXECUTE_CODE')
@UseGuards(WsThrottlerGuard, PermissionGuard)
async handleExecuteCode() { /* ... */ }
```

### 3. 코드 스플리팅 (Vite)

```typescript
// React Router lazy loading
const RoomPage = lazy(() => import('./pages/room/RoomPage'));

<Suspense fallback={<LoadingSpinner />}>
  <RoomPage />
</Suspense>
```

**효과:**

- 초기 번들 크기 60% 감소 (1.2MB → 480KB)
- First Contentful Paint 40% 개선

## 🐳 인프라 및 배포

### Docker Compose 구성

```yaml
# docker-compose.server.yml
services:
  server:
    image: codejam/server:prod
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 3s
      retries: 3

  redis:
    image: redis:alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  piston:
    image: ghcr.io/engineer-man/piston
    ports:
      - '2000:2000'
```

### Caddy 리버스 프록시

```caddyfile
production.codejam.kro.kr {
    reverse_proxy localhost:3000

    # WebSocket 지원
    @websocket {
        header Connection *Upgrade*
        header Upgrade websocket
    }
    reverse_proxy @websocket localhost:3000
}
```

**Caddy 선택 이유:**

- 자동 HTTPS (Let's Encrypt / ZeroSSL)
- 설정 파일 간결 (Nginx 대비)
- HTTP/2, HTTP/3 자동 지원

### 배포 파이프라인

```
GitHub Push → GitHub Actions
  ↓
Docker Image Build
  ↓
Naver Cloud Registry Push
  ↓
Server Pull & Deploy
  ↓
Health Check
```

## 🔒 보안

### 1. WebSocket 인증

```typescript
async authenticate(token: string | null, payload: JoinRoomPayload) {
  if (token) {
    const decoded = await this.jwtService.verify(token);
    return await this.findParticipant(decoded.sub);
  }

  // 신규 참가자 생성 (익명)
  return await this.createParticipant(payload);
}
```

### 2. CORS 설정

```typescript
app.enableCors({
  origin:
    process.env.NODE_ENV === 'production'
      ? ['https://lets-codejam.vercel.app']
      : true,
  credentials: true,
});
```

---

CodeJam의 아키텍처는 **단순함**과 **확장성**의 균형을 추구합니다. 복잡한 기술보다는 검증된 기술을 조합하여 안정적인 서비스를 제공하는 데 집중했습니다.
