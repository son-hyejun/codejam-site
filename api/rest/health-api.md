# 서버 상태 확인 API

서버 상태를 확인하는 Health Check API입니다.

---

## Health Check

서버가 정상적으로 작동 중인지 확인합니다.

### Endpoint

```
GET /health
```

### Response

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="schema" label="Response Schema" default>
    ```typescript
    {
      status: 'ok';
      timestamp: string; // ISO 8601 format
      uptime: number;    // 초 단위 가동 시간
    }
    ```
  </TabItem>
  <TabItem value="example" label="Example">
    ```json
    {
      "status": "ok",
      "timestamp": "2026-02-04T12:34:56.789Z",
      "uptime": 12345.678
    }
    ```
  </TabItem>
</Tabs>

### Status Codes

| Status Code | 설명              |
| ----------- | ----------------- |
| `200`       | 서버 정상 작동 중 |
| `500`       | 서버 내부 오류    |

---

## 사용 예시

### JavaScript/TypeScript

```typescript
const checkHealth = async () => {
  try {
    const response = await fetch('/health');
    const data = await response.json();

    if (data.status === 'ok') {
      console.log('Server is healthy');
      console.log(`Uptime: ${data.uptime} seconds`);
    }
  } catch (error) {
    console.error('Health check failed:', error);
  }
};
```

### cURL

```bash
curl -X GET http://localhost:3000/health
```

---

## 용도

- **모니터링**: 서버 상태를 주기적으로 확인
- **로드 밸런서**: Health Check 엔드포인트로 사용
- **CI/CD**: 배포 후 서버 정상 작동 확인
- **클라이언트**: 초기 연결 전 서버 가용성 확인
