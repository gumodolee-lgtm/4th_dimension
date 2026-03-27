# 매뉴얼 개요 (Manual Overview)

이 문서는 4차원의 영성 설교 분류 및 성경공부 교재 생성 프로젝트의 모든 매뉴얼을 한눈에 보기 위한 색인입니다.

## 프로젝트 개요

37년 이상의 한국어 설교를 4가지 요소(생각/믿음/꿈/말)로 분류하고, 분류된 데이터를 기반으로 구조화된 성경공부 교재를 생성하며, 최종적으로 DOCX 형식의 교안 파일을 출력합니다.

### 처리 흐름

```
sermon/ (원본 설교 텍스트)
  → classify.js (4요소 분류)
  → classified/ (분류 결과 JSON)
  → generate-curriculum.js / build-curriculum-v2.js (교재 생성)
  → curriculum/ (교재 데이터)
  → generate-lesson.js (개별 교안 생성)
  → export-lessons-docx.js (DOCX 출력)
  → output/ (최종 DOCX 파일)
```

## 매뉴얼 목록

| 파일 | 내용 | 언제 참고? |
|------|------|-----------|
| `MANUAL_SCRIPTS.md` | 스크립트 규칙 (API 호출, 분류, 배치 처리, 에러 처리) | 스크립트 수정/추가 시 |
| `MANUAL_PROMPTS.md` | 프롬프트 규칙 (템플릿, 분류 일관성, 버전 관리) | 프롬프트 수정/추가 시 |
| `MANUAL_DOCX.md` | DOCX 생성 규칙 (폰트, 색상, 구조, 템플릿) | DOCX 출력 관련 수정 시 |

## 자동 매칭 기준

### 키워드 기반
- classify, curriculum, lesson, batch, script, rate limit → `MANUAL_SCRIPTS.md`
- prompt, template, AI, Claude, 분류 기준, 요소 정의 → `MANUAL_PROMPTS.md`
- docx, export, format, font, 폰트, 색상, 출력 → `MANUAL_DOCX.md`

### 파일 경로 기반
- `scripts/classify.js`, `scripts/generate-*.js`, `scripts/build-*.js` → `MANUAL_SCRIPTS.md`
- `scripts/prompts/**`, 프롬프트 관련 상수/설정 → `MANUAL_PROMPTS.md`
- `scripts/export-*.js`, `scripts/templates/**` → `MANUAL_DOCX.md`

### 의도 기반
- "설교 분류해", "배치 실행", "API 호출 수정" → `MANUAL_SCRIPTS.md`
- "프롬프트 수정", "분류 기준 변경", "AI 응답 형식" → `MANUAL_PROMPTS.md`
- "문서 출력", "폰트 변경", "DOCX 형식 수정" → `MANUAL_DOCX.md`
