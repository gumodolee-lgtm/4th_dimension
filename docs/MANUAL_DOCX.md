# DOCX 생성 매뉴얼 (DOCX Manual)

교안을 DOCX 파일로 출력할 때 반드시 따라야 하는 규칙입니다.

## 개요

`export-lessons-docx.js` 스크립트는 생성된 교안 데이터를 Microsoft Word 형식(.docx)으로 변환합니다.
`docx` 라이브러리를 사용하며, 한국어 텍스트에 최적화된 포맷을 적용합니다.

## 규칙

### 폰트 설정
- 기본 폰트: **맑은 고딕 (Malgun Gothic)**
- 모든 Paragraph와 TextRun에 한글 폰트를 명시적으로 설정한다:
  ```javascript
  new TextRun({
    text: "교안 내용",
    font: "맑은 고딕",
    size: 24, // 12pt (half-point 단위)
  })
  ```
- 한글 폰트 fallback 설정을 포함한다:
  ```javascript
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "맑은 고딕",
          },
        },
      },
    },
  });
  ```

### 색상 체계 (Color Scheme)
- **제목 (Title)**: Navy — `#000080`
- **헤더 (Section Headers)**: Dark Blue — `#00008B`
- **강조 "할렐루야"**: Red — `#FF0000`
- **주석/참고 (Notes)**: Gray — `#808080`
- **본문 (Body Text)**: Black — `#000000`
- 색상 적용 예시:
  ```javascript
  // 제목
  new TextRun({
    text: "제1과: 믿음의 시작",
    color: "000080",
    bold: true,
    size: 36, // 18pt
    font: "맑은 고딕",
  })

  // 할렐루야 강조
  new TextRun({
    text: "할렐루야!",
    color: "FF0000",
    bold: true,
    font: "맑은 고딕",
  })

  // 주석
  new TextRun({
    text: "* 참고: 이 설교는 1989년 3월에 전해졌습니다.",
    color: "808080",
    italics: true,
    size: 20, // 10pt
    font: "맑은 고딕",
  })
  ```

### 문서 구조 (Document Structure)
각 교안 DOCX는 아래 순서로 구성한다:

1. **날짜 헤더** — 설교 날짜 또는 교안 날짜 (Gray, 우측 정렬)
2. **제목** — 교안 제목 (Navy, 굵게, 18pt)
3. **성경 구절** — 본문 성경 참조 (Dark Blue, 14pt)
4. **4요소 분류 태그** — 해당 교안의 주요 요소 표시
5. **설교 본문** — 핵심 내용 정리 (Black, 12pt)
6. **적용 질문** — 소그룹 토의용 질문 (목록 형식)
7. **기도문** — 마무리 기도 (Italics)

### 페이지 설정
- 용지 크기: A4
- 여백: 상하 2.54cm, 좌우 3.17cm (Word 기본값)
- 줄 간격: 1.5줄

### 템플릿
- 문서 템플릿은 `scripts/templates/` 디렉토리에서 관리한다.
- 새로운 문서 유형이 필요하면 기존 템플릿을 복제하여 수정한다.
- 템플릿 변경 시 기존 출력물과의 일관성을 확인한다.

### 파일 명명 규칙
- 출력 파일명: `lesson_[주차번호]_[요소].docx`
  - 예: `lesson_01_믿음.docx`, `lesson_12_생각.docx`
- 출력 디렉토리: `output/`

## 안티패턴 (하지 말 것)

- 한글 폰트 fallback 없이 문서를 생성하지 않는다 (영문 기본 폰트로 한글이 깨질 수 있음).
- 설교 본문을 포맷 없이 raw text로 출력하지 않는다 (반드시 구조화된 Paragraph 사용).
- 색상 코드에 `#` 기호를 포함하지 않는다 (docx 라이브러리는 `#` 없는 hex 값을 사용).
- DOCX 파일을 `output/` 외의 디렉토리에 저장하지 않는다.
- 하나의 DOCX에 모든 교안을 넣지 않는다 (교안별 개별 파일 생성).
- `TextRun`에 `font` 속성을 누락하지 않는다 (특히 동적 생성 시 주의).
