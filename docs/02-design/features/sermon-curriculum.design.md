# Design: 4차원의 영성 성경공부 교재 시스템

> **Feature**: sermon-curriculum
> **Phase**: Design
> **Created**: 2026-03-02
> **Status**: In Progress
> **참조 Plan**: [sermon-curriculum.plan.md](../../01-plan/features/sermon-curriculum.plan.md)

---

## 1. 시스템 아키텍처 개요

```
sermon/ (799개 파일)
  ├── [배치 파일] 1981_1985_sermon.txt ~ 2006_2010_sermon.txt  (6개, EUC-KR)
  └── [개별 파일] 2012-06-03.txt ~ 2024-xx-xx.txt             (791개, UTF-8)
         ↓
  scripts/classify.js
  (Claude API 분류)
         ↓
  classified/
  ├── 생각/*.json
  ├── 믿음/*.json
  ├── 꿈/*.json
  └── 말/*.json
         ↓
  scripts/generate-curriculum.js
  (Claude API 교재 생성)
         ↓
  curriculum/
  ├── 생각_12주_교재.md
  ├── 믿음_12주_교재.md
  ├── 꿈_12주_교재.md
  └── 말_12주_교재.md
```

---

## 2. 설교 파일 구조 분석

### 2.1 개별 파일 형식 (2012~, UTF-8, 791개)

```
{날짜}\t
{제목} [{시리즈번호}]
{성경 본문 참조}

"{인용 성경 구절}"
{성경 구절 레퍼런스}

{요약 키워드라인}

{본문 내용...}
```

**예시 파싱 대상**:
- Line 1: 날짜 (`2012-06-03`)
- Line 2: 제목 (`동굴과 터널 [15]`)
- Line 3: 본문 (`시 23 : 4 - 6`)
- 이후: 본문 내용

### 2.2 배치 파일 형식 (1981~2010, EUC-KR, 6개)

- 인코딩: EUC-KR → UTF-8 변환 필요
- 내용: 여러 설교가 연속으로 기록됨
- MVP 범위: **제외** (인코딩 변환 복잡도로 2단계에서 처리)

---

## 3. 데이터 모델

### 3.1 분류 결과 JSON 스키마

**파일 경로**: `classified/{요소}/{날짜}_{제목슬러그}.json`

```json
{
  "id": "2012-06-03_동굴과터널",
  "date": "2012-06-03",
  "title": "동굴과 터널",
  "seriesNumber": 15,
  "scriptureRef": "시 23:4-6",
  "primaryElement": "믿음",
  "secondaryElements": ["꿈"],
  "relevanceScore": 0.92,
  "summary": "사망의 음침한 골짜기도 예수 그리스도 안에서 출구 있는 터널이 됨. 불신앙이 동굴을 만들었으나 믿음이 그것을 터널로 변화시킴.",
  "keyVerses": ["시 23:4", "요 14:6"],
  "applicationKeywords": ["믿음", "터널", "고난", "출구", "예수"],
  "weekSuggestion": "5-8",
  "sourceFile": "2012-06-03.txt"
}
```

**필드 설명**:

| 필드 | 타입 | 설명 |
|------|------|------|
| `primaryElement` | string | 주요 4차원 요소 (`생각`/`믿음`/`꿈`/`말`) |
| `secondaryElements` | string[] | 보조 요소 (0~3개) |
| `relevanceScore` | float | 주요 요소와의 관련도 (0.0~1.0) |
| `summary` | string | 설교 요약 (200자 이내) |
| `keyVerses` | string[] | 핵심 성경 구절 (2~5개) |
| `applicationKeywords` | string[] | 적용점 키워드 (3~7개) |
| `weekSuggestion` | string | 교재 배치 권장 주차 (`1`/`2-4`/`5-8`/`9-11`/`12`) |

### 3.2 분류 통계 파일

**파일 경로**: `classified/stats.json`

```json
{
  "totalProcessed": 791,
  "lastUpdated": "2026-03-02T10:00:00Z",
  "byElement": {
    "생각": 187,
    "믿음": 223,
    "꿈": 201,
    "말": 180
  },
  "errors": []
}
```

---

## 4. 스크립트 설계

### 4.1 `scripts/classify.js`

```
실행: node scripts/classify.js [--element 생각] [--limit 10] [--resume]
```

**처리 흐름**:

```
1. sermon/ 디렉토리 스캔
   └── 날짜 형식 파일만 필터 (배치 파일 제외)

2. 이미 처리된 파일 확인
   └── classified/stats.json 읽기 → skip 처리

3. 배치 처리 (10개씩)
   ├── 파일 읽기 (UTF-8)
   ├── 헤더 파싱 (날짜, 제목, 본문 참조)
   └── Claude API 호출 (분류 프롬프트)

4. 결과 저장
   ├── classified/{요소}/{id}.json 저장
   └── stats.json 업데이트

5. 오류 처리
   ├── Rate limit: 60초 대기 후 재시도
   └── 오류 파일: errors/ 폴더에 기록
```

**주요 함수**:

```javascript
parseSermonFile(filePath)        // 파일 파싱 → 구조화 객체
classifyWithClaude(sermon)       // Claude API 분류 호출
saveClassifiedResult(result)     // JSON 파일 저장
processInBatches(files, size)    // 배치 처리 (API rate limit 고려)
```

### 4.2 `scripts/generate-curriculum.js`

```
실행: node scripts/generate-curriculum.js --element 생각
```

**처리 흐름**:

```
1. classified/{요소}/*.json 로드
   └── relevanceScore >= 0.7 필터

2. 주차별 설교 선정
   ├── weekSuggestion 기준 그룹화
   ├── 각 그룹에서 상위 3~5편 선정 (relevanceScore 기준)
   └── 12주 배치 완성

3. 주차별 교재 생성 (Claude API)
   └── 각 주차: 선정 설교 내용 + 교재 구조 프롬프트

4. 전체 교재 조합
   └── curriculum/{요소}_12주_교재.md 저장
```

---

## 5. AI 프롬프트 설계

### 5.1 분류 프롬프트 (`scripts/prompts/classify-prompt.md`)

**System Prompt**:
```
당신은 조용기 목사님의 설교를 "4차원의 영성" 원리에 따라 분류하는 신학 전문가입니다.

4차원의 영성 4가지 요소:
- 생각(Thinking): 마음의 변화, 긍정적 사고, 마음 새로워짐 (롬 12:2, 빌 4:8)
- 믿음(Faith): 하나님을 향한 신뢰, 믿음의 실체 (히 11:1, 막 11:24)
- 꿈(Dream/Vision): 비전, 목적, 소망, 하나님의 계획 (잠 29:18, 요엘 2:28)
- 말(Word/Speech): 믿음의 고백, 선포, 말의 능력 (잠 18:21, 막 11:23)

분류 기준:
- 설교의 핵심 메시지가 어떤 요소를 가장 강조하는가?
- 성경 본문이 어떤 4차원 요소와 연결되는가?
- 실제 적용에서 어떤 요소를 훈련시키는가?
```

**User Prompt 템플릿**:
```
다음 설교를 분류해주세요.

제목: {title}
본문: {scriptureRef}
내용: {content}

다음 JSON 형식으로만 응답하세요:
{
  "primaryElement": "생각|믿음|꿈|말",
  "secondaryElements": [],
  "relevanceScore": 0.0~1.0,
  "summary": "200자 이내 요약",
  "keyVerses": ["구절1", "구절2"],
  "applicationKeywords": ["키워드1", ...],
  "weekSuggestion": "1|2-4|5-8|9-11|12"
}
```

### 5.2 교재 생성 프롬프트 (`scripts/prompts/curriculum-prompt.md`)

**System Prompt**:
```
당신은 4차원의 영성에 기반한 전문 성경공부 교재 저자입니다.
조용기 목사님의 설교 내용을 바탕으로 소그룹 성경공부 교재를 작성합니다.

교재 작성 원칙:
- 신학적 깊이와 실용적 적용의 균형
- 60~90분 소그룹 모임에 적합한 분량
- 다양한 신앙 배경의 성도가 참여 가능한 수준
- 조용기 목사님의 메시지를 충실히 반영
```

**User Prompt 템플릿 (주차별)**:
```
{요소} 요소의 {주차}주차 교재를 작성해주세요.

주차 주제: {theme}
참고 설교:
{sermons_summary}

다음 구조로 작성:
1. 이번 주 핵심 말씀 (1~2개 구절)
2. 도입 질문 (2~3개)
3. 본문 강의 (설교 발췌 포함, 약 1,500자)
4. 말씀 연구 (관련 구절 5개 + 간단한 주석)
5. 토론 질문 (4~5개)
6. 실천 과제 (개인용 1개, 가정/그룹용 1개)
7. 마무리 기도문
```

---

## 6. 구현 순서 (MVP: 생각 요소)

### Step 1: 환경 설정
- [ ] `package.json` 초기화 (`node-fetch` 또는 `@anthropic-ai/sdk`)
- [ ] `.env` 파일 (`ANTHROPIC_API_KEY`)
- [ ] `scripts/` 디렉토리 구조 생성

### Step 2: 파일 파서 구현
- [ ] `scripts/lib/parser.js` - 설교 파일 파싱
- [ ] 파싱 테스트 (10개 샘플)

### Step 3: 분류 스크립트 구현
- [ ] `scripts/prompts/classify-prompt.md` 작성
- [ ] `scripts/classify.js` 구현
- [ ] 10개 샘플 분류 테스트 및 프롬프트 조정

### Step 4: 분류 실행 (생각 요소 샘플)
- [ ] 50편 분류 실행
- [ ] 결과 검토 및 정확도 확인

### Step 5: 교재 생성 스크립트 구현
- [ ] `scripts/prompts/curriculum-prompt.md` 작성
- [ ] `scripts/generate-curriculum.js` 구현
- [ ] `생각` 12주 교재 생성

### Step 6: 품질 검증
- [ ] 교재 내용 신학적 검토
- [ ] 분류 정확도 샘플 검증

---

## 7. 기술 스택 상세

| 항목 | 선택 | 이유 |
|------|------|------|
| Runtime | Node.js 18+ | 파일 I/O, async/await 지원 |
| Claude API | `@anthropic-ai/sdk` | 공식 SDK, 안정성 |
| 모델 | `claude-sonnet-4-6` | 품질 우선 (분류용) |
| 교재 생성 모델 | `claude-sonnet-4-6` | 품질 우선 (교재 생성) |
| 환경 변수 | `dotenv` | API Key 관리 |
| 진행 상황 | `classified/stats.json` | 재시작 지원 (`--resume`) |

---

## 8. API 비용 추정 (MVP: 791개 설교 분류, 전체 Sonnet 4.6 기준)

| 항목 | 계산 | 비용 |
|------|------|------|
| 평균 설교 길이 | ~3,000 tokens | - |
| 분류 프롬프트 | ~500 tokens | - |
| Input tokens | 791 × 3,500 = 2.77M | Sonnet: ~$8.31 |
| Output tokens | 791 × 150 = 119K | Sonnet: ~$1.79 |
| 교재 생성 (12주 × 4요소) | 48 × ~2,000 = 96K input | Sonnet: ~$0.29 |
| **총 예상 비용** | | **~$10.39** |

> 품질 우선 정책: 분류·생성 모두 `claude-sonnet-4-6` 사용

---

## 9. 디렉토리 구조 (설계 기준)

```
4th_dimension/
├── sermon/                         # 원본 (791개 UTF-8 + 6개 EUC-KR)
├── classified/
│   ├── stats.json                  # 처리 현황
│   ├── 생각/
│   │   └── {date}_{slug}.json
│   ├── 믿음/
│   ├── 꿈/
│   └── 말/
├── curriculum/
│   └── 생각_12주_교재.md           # MVP 산출물
├── scripts/
│   ├── classify.js
│   ├── generate-curriculum.js
│   ├── lib/
│   │   └── parser.js
│   └── prompts/
│       ├── classify-prompt.md
│       └── curriculum-prompt.md
├── .env                            # ANTHROPIC_API_KEY (gitignore)
├── package.json
└── docs/
```

---

## 10. 다음 단계

> **Design 완료 후**: `/pdca do sermon-curriculum` 실행
> Step 1~3 순서로 구현 시작 (환경 설정 → 파서 → 분류 스크립트)
