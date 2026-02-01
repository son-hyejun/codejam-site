---
slug: crdt-realtime-collaboration
title: CRDT로 실시간 협업 충돌 해결하기
authors: son-hyejun
tags: [CRDT, Yjs, 실시간 협업, 동시성 제어, 기술]
---

# CRDT로 실시간 협업 충돌 해결하기

실시간 협업 에디터를 개발할 때 가장 어려운 문제 중 하나는 **여러 사용자가 동시에 같은 문서를 수정할 때 발생하는 충돌을 어떻게 처리할 것인가**입니다. CodeJam은 이 문제를 **CRDT(Conflict-free Replicated Data Type)** 기술로 해결했습니다.

<!--truncate-->

## 🤔 문제: 동시 편집 충돌

두 명의 사용자가 동일한 위치에 동시에 텍스트를 삽입하면 어떻게 될까요?

```
초기 상태: "hello world"

User A: "hello beautiful world" (position 6에 "beautiful " 삽입)
User B: "hello amazing world"   (position 6에 "amazing " 삽입)
```

전통적인 OT(Operational Transformation) 방식이나 단순 Lock 메커니즘으로는 다음과 같은 문제가 발생합니다:

1. **Last Write Wins**: 나중에 도착한 수정이 이전 수정을 덮어씀
2. **Lock 대기**: 한 사용자가 편집 중일 때 다른 사용자는 대기
3. **복잡한 변환 로직**: OT는 모든 연산 조합에 대한 변환 함수 필요

## ✨ 해결책: CRDT (Yjs)

CRDT는 **분산 시스템에서 동시 업데이트를 자동으로 병합**하는 데이터 구조입니다. CodeJam은 Yjs 라이브러리를 사용하여 이를 구현했습니다.

### CRDT의 핵심 원리

CRDT는 다음 세 가지 원칙을 보장합니다:

1. **Commutativity(교환법칙)**: 연산 순서와 무관하게 동일한 결과
2. **Associativity(결합법칙)**: 연산 그룹화와 무관하게 동일한 결과
3. **Idempotency(멱등성)**: 같은 연산을 여러 번 적용해도 결과가 같음

### Yjs의 충돌 해결 메커니즘

Yjs는 각 삽입 연산에 **Lamport Timestamp**와 **Client ID**를 부여합니다:

```typescript
interface Operation {
  clientId: string; // 클라이언트 고유 ID
  clock: number; // Lamport timestamp
  position: number; // 삽입 위치
  content: string; // 삽입 내용
}
```

충돌이 발생하면 다음 규칙으로 순서를 결정합니다:

```typescript
function compareOperations(op1: Operation, op2: Operation): number {
  if (op1.clock !== op2.clock) {
    return op1.clock - op2.clock; // 클럭 우선 (먼저 발생한 연산)
  }
  return op1.clientId.localeCompare(op2.clientId); // Client ID 사전순
}
```

따라서 앞의 예시는 다음과 같이 해결됩니다:

```
Client A: clock=125, clientId="alice"
Client B: clock=125, clientId="bob"

결과: "hello amazing beautiful world"
// "alice" < "bob" (사전순) → A의 삽입이 먼저 적용
```

## 🔄 CodeJam의 Yjs 통합

### 1. 클라이언트 측: CodeMirror와 Yjs 바인딩

```typescript
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';

// Y.Doc 생성 (문서 상태를 담는 컨테이너)
const ydoc = new Y.Doc();
const ytext = ydoc.getText('codemirror'); // 공유 텍스트 타입

// CodeMirror Extension 추가
const extensions = [
  javascript(), // 언어 모드
  yCollab(ytext, awareness, {
    undoManager: new Y.UndoManager(ytext),
  }),
];

// Yjs 업데이트를 서버로 전송
ydoc.on('update', (update: Uint8Array) => {
  socket.emit('UPDATE_FILE', {
    roomId,
    fileId,
    update: Array.from(update), // Uint8Array → Array
  });
});

// 서버로부터 업데이트 수신 및 적용
socket.on('UPDATE_FILE', (payload) => {
  Y.applyUpdate(ydoc, new Uint8Array(payload.update));
});
```

### 2. 서버 측: Redis를 활용한 영구 저장

서버는 Yjs 업데이트를 Redis에 저장하여 영속성을 보장합니다:

```typescript
class PersistenceDoc {
  private _clock: number; // 논리적 클럭
  private _updatesByteLength: number; // 누적 업데이트 크기

  // 업데이트 저장
  async pushUpdate(update: Buffer) {
    // Redis List에 업데이트 추가
    await this.redis.rpush(`updates:${this.roomId}`, update);

    // Pub/Sub으로 다른 서버 인스턴스에 알림
    await this.redis.publish(this.roomId, this._clock.toString());

    this._clock++;
    this._updatesByteLength += update.length;

    // 컴팩션 필요 여부 확인
    if (this.shouldCompact()) {
      await this.compact();
    }
  }

  // 컴팩션: 누적된 업데이트를 스냅샷으로 압축
  async compact() {
    const snapshot = Y.encodeStateAsUpdate(this.doc);

    // PostgreSQL에 스냅샷 저장
    await this.saveSnapshot(snapshot, this._clock);

    // Redis의 오래된 업데이트 삭제
    await this.redis.del(`updates:${this.roomId}`);
    await this.redis.set(`offset:${this.roomId}`, this._clock);
  }
}
```

### 3. 컴팩션 최적화

Yjs 업데이트가 누적되면 메모리와 대역폭을 낭비합니다. 다음 조건에서 컴팩션을 실행합니다:

```typescript
const MAX_UPDATES_COUNT = 500;   // 최대 업데이트 개수
const MAX_UPDATES_SIZE = 5 * 1024 * 1024;  // 최대 5MB

shouldCompact(): boolean {
  return (
    this._clock > MAX_UPDATES_COUNT ||
    this._updatesByteLength > MAX_UPDATES_SIZE
  );
}
```

**컴팩션 효과:**

- Redis 저장 공간 90% 감소
- 새 참가자 초기 로딩 시간 80% 단축

## 📊 성능 측정

실제 CodeJam 환경에서 측정한 성능 지표입니다:

| 지표                  | 측정값           |
| --------------------- | ---------------- |
| 평균 동기화 지연      | 50-100ms         |
| 10명 동시 편집        | 150ms 이하       |
| 컴팩션 전 스냅샷 크기 | 4.2MB            |
| 컴팩션 후 스냅샷 크기 | 0.4MB (90% 감소) |
| 새 참가자 초기 로딩   | 200ms → 40ms     |

## 🎯 CRDT vs OT 비교

| 항목             | CRDT (Yjs)         | OT (Google Docs)      |
| ---------------- | ------------------ | --------------------- |
| 충돌 해결        | 자동 (수학적 보장) | 변환 함수 필요        |
| 중앙 서버 의존성 | 낮음 (P2P 가능)    | 높음 (중앙 조정 필요) |
| 구현 복잡도      | 낮음               | 높음                  |
| 오프라인 지원    | 쉬움               | 어려움                |
| 메모리 사용량    | 높음               | 낮음                  |

CodeJam은 **구현 간편성**과 **확장성**을 위해 CRDT를 선택했습니다.

## 🚀 Awareness Protocol: 커서 동기화

CRDT는 영구적 데이터를 다루지만, 커서 위치나 선택 영역은 일시적 상태입니다. Yjs는 이를 위해 **Awareness Protocol**을 제공합니다:

```typescript
const awareness = new awarenessProtocol.Awareness(ydoc);

// 로컬 상태 설정
awareness.setLocalState({
  user: {
    name: 'Alice',
    color: '#FF5733',
  },
  cursor: {
    anchor: 10,
    head: 15,
  },
});

// 변경 사항 전송
awareness.on('update', ({ added, updated, removed }) => {
  const update = awarenessProtocol.encodeAwarenessUpdate(awareness, [
    ...added,
    ...updated,
    ...removed,
  ]);

  socket.emit('UPDATE_AWARENESS', {
    update: Array.from(update),
  });
});

// 업데이트 수신
socket.on('UPDATE_AWARENESS', ({ update }) => {
  awarenessProtocol.applyAwarenessUpdate(
    awareness,
    new Uint8Array(update),
    'server',
  );
});
```

## 💡 학습 포인트

### 1. 언제 CRDT를 사용해야 할까?

**사용 권장:**

- 실시간 협업 에디터
- 분산 데이터베이스
- 오프라인 우선 앱
- P2P 애플리케이션

**사용 비권장:**

- 엄격한 순서 보장 필요 (금융 거래)
- 메모리 제약이 심한 환경
- 단순 CRUD 애플리케이션

### 2. Yjs 외 다른 CRDT 라이브러리

- **Automerge**: JSON 친화적, Rich API
- **ShareDB**: OT도 지원, 범용성
- **Y-CRDT (Rust)**: 고성능 구현

CodeJam은 **생태계 성숙도**와 **CodeMirror 통합**을 고려해 Yjs를 선택했습니다.

## 🔍 더 알아보기

- [Yjs 공식 문서](https://docs.yjs.dev/)
- [CRDT 논문: A comprehensive study of CRDTs](https://crdt.tech/)
- [CodeMirror 6 + Yjs 통합 가이드](https://github.com/yjs/y-codemirror.next)

---

다음 글에서는 **CodeJam의 전체 아키텍처와 인프라 구성**을 다룰 예정입니다. 실시간 협업의 다음 단계, 확장성과 안정성을 어떻게 확보했는지 기대해주세요! 🚀
