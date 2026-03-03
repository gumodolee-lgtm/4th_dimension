/**
 * 4과 DOCX 개별 내보내기 (V1-1 1과/2과, V1-2 1과/2과)
 * 사용법: node scripts/export-lessons-docx.js
 */
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageBreak, LevelFormat,
} from 'docx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'curriculum');

// ── 색상 ──────────────────────────────
const C = {
  v1bg: '2E5FAB',   // V1-1 헤더 파란색
  v2bg: '217346',   // V1-2 헤더 녹색
  quoteLeft: 'EEEEEE',  // 블록쿼트 배경
  white: 'FFFFFF',
  dark: '1A1A1A',
  gray: '555555',
  lightBlue: 'E8F0FB',
  lightGreen: 'E8F5E9',
};

const borderGray = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: borderGray, bottom: borderGray, left: borderGray, right: borderGray };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── 간단한 마크다운 → DOCX 변환기 ──────
function parseBoldText(text) {
  // **bold** 파싱
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    parts.push(new TextRun({ text: match[1], bold: true }));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(new TextRun({ text: text.slice(lastIndex) }));
  }
  return parts.length > 0 ? parts : [new TextRun({ text })];
}

function mdToParagraphs(md, version = 'v1-1') {
  const lines = md.split('\n');
  const result = [];
  let i = 0;

  // 버전별 색상
  const headerColor = version === 'v1-1' ? C.v1bg : C.v2bg;
  const headerBg = version === 'v1-1' ? C.lightBlue : C.lightGreen;

  while (i < lines.length) {
    const line = lines[i];

    // --- 구분선
    if (/^---+$/.test(line.trim())) {
      result.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
        spacing: { before: 100, after: 100 },
        children: [],
      }));
      i++;
      continue;
    }

    // # H1
    if (/^# /.test(line)) {
      result.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^# /, ''), bold: true, color: headerColor, size: 36 })],
        spacing: { before: 0, after: 240 },
        shading: { fill: headerBg, type: ShadingType.CLEAR },
        indent: { left: 120 },
      }));
      i++;
      continue;
    }

    // ## H2
    if (/^## /.test(line)) {
      result.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^## /, ''), bold: true, color: headerColor, size: 28 })],
        spacing: { before: 280, after: 100 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: headerColor } },
      }));
      i++;
      continue;
    }

    // ### H3
    if (/^### /.test(line)) {
      result.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^### /, ''), bold: true, color: C.gray, size: 24 })],
        spacing: { before: 200, after: 80 },
      }));
      i++;
      continue;
    }

    // > 블록쿼트 (연속 처리)
    if (/^> /.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^> /.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^> /, ''));
        i++;
      }
      for (const ql of quoteLines) {
        if (ql.trim() === '') continue;
        result.push(new Paragraph({
          children: parseBoldText(ql),
          shading: { fill: C.quoteLeft, type: ShadingType.CLEAR },
          indent: { left: 480, right: 240 },
          spacing: { after: 60 },
          border: { left: { style: BorderStyle.THICK, size: 12, color: headerColor } },
        }));
      }
      continue;
    }

    // | 테이블
    if (/^\|/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      // 헤더 행, 구분선 행, 데이터 행
      const rows = tableLines.filter(l => !/^\|[\s-|]+\|$/.test(l));
      if (rows.length > 0) {
        const parsedRows = rows.map(r =>
          r.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(c => c.trim())
        );
        const colCount = parsedRows[0]?.length || 1;
        const colWidth = Math.floor(9360 / colCount);
        const tableRows = parsedRows.map((cells, rowIdx) =>
          new TableRow({
            children: cells.map((cell) =>
              new TableCell({
                borders,
                width: { size: colWidth, type: WidthType.DXA },
                shading: rowIdx === 0 ? { fill: headerBg, type: ShadingType.CLEAR } : undefined,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [new Paragraph({ children: parseBoldText(cell) })],
              })
            ),
          })
        );
        result.push(new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: Array(colCount).fill(colWidth),
          rows: tableRows,
        }));
        result.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }
      continue;
    }

    // 번호 목록 (1. ...)
    if (/^\d+\. /.test(line)) {
      result.push(new Paragraph({
        numbering: { reference: 'numbers', level: 0 },
        children: parseBoldText(line.replace(/^\d+\. /, '')),
        spacing: { after: 80 },
      }));
      i++;
      continue;
    }

    // 불릿 (- ...)
    if (/^- /.test(line)) {
      result.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: parseBoldText(line.replace(/^- /, '')),
        spacing: { after: 80 },
      }));
      i++;
      continue;
    }

    // 빈 줄
    if (line.trim() === '') {
      result.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
      i++;
      continue;
    }

    // 일반 텍스트
    result.push(new Paragraph({
      children: parseBoldText(line),
      spacing: { after: 100 },
    }));
    i++;
  }

  return result;
}

// ── DOCX 생성 ─────────────────────────────
function createDocx(content, version, lessonNum, bgColor) {
  const paragraphs = mdToParagraphs(content, version);

  return new Document({
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
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          // 상단 컬러 배너
          new Table({
            width: { size: 9746, type: WidthType.DXA },
            columnWidths: [9746],
            rows: [new TableRow({
              children: [new TableCell({
                borders: noBorders,
                width: { size: 9746, type: WidthType.DXA },
                shading: { fill: bgColor, type: ShadingType.CLEAR },
                margins: { top: 200, bottom: 200, left: 300, right: 300 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `4차원의 영성 성경공부 — 생각 ${lessonNum}과`, bold: true, color: C.white, size: 28 })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `(${version === 'v1-1' ? 'V1-1 통합본' : 'V1-2 표준 포맷'})`, color: 'DDDDDD', size: 20 })],
                    spacing: { before: 60 },
                  }),
                ],
              })],
            })],
          }),
          new Paragraph({ spacing: { after: 200 }, children: [] }),
          ...paragraphs,
          new Paragraph({ spacing: { before: 400 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '— 조용기 목사님 설교를 바탕으로 한 소그룹 성경공부 교재 —', color: '888888', italics: true, size: 18 })],
          }),
        ],
      },
    ],
  });
}

// ── V1-1에서 특정 주차 추출 ────────────────
function extractWeekFromV11(fullMd, weekNum) {
  const h1Pattern = new RegExp(`^# ${weekNum}주차:`, 'm');
  const nextH1Pattern = new RegExp(`^# ${weekNum + 1}주차:`, 'm');

  const startMatch = h1Pattern.exec(fullMd);
  if (!startMatch) return '';
  const start = startMatch.index;

  const nextMatch = nextH1Pattern.exec(fullMd);
  const end = nextMatch ? nextMatch.index : fullMd.length;

  return fullMd.slice(start, end).trimEnd();
}

// ── 메인 ──────────────────────────────────
async function main() {
  const v11Full = readFileSync(join(ROOT, 'curriculum', '생각_12주_교재.md'), 'utf-8');
  const v21 = readFileSync(join(ROOT, 'curriculum', 'v1-2', '생각', '01_생각_1과.md'), 'utf-8');
  const v22 = readFileSync(join(ROOT, 'curriculum', 'v1-2', '생각', '02_생각_2과.md'), 'utf-8');

  const v11_1 = extractWeekFromV11(v11Full, 1);
  const v11_2 = extractWeekFromV11(v11Full, 2);

  const files = [
    { name: '생각_V1-1_1과.docx', content: v11_1, version: 'v1-1', lesson: 1, color: C.v1bg },
    { name: '생각_V1-1_2과.docx', content: v11_2, version: 'v1-1', lesson: 2, color: C.v1bg },
    { name: '생각_V1-2_1과.docx', content: v21,   version: 'v1-2', lesson: 1, color: C.v2bg },
    { name: '생각_V1-2_2과.docx', content: v22,   version: 'v1-2', lesson: 2, color: C.v2bg },
  ];

  for (const f of files) {
    const doc = createDocx(f.content, f.version, f.lesson, f.color);
    const buffer = await Packer.toBuffer(doc);
    const outPath = join(OUT, f.name);
    writeFileSync(outPath, buffer);
    console.log(`✅ ${f.name}  (${Math.round(buffer.length / 1024)}KB)`);
  }

  console.log('\n저장 위치: curriculum/');
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
