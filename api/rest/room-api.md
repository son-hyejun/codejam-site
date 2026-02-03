# 방 관리 API

방(Room) 생성, 입장, 인증 관련 REST API 명세입니다.

:::info 기본 정보

- **Base URL**: `/api/rooms`
- **Rate Limit**: 방 생성 시 60초당 2회
  :::

---

## 1. 방 입장 가능 여부 확인

방에 입장할 수 있는지 확인합니다.

### Endpoint

```
GET /api/rooms/:roomCode/joinable
```

### Path Parameters

| Parameter  | Type     | Description |
| ---------- | -------- | ----------- |
| `roomCode` | `string` | 방 코드     |

### Response

```typescript
type JoinableStatus = 'joinable' | 'full' | 'not_found';
```

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="joinable" label="입장 가능" default>
    ```json
    "joinable"
    ```
  </TabItem>
  <TabItem value="full" label="인원 초과">
    ```json
    "full"
    ```
  </TabItem>
  <TabItem value="not_found" label="방 없음">
    ```json
    "not_found"
    ```
  </TabItem>
</Tabs>

---

## 2. 빠른 방 생성

임시 방을 빠르게 생성합니다 (비밀번호 없음).

### Endpoint

```
POST /api/rooms/quick
```

### Rate Limit

:::warning Rate Limit
60초당 2회
:::

### Request Body

```typescript
{
  ttl: number; // 방 유지 시간 (초)
}
```

### Response

<Tabs>
  <TabItem value="schema" label="Response Schema" default>
    ```typescript
    {
      roomCode: string; // 생성된 방 코드
    }
    ```
  </TabItem>
  <TabItem value="example" label="Example">
    ```json
    {
      "roomCode": "ABC123"
    }
    ```
  </TabItem>
</Tabs>

### Cookies

생성된 방에 대한 인증 쿠키가 자동으로 설정됩니다:

```
Set-Cookie: auth_{roomCode}=<token>; HttpOnly; SameSite=Strict
```

---

## 3. 커스텀 방 생성

비밀번호가 있는 커스텀 방을 생성합니다.

### Endpoint

```
POST /api/rooms/custom
```

### Rate Limit

:::warning Rate Limit
60초당 2회
:::

### Request Body

<Tabs>
  <TabItem value="schema" label="Request Schema" default>
    ```typescript
    {
      password: string | null; // 방 비밀번호 (선택)
      ttl: number;              // 방 유지 시간 (초)
    }
    ```
  </TabItem>
  <TabItem value="with-password" label="비밀번호 있음">
    ```json
    {
      "password": "mypassword123",
      "ttl": 3600
    }
    ```
  </TabItem>
  <TabItem value="without-password" label="비밀번호 없음">
    ```json
    {
      "password": null,
      "ttl": 3600
    }
    ```
  </TabItem>
</Tabs>

### Response

```json
{
  "roomCode": "CUSTOM01"
}
```

### Cookies

```
Set-Cookie: auth_{roomCode}=<token>; HttpOnly; SameSite=Strict
```

---

## 4. 방 입장

기존 방에 입장하며 새로운 참가자(Participant)를 생성합니다.

### Endpoint

```
POST /api/rooms/:roomCode/join
```

### Path Parameters

| Parameter  | Type     | Description    |
| ---------- | -------- | -------------- |
| `roomCode` | `string` | 입장할 방 코드 |

### Request Body

<Tabs>
  <TabItem value="schema" label="Request Schema" default>
    ```typescript
    {
      nickname: string;        // 닉네임 (최대 20자)
      password: string | null; // 방 비밀번호 (비공개 방인 경우 필수)
    }
    ```
  </TabItem>
  <TabItem value="public" label="공개 방 입장">
    ```json
    {
      "nickname": "Alice",
      "password": null
    }
    ```
  </TabItem>
  <TabItem value="private" label="비공개 방 입장">
    ```json
    {
      "nickname": "Bob",
      "password": "mypassword123"
    }
    ```
  </TabItem>
</Tabs>

### Response

<Tabs>
  <TabItem value="success" label="성공" default>
    ```typescript
    {
      success: true;
      token: string;    // WebSocket 연결에 사용할 토큰
      message: string;  // "방에 입장했습니다."
    }
    ```
    
    **Example:**
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "message": "방에 입장했습니다."
    }
    ```
  </TabItem>
  <TabItem value="error" label="실패">
    ```typescript
    {
      success: false;
      message: string;  // 오류 메시지
    }
    ```
    
    **오류 예시:**
    - `"방을 찾을 수 없습니다."`
    - `"방 인원이 가득 찼습니다."`
    - `"비밀번호가 일치하지 않습니다."`
  </TabItem>
</Tabs>

### Cookies

```
Set-Cookie: auth_{roomCode}=<token>; HttpOnly; SameSite=Strict
```

---

## 5. 방 비밀번호 검증

비밀번호가 설정된 방에 입장하기 전 비밀번호를 검증합니다.

### Endpoint

```
POST /api/rooms/:roomCode/verify
```

### Path Parameters

| Parameter  | Type     | Description    |
| ---------- | -------- | -------------- |
| `roomCode` | `string` | 검증할 방 코드 |

### Request Body

```typescript
{
  password: string; // 검증할 비밀번호
}
```

### Response

<Tabs>
  <TabItem value="success" label="비밀번호 일치" default>
    ```json
    {
      "success": true,
      "message": "비밀번호가 일치합니다."
    }
    ```
  </TabItem>
  <TabItem value="failure" label="비밀번호 불일치">
    ```json
    {
      "success": false,
      "message": "비밀번호가 일치하지 않습니다."
    }
    ```
  </TabItem>
</Tabs>

---

## 6. 인증 상태 확인

현재 사용자가 해당 방에 대한 인증을 가지고 있는지 확인합니다.

### Endpoint

```
GET /api/rooms/:roomCode/auth-status
```

### Path Parameters

| Parameter  | Type     | Description    |
| ---------- | -------- | -------------- |
| `roomCode` | `string` | 확인할 방 코드 |

### Headers

```
Cookie: auth_{roomCode}=<token>
```

### Response

<Tabs>
  <TabItem value="authenticated" label="인증됨" default>
    ```json
    {
      "authenticated": true
    }
    ```
  </TabItem>
  <TabItem value="not-authenticated" label="인증 안 됨">
    ```json
    {
      "authenticated": false
    }
    ```
  </TabItem>
</Tabs>

---

## 오류 응답

모든 API는 오류 발생 시 다음 형식으로 응답합니다:

```typescript
{
  statusCode: number;
  message: string;
  error?: string;
}
```

### 일반 오류 코드

| Status Code | 설명                                   |
| ----------- | -------------------------------------- |
| `400`       | 잘못된 요청 (Bad Request)              |
| `401`       | 인증 실패 (Unauthorized)               |
| `404`       | 방을 찾을 수 없음 (Not Found)          |
| `409`       | 인원 초과 (Conflict)                   |
| `429`       | Rate Limit 초과 (Too Many Requests)    |
| `500`       | 서버 내부 오류 (Internal Server Error) |

---

## 사용 예시

### 방 생성 및 입장 플로우

```typescript
// 1. 빠른 방 생성
const { roomCode } = await fetch('/api/rooms/quick', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ttl: 3600 }),
}).then((res) => res.json());

// 2. 다른 사용자가 방 입장 가능 여부 확인
const status = await fetch(`/api/rooms/${roomCode}/joinable`).then((res) =>
  res.json(),
);

if (status === 'joinable') {
  // 3. 방 입장
  const { token } = await fetch(`/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname: 'Alice',
      password: null,
    }),
  }).then((res) => res.json());

  // 4. WebSocket 연결 (token 사용)
  socket.emit('room:join', { roomCode, token });
}
```

### 비밀번호가 있는 방 생성 및 입장

```typescript
// 1. 커스텀 방 생성 (비밀번호 포함)
const { roomCode } = await fetch('/api/rooms/custom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'mySecretPassword',
    ttl: 7200,
  }),
}).then((res) => res.json());

// 2. 다른 사용자가 비밀번호 검증
const { success } = await fetch(`/api/rooms/${roomCode}/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'mySecretPassword' }),
}).then((res) => res.json());

if (success) {
  // 3. 방 입장
  const { token } = await fetch(`/api/rooms/${roomCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname: 'Bob',
      password: 'mySecretPassword',
    }),
  }).then((res) => res.json());
}
```
