# 스크립트 매뉴얼 (Scripts Manual)

Node.js 스크립트 작성 및 수정 시 반드시 따라야 하는 규칙입니다.

## 주요 스크립트

| 스크립트 | 역할 |
|---------|------|
| `scripts/classify.js` | 설교 텍스트를 4요소(생각/믿음/꿈/말)로 분류 |
| `scripts/generate-curriculum.js` | 분류된 설교 기반 성경공부 교재 생성 |
| `scripts/build-curriculum-v2.js` | 교재 생성 v2 (개선된 구조) |
| `scripts/generate-lesson.js` | 개별 교안 생성 |
| `scripts/export-lessons-docx.js` | 교안을 DOCX 파일로 출력 |

## 규칙

### Rate Limiting (API 호출 제한)
- Claude API 호출 간 **최소 2초 간격**을 유지한다.
- 배치 처리 시 **한 배치당 최대 5개** 요청으로 제한한다.
- 배치 간에도 2초 대기를 적용한다.
- 구현 패턴:
  ```javascript
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const BATCH_SIZE = 5;
  const API_DELAY_MS = 2000;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      await processItem(item);
      await delay(API_DELAY_MS);
    }
  }
  ```

### 에러 처리 (Error Handling)
- 모든 API 호출은 반드시 `try-catch`로 감싼다.
- API 에러 발생 시 **실패 항목을 로그 파일에 기록**하고, 나머지 항목은 계속 처리한다.
- 중단된 작업을 **이어서 재개**할 수 있도록, 이미 처리된 항목을 건너뛰는 로직을 포함한다.
- 재시도 로직: 최대 3회, 지수 백오프(2초 → 4초 → 8초) 적용.
- 에러 로그 형식:
  ```javascript
  console.error(`[ERROR] ${filename}: ${error.message}`);
  // 실패 목록 파일에 기록
  fs.appendFileSync('errors.log', `${new Date().toISOString()} | ${filename} | ${error.message}\n`);
  ```

### 분류 (Classification)
- 4요소 매핑은 항상 다음 구조를 따른다:
  - **생각** (Thought) — 사고의 변화, 관점 전환
  - **믿음** (Faith) — 신앙적 확신, 하나님에 대한 신뢰
  - **꿈** (Dream) — 비전, 목표, 미래 지향
  - **말** (Word) — 고백, 선포, 말의 능력
- 분류 결과는 JSON 형식으로 `classified/` 디렉토리에 저장한다.
- 각 설교에 대해 주요 요소와 보조 요소를 구분하여 기록한다.

### 파일 I/O
- 설교 텍스트: `sermon/` 디렉토리에서 읽는다 (텍스트 파일).
- 분류 결과: `classified/` 디렉토리에 JSON으로 저장한다.
- 교재 데이터: `curriculum/` 디렉토리에 저장한다.
- 최종 출력: `output/` 디렉토리에 DOCX로 저장한다.
- 파일 인코딩은 항상 **UTF-8**을 사용한다.
- JSON 출력 시 `JSON.stringify(data, null, 2)`로 가독성을 확보한다.

### ES 모듈 규칙
- `import/export` 구문을 사용한다 (`require` 사용 금지).
- `package.json`에 `"type": "module"`이 설정되어 있다.
- 파일 경로에는 `import.meta.url`과 `fileURLToPath`를 사용한다.
  ```javascript
  import { fileURLToPath } from 'url';
  import { dirname, join } from 'path';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  ```

## 안티패턴 (하지 말 것)

- API 키를 코드에 하드코딩하지 않는다. 반드시 `process.env.ANTHROPIC_API_KEY`를 사용한다.
- API 실패 시 무한 재시도 루프를 만들지 않는다 (최대 3회 제한).
- `classified/` 디렉토리의 기존 결과를 경고 없이 덮어쓰지 않는다.
- `fs.readFileSync`/`fs.writeFileSync` 대신 가능하면 `fs.promises`의 비동기 메서드를 사용한다.
- 전체 설교 목록을 한 번에 메모리에 로드하지 않는다 (순차 처리 권장).
