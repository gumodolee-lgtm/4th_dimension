import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageBreak, LevelFormat
} from 'docx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── 색상 팔레트 ──────────────────────────────────
const COLORS = {
  v1Header: '2E5FAB',   // 파란색 — V1-1
  v2Header: '217346',   // 녹색  — V1-2
  sectionBg1: 'DCE6F5', // V1-1 연한 파란색
  sectionBg2: 'D7EAD8', // V1-2 연한 녹색
  compareBg: 'FFF3CD',  // 비교 요약 노란색
  titleBg: '1F3864',    // 제목 배경 (진파랑)
  borderColor: 'AAAAAA',
  white: 'FFFFFF',
};

const border = { style: BorderStyle.SINGLE, size: 1, color: COLORS.borderColor };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── 헬퍼 함수 ────────────────────────────────────
function h(text, level = HeadingLevel.HEADING_1, color = '000000', spacing = { before: 200, after: 120 }) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, color, bold: true })],
    spacing,
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 80 },
  });
}

function boldP(label, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true }),
      new TextRun({ text }),
    ],
    spacing: { after: 80 },
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.borderColor } },
    spacing: { before: 160, after: 160 },
    children: [],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function colorBlock(text, bgColor, textColor = '000000', bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold, color: textColor })],
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    spacing: { before: 60, after: 60 },
    indent: { left: 200, right: 200 },
  });
}

function twoColTable(leftContent, rightContent, leftBg, rightBg) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: leftBg, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 150, right: 150 },
            children: leftContent,
          }),
          new TableCell({
            borders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: rightBg, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 150, right: 150 },
            children: rightContent,
          }),
        ],
      }),
    ],
  });
}

function headerTable(left, right) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4680, 4680],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: COLORS.v1Header, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 150, right: 150 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: left, bold: true, color: COLORS.white, size: 28 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            borders,
            width: { size: 4680, type: WidthType.DXA },
            shading: { fill: COLORS.v2Header, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 150, right: 150 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: right, bold: true, color: COLORS.white, size: 28 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function compareRow(label, v1, v2, v1Bg = COLORS.sectionBg1, v2Bg = COLORS.sectionBg2) {
  const cellParts = (lines) =>
    lines.map(l =>
      new Paragraph({ children: [new TextRun({ text: l })], spacing: { after: 60 } })
    );

  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 2000, type: WidthType.DXA },
        shading: { fill: 'EFEFEF', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
      }),
      new TableCell({
        borders,
        width: { size: 3680, type: WidthType.DXA },
        shading: { fill: v1Bg, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: cellParts(Array.isArray(v1) ? v1 : [v1]),
      }),
      new TableCell({
        borders,
        width: { size: 3680, type: WidthType.DXA },
        shading: { fill: v2Bg, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: cellParts(Array.isArray(v2) ? v2 : [v2]),
      }),
    ],
  });
}

function threeColHeaderRow() {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        width: { size: 2000, type: WidthType.DXA },
        shading: { fill: '444444', type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: '항목', bold: true, color: 'FFFFFF' })] })],
      }),
      new TableCell({
        borders,
        width: { size: 3680, type: WidthType.DXA },
        shading: { fill: COLORS.v1Header, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'V1-1 (통합본)', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
      }),
      new TableCell({
        borders,
        width: { size: 3680, type: WidthType.DXA },
        shading: { fill: COLORS.v2Header, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: 'V1-2 (과별 분리)', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
      }),
    ],
  });
}

// ── 문서 생성 ─────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } },
        }],
      },
      {
        reference: 'numbers',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } },
        }],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: '맑은 고딕', size: 22 } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: '맑은 고딕' },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: '맑은 고딕' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: '맑은 고딕' },
        paragraph: { spacing: { before: 180, after: 90 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
        },
      },
      children: [

        // ═══════════════════════════════════════════════
        //  표지
        // ═══════════════════════════════════════════════
        new Paragraph({ spacing: { before: 1440 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '4차원의 영성 생각 교재', bold: true, size: 40, color: COLORS.titleBg })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: 'V1-1 vs V1-2 교재 비교 보고서', bold: true, size: 32, color: '555555' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '1과 · 2과', size: 28, color: '777777' })],
          spacing: { after: 400 },
        }),
        divider(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: '비교 대상', bold: true, size: 24 })],
        }),
        headerTable('V1-1  통합본 (생각_12주_교재.md)', 'V1-2  과별 분리 (v1-2/생각/)'),
        new Paragraph({ spacing: { after: 240 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '작성일: 2026. 3. 4.', color: '888888', size: 20 })],
        }),

        pageBreak(),

        // ═══════════════════════════════════════════════
        //  섹션 1: 구조 개요 비교
        // ═══════════════════════════════════════════════
        h('1. 전체 구조 비교', HeadingLevel.HEADING_1),
        p('V1-1과 V1-2는 같은 설교 자료를 바탕으로 하되, 접근 방식과 섹션 구성이 다릅니다.'),
        p('아래 표는 1과(1주차)와 2과(2주차)에서 공통으로 확인된 구조 차이를 보여줍니다.'),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2000, 3680, 3680],
          rows: [
            threeColHeaderRow(),
            compareRow('형식', '단일 통합 파일\n(12주 전체 포함)', '주차별 독립 파일\n(각 과 단독 사용 가능)'),
            compareRow('학습 목표', '없음', '3가지 명시\n(지식·이해·결단)'),
            compareRow('핵심 말씀', '2개 구절', '1개 구절'),
            compareRow('도입 질문', '3개 (5~7분 예상)', '1개 (5분 배정)'),
            compareRow('본문 강의', '서술형 강의\n(약 1,200자)', '소제목+사례 중심\n(약 800자)'),
            compareRow('말씀 연구', '표 형식\n(5구절+주석)', '관찰/해석/적용\n3단계 질문'),
            compareRow('토론 질문', '5개 (관찰→해석→적용)', '말씀 연구에 통합'),
            compareRow('실천 과제', '개인 + 가정/그룹\n(완성)', '없음 (파일 잘림)'),
            compareRow('마무리 기도', '완성', '없음 (파일 잘림)'),
            compareRow('완성도', '✅ 완전', '❌ 미완성 (잘림)'),
          ],
        }),

        new Paragraph({ spacing: { after: 200 }, children: [] }),

        pageBreak(),

        // ═══════════════════════════════════════════════
        //  섹션 2: 1과 상세 비교
        // ═══════════════════════════════════════════════
        h('2. 1과 상세 비교', HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
        headerTable('V1-1 — 1주차', 'V1-2 — 1과'),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 제목
        h('2.1 제목 및 핵심 말씀', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '제목', bold: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('마음의 변화 — 4차원의 영성이란 무엇인가')], spacing: { after: 120 } }),
            new Paragraph({ children: [new TextRun({ text: '핵심 말씀 (2개)', bold: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 이사야 43:19')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('  "보라 내가 새 일을 행하리니…"')], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 로마서 12:2')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('  "마음을 새롭게 함으로 변화를 받아…"')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '제목', bold: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('마음의 변화: 4차원의 영성이란')], spacing: { after: 120 } }),
            new Paragraph({ children: [new TextRun({ text: '핵심 말씀 (1개)', bold: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 로마서 12:2')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('  "마음을 새롭게 함으로 변화를 받아…"')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 도입
        h('2.2 도입 질문', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '3개 질문 (마음 열기)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('1. 최근에 어떤 생각이 하루 종일 머릿속을 맴돈 적이 있으신가요?')], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('2. "마음먹기에 달렸다"는 말—실제로 생각이 현실을 바꾼 경험이 있으신가요?')], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('3. "영적인 삶"이라고 하면 어떤 이미지가 떠오르시나요?')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '1개 질문 (5분 배정)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('오늘 아침 잠에서 깨어나 처음 떠오른 생각은 무엇이었나요? 그 생각이 하루의 시작에 어떤 영향을 주었는지 가볍게 나눠봅시다.')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 본문 강의
        h('2.3 본문 강의/설명', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '서술형 강의 (약 1,200자)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('핵심 주제: 4차원 영성의 신학적 기초'), new TextRun({ text: ' (개념 중심)', italics: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 4차원(영적 세계) vs 3차원(물질 세계) 원리')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 하나님 형상대로 창조된 인간 (창 1:26-27)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 거듭남 = 4차원 영적 세계의 재개방 (요 3:3)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• "3차원적 인본주의의 함정"')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 생각 = "4차원과 3차원을 잇는 핵심 고리"')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '사례·실증 중심 설명 (약 800자)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('핵심 주제: 생각의 실제적 영향력'), new TextRun({ text: ' (실용 중심)', italics: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• NC주립대 심리학 연구 인용 (노화와 생각)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 중풍병자 친구들 — "길이 있다"는 생각')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 베드로의 물 위 걷기 — 시선의 방향')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 혈루증 여인 — "옷자락만 만져도 낫는다"')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 이사야 43:19 적용')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 말씀 연구
        h('2.4 말씀 연구', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '표 형식 (5구절 + 주석)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('5개 구절에 각각 간단 주석 제공')], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('구절: 창 1:26-27 / 요 3:3,5 / 롬 12:2 / 막 11:23-24 / 사 43:19')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('형식: 구절 | 내용 | 간단 주석 (3열 표)')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '관찰/해석/적용 3단계 질문', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('[관찰] 롬 12:2에서 하지 말아야 할 것과 해야 할 것은?')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[관찰] 이사야 43:19의 두 장소와 두 약속은?')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[해석] 베드로의 물 위 걷기와 롬 12:2의 공통 원리')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[해석] 마음 새롭게 함 = 단번 결심? 지속 훈련?')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[적용] 내 삶의 "닫힌 문"과 "다른 문" 나눔')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[적용] 부정적 생각 한 가지 적기 (개인 성찰)')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 토론/실천/기도
        h('2.5 토론·실천·기도 완성도', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '✅ 모든 섹션 완성', bold: true, color: '0A6E0A' })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('토론 질문: 5개 (관찰/해석/적용 분류)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('실천 과제: 개인 + 가정/그룹 제공')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('마무리 기도: 완성 (공동 기도문)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('다음 주 예고 포함')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '❌ 파일 잘림 — 미완성', bold: true, color: 'CC0000' })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('토론 질문: 없음 (말씀 연구에 통합)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('실천 과제: 없음 (파일이 적용 질문 중 절단)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('마무리 기도: 없음')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('원인: max_tokens: 2048 제한 (현재 4096으로 수정됨)')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),

        pageBreak(),

        // ═══════════════════════════════════════════════
        //  섹션 3: 2과 상세 비교
        // ═══════════════════════════════════════════════
        h('3. 2과 상세 비교', HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
        headerTable('V1-1 — 2주차', 'V1-2 — 2과'),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 제목
        h('3.1 제목 및 핵심 말씀', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '제목', bold: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('생각의 힘 — 마음이 새로워지는 원리')], spacing: { after: 120 } }),
            new Paragraph({ children: [new TextRun({ text: '핵심 말씀 (2개)', bold: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 로마서 8:5-6')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('  "육신의 생각은 사망이요 영의 생각은 생명과 평안"')], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 잠언 4:23')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('  "생명의 근원이 이에서 남이니라"')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '제목', bold: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('생각의 힘과 성경적 근거')], spacing: { after: 120 } }),
            new Paragraph({ children: [new TextRun({ text: '핵심 말씀 (1개)', bold: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 빌립보서 4:8')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('  "무엇에든지 참되며…이것들을 생각하라"')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 도입
        h('3.2 도입 질문', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '3개 질문', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('1. 아침에 눈을 떴을 때 가장 먼저 떠오르는 생각은?')], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('2. "생각을 바꿨더니 상황이 달라졌다"는 경험 나눔')], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('3. "사람은 자신이 생각하는 대로 된다"에 동의 여부')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '1개 질문 (5분 배정)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('오늘 아침에 눈을 뜨고 나서 가장 먼저 든 생각은 무엇이었나요? 그 생각이 하루의 기분에 어떤 영향을 주었는지 잠깐 나눠봅시다.')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 본문 강의
        h('3.3 본문 강의/설명', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '서술형 강의 (약 1,200자)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('핵심 주제: 십자가 중심 긍정적 사고'), new TextRun({ text: ' (신학 중심)', italics: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 생각이 "인생의 터전" (사 54:2 기반)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 죄로 인해 생각이 오염됨 (롬 5:12, 렘 6:19)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 질그릇 비유 (고후 4:7) — 우리 안의 보배')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 갈 6:14 십자가 중심의 긍정적 사고')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• "할 수 있다, 하면 된다, 해보자" 선언')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 엡 3:20 하나님의 넘치는 역사')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '사례·실증 중심 (약 800자)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('핵심 주제: 생각의 인생 터전 역할'), new TextRun({ text: ' (실용·과학 중심)', italics: true })], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('• 이사야 54:2-3 — 장막 터 넓히기')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 아담의 잘못된 생각 → 전 인류 사망 (롬 5:12)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 하버드 엘렌 랭어 교수 실험')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('  "나는 50대다" → 실제 신체 기능 회복')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('• 잠 4:23 / 롬 8:6 / 빌 4:8 연결')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 말씀 연구
        h('3.4 말씀 연구', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '표 형식 (5구절 + 주석)', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('구절: 잠 4:23 / 롬 8:5-6 / 사 55:8-9 / 고후 4:8-9 / 엡 3:20')], spacing: { after: 60 } }),
            new Paragraph({ children: [new TextRun('각 구절에 헬라어 원문 해설 포함')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('(예) 잠 4:23 — 히브리어 "레브" = 지성·감성·의지 전체')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '관찰/해석/적용 3단계 질문', bold: true })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('[관찰] 빌 4:8의 8가지 기준 모두 찾기')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[관찰] 롬 8:5-6 육신/영의 생각 결과 대비')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[해석] 그리스도인 생각의 공동체적 책임')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[해석] 좋은 생각은 왜 저절로 안 되는가')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('[적용] 빌 4:8 기준으로 내 생각 자기 점검')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // 완성도
        h('3.5 토론·실천·기도 완성도', HeadingLevel.HEADING_2),
        twoColTable(
          [
            new Paragraph({ children: [new TextRun({ text: '✅ 모든 섹션 완성', bold: true, color: '0A6E0A' })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('토론 질문: 5개 (관찰/해석/적용)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('실천 과제: 롬 8:6 매일 암송 (개인)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('실천 과제: 부정적 생각 → 빌 4:13 고백 (그룹)')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('마무리 기도: 완성')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('3주차 예고 (말의 능력) 포함')], spacing: { after: 40 } }),
          ],
          [
            new Paragraph({ children: [new TextRun({ text: '❌ 파일 잘림 — 미완성', bold: true, color: 'CC0000' })], spacing: { after: 80 } }),
            new Paragraph({ children: [new TextRun('토론 질문: 없음')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('실천 과제: 없음')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('마무리 기도: 없음')], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun('파일이 적용 질문 1번 도중 절단됨')], spacing: { after: 40 } }),
          ],
          COLORS.sectionBg1,
          COLORS.sectionBg2,
        ),

        pageBreak(),

        // ═══════════════════════════════════════════════
        //  섹션 4: 종합 평가
        // ═══════════════════════════════════════════════
        h('4. 종합 평가 및 권고사항', HeadingLevel.HEADING_1),
        new Paragraph({ spacing: { after: 80 }, children: [] }),

        h('4.1 V1-1 강점', HeadingLevel.HEADING_2),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('완성도: 7개 섹션 모두 완전히 갖춤 (기도문, 실천 과제 포함)')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('신학 깊이: 4차원 영성의 신학적 근거를 체계적으로 설명')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('다양한 도입 질문 (3개): 다양한 참여자를 포용')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('풍부한 말씀 연구: 5구절 + 원문 해설 제공')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('개인 + 그룹 실천 과제 구분')],
          spacing: { after: 80 },
        }),

        h('4.2 V1-1 약점', HeadingLevel.HEADING_2),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('학습 목표 없음 — 과 목표가 명시되지 않아 인도자가 방향을 잡기 어려움')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('시간 배정 없음 — 60~90분 모임에서 각 섹션 시간 조절 어려움')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('2주차 도입 질문이 1주차와 거의 동일 (아침 첫 생각 질문 반복)')],
          spacing: { after: 80 },
        }),

        h('4.3 V1-2 강점', HeadingLevel.HEADING_2),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('학습 목표 명시 (지식·이해·결단) — 인도자와 참여자 모두 방향 명확')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('시간 배정 (도입 5분 / 본문 15분 / 말씀 연구 20분) — 실용적')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('말씀 연구: 관찰→해석→적용 3단계 — 귀납적 성경공부 원칙 준수')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('과학적 사례(하버드 실험 등) 인용 — 비신앙인도 참여하기 쉬운 진입점')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('독립 파일 — 특정 과만 인쇄·배포 가능')],
          spacing: { after: 80 },
        }),

        h('4.4 V1-2 약점', HeadingLevel.HEADING_2),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun({ text: '미완성 (CRITICAL): ', bold: true }), new TextRun('실천 과제·기도문 누락 — API max_tokens: 2048 제한으로 파일 잘림')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun({ text: '현재 상태: ', bold: true }), new TextRun('scripts/generate-curriculum.js에서 max_tokens → 4096으로 수정됨, 크레딧 충전 후 재생성 필요')],
          spacing: { after: 60 },
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          children: [new TextRun('2과 도입 질문이 1과와 거의 동일 (같은 "아침 첫 생각" 질문)')],
          spacing: { after: 80 },
        }),

        divider(),

        h('4.5 권고사항', HeadingLevel.HEADING_2),
        colorBlock('크레딧 충전 후 우선 실행할 작업', COLORS.compareBg, '333300', true),
        new Paragraph({ spacing: { after: 80 }, children: [] }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1000, 5360, 3000],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders, width: { size: 1000, type: WidthType.DXA },
                  shading: { fill: '444444', type: ShadingType.CLEAR },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: '순서', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                }),
                new TableCell({
                  borders, width: { size: 5360, type: WidthType.DXA },
                  shading: { fill: '444444', type: ShadingType.CLEAR },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: '작업', bold: true, color: 'FFFFFF' })] })],
                }),
                new TableCell({
                  borders, width: { size: 3000, type: WidthType.DXA },
                  shading: { fill: '444444', type: ShadingType.CLEAR },
                  margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: '명령어', bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ borders, width: { size: 1000, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun('1')], alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders, width: { size: 5360, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun('V1-2 생각 12과 재생성 (max_tokens: 4096)')] })] }),
                new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
                  children: [new Paragraph({ children: [new TextRun({ text: '--element=생각', font: 'Courier New', size: 18 })] })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ borders, width: { size: 1000, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun('2')], alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders, width: { size: 5360, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun('2과 도입 질문 다양화 (1과와 차별화)')] })] }),
                new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun('프롬프트 수정 후 재생성')] })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ borders, width: { size: 1000, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun('3')], alignment: AlignmentType.CENTER })] }),
                new TableCell({ borders, width: { size: 5360, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun('V1-1 + V1-2 강점 결합 — "V1-3" 최종 버전 제작 고려')] })] }),
                new TableCell({ borders, width: { size: 3000, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun('선택적 작업')] })] }),
              ],
            }),
          ],
        }),

        new Paragraph({ spacing: { after: 200 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '— 4차원의 영성 교재 시스템 —', color: '888888', italics: true })],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = join(ROOT, 'curriculum', '생각_V1-1_vs_V1-2_비교.docx');
  writeFileSync(outPath, buffer);
  console.log('✅ 생성 완료:', outPath);
});
