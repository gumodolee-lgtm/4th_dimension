/**
 * V1-1 전체 교재 + 인도자 매뉴얼 일괄 생성
 * 생각/꿈/믿음/말 각 12과 × 2종류 = 96개 docx 파일
 *
 * 사용법: node scripts/generate-all-v1-1.js
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageBreak, LevelFormat, Header, Footer, PageNumber,
} from 'docx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'curriculum');

// ── 색상 팔레트 ───────────────────────────────────────────────
const C = {
  // 주제별 대표색
  생각: { primary: '1F3864', secondary: '2E74B5', light: 'BDD7EE', pale: 'DEEAF1' },
  꿈:  { primary: '375623', secondary: '538135', light: 'C6EFCE', pale: 'E2EFDA' },
  믿음: { primary: '7B2C2C', secondary: 'C00000', light: 'FFCCCC', pale: 'FFF2CC' },
  말:  { primary: '3F3151', secondary: '7030A0', light: 'E2D5F8', pale: 'F3EFF9' },
  // 공통
  white: 'FFFFFF',
  black: '1A1A1A',
  gray: '595959',
  lightGray: 'F2F2F2',
  gold: 'C9A84C',
};

// ── 교재 메타데이터 ──────────────────────────────────────────
const SUBJECTS = [
  { key: '생각', fullName: '생각의 삶', file: '생각_12주_교재.md', symbol: '💭' },
  { key: '꿈',  fullName: '꿈의 삶',   file: '꿈_12주_교재.md',  symbol: '🌟' },
  { key: '믿음', fullName: '믿음의 삶', file: '믿음_12주_교재.md', symbol: '✝️' },
  { key: '말',  fullName: '말의 삶',   file: '말_12주_교재.md',  symbol: '📖' },
];

// ── 마크다운 파서 ─────────────────────────────────────────────

/**
 * 교재 md 파일을 읽어 과별로 분리
 * returns: Array<{ weekNum, title, scripture, intro, lecture, wordStudy, discussion, tasks, prayer, preview }>
 */
function parseCurriculum(mdPath) {
  const text = readFileSync(mdPath, 'utf-8');
  // 각 주차를 '# N주차:' 패턴으로 분리
  const lessonBlocks = text.split(/\n(?=# \d+주차:)/);
  const lessons = [];

  for (const block of lessonBlocks) {
    const headerMatch = block.match(/^# (\d+)주차:\s*(.+)/);
    if (!headerMatch) continue;

    const weekNum = parseInt(headerMatch[1]);
    const title = headerMatch[2].trim();

    // 섹션별 분리
    const sections = {};
    const sectionParts = block.split(/\n## /);
    for (const part of sectionParts) {
      const lineEnd = part.indexOf('\n');
      if (lineEnd < 0) continue;
      const sectionName = part.slice(0, lineEnd).trim();
      const sectionContent = part.slice(lineEnd + 1).trim();
      sections[sectionName] = sectionContent;
    }

    // 핵심 말씀
    const scriptureRaw = sections['이번 주 핵심 말씀'] || '';
    const scriptures = parseScriptures(scriptureRaw);

    // 도입 질문
    const introRaw = sections['도입 질문 (마음 열기)'] || '';
    const intro = parseNumberedList(introRaw);

    // 본문 강의
    const lectureRaw = sections['본문 강의'] || '';
    const lecture = parseLecture(lectureRaw);

    // 말씀 연구
    const wordStudyRaw = sections['말씀 연구'] || '';
    const wordStudy = parseWordStudyTable(wordStudyRaw);

    // 토론 질문
    const discussionRaw = sections['토론 질문 (소그룹 나눔)'] || '';
    const discussion = parseDiscussion(discussionRaw);

    // 실천 과제
    const tasksRaw = sections['이번 주 실천 과제'] || '';
    const tasks = parseTasks(tasksRaw);

    // 마무리 기도
    const prayerRaw = sections['마무리 기도'] || '';
    const prayer = prayerRaw.replace(/^>.*\n/, '').trim();

    // 다음 주 예고 (본문 말미에서 추출)
    const previewMatch = block.match(/>\s*\*\*다음 주 예고:\*\*\s*(.+)/);
    const preview = previewMatch ? previewMatch[1].trim() : '';

    lessons.push({ weekNum, title, scriptures, intro, lecture, wordStudy, discussion, tasks, prayer, preview });
  }

  return lessons;
}

function parseScriptures(raw) {
  const verses = [];
  const blocks = raw.split(/\n\n+/);
  for (const b of blocks) {
    const refMatch = b.match(/^\s*>\s*\*\*(.+?)\*\*/);
    if (!refMatch) continue;
    const ref = refMatch[1];
    // Remove the reference line, then extract quoted text (handles > "..." and > *"..."*)
    const afterRef = b.replace(/^\s*>\s*\*\*.+?\*\*.*\n?/, '');
    const textMatch = afterRef.match(/>\s*\*?"([\s\S]+?)"\*?/);
    const text = textMatch
      ? textMatch[1].replace(/\n>\s*/g, ' ').replace(/\n/g, ' ').trim()
      : '';
    verses.push({ ref, text });
  }
  return verses;
}

function parseNumberedList(raw) {
  // 번호로 시작하는 항목들 추출
  const items = [];
  // 앞의 인용문(>) 제거
  const cleaned = raw.replace(/^>.*\n/gm, '').trim();
  const itemMatches = cleaned.matchAll(/^\d+\.\s+(.+?)(?=\n\d+\.|\n\n|$)/gms);
  for (const m of itemMatches) {
    items.push(m[1].replace(/\n/g, ' ').trim());
  }
  return items;
}

function parseLecture(raw) {
  // 제목(###)과 단락들로 분리
  const parts = [];
  const sections = raw.split(/\n(?=### )/);
  for (const s of sections) {
    const titleMatch = s.match(/^### (.+)/);
    const bodyText = s.replace(/^### .+\n/, '').trim();
    const paragraphs = bodyText.split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean);
    if (titleMatch) {
      parts.push({ subtitle: titleMatch[1], paragraphs });
    } else {
      parts.push({ subtitle: null, paragraphs });
    }
  }
  return parts;
}

function parseWordStudyTable(raw) {
  const rows = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;
    if (cells[0] === '구절' || cells[0].startsWith('-')) continue;
    // Clean up bold markers
    const ref = cells[0].replace(/\*\*/g, '');
    const content = cells[1].replace(/\*\*/g, '');
    const commentary = cells[2].replace(/\*\*/g, '');
    rows.push({ ref, content, commentary });
  }
  return rows;
}

function parseDiscussion(raw) {
  const groups = [];
  const lines = raw.split('\n');
  let currentGroup = null;
  let items = [];

  for (const line of lines) {
    const boldMatch = line.match(/^\*\*\[(.+?)\]\s*(.+)\*\*/);
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);

    if (boldMatch) {
      if (currentGroup && items.length) groups.push({ group: currentGroup, items });
      currentGroup = `[${boldMatch[1]}] ${boldMatch[2]}`;
      items = [];
    } else if (numMatch) {
      items.push(numMatch[2].trim());
    }
  }
  if (currentGroup && items.length) groups.push({ group: currentGroup, items });
  return groups;
}

function parseTasks(raw) {
  const tasks = {};
  const indMatch = raw.match(/- \*\*개인 실천:\*\*\n([\s\S]+?)(?=\n- \*\*|$)/);
  const grpMatch = raw.match(/- \*\*가정\/그룹 실천:\*\*\n([\s\S]+?)(?=\n- \*\*|$)/);
  if (indMatch) tasks.individual = indMatch[1].replace(/\n/g, ' ').trim();
  if (grpMatch) tasks.group = grpMatch[1].replace(/\n/g, ' ').trim();
  return tasks;
}

// ── DOCX 헬퍼 ─────────────────────────────────────────────────

function bordersFrom(color) {
  const b = { style: BorderStyle.SINGLE, size: 1, color };
  return { top: b, bottom: b, left: b, right: b };
}

function noBorders() {
  const n = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: n, bottom: n, left: n, right: n };
}

function boldRuns(text) {
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(new TextRun({ text: text.slice(last, m.index), font: 'Malgun Gothic', size: 22 }));
    parts.push(new TextRun({ text: m[1], bold: true, font: 'Malgun Gothic', size: 22 }));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(new TextRun({ text: text.slice(last), font: 'Malgun Gothic', size: 22 }));
  return parts;
}

function para(text, opts = {}) {
  const { bold = false, size = 22, color, font = 'Malgun Gothic', align, spacing, indent } = opts;
  return new Paragraph({
    alignment: align,
    spacing: spacing || { after: 80 },
    indent,
    children: [new TextRun({ text, bold, size, color, font })],
  });
}

function heading(text, level, color, size) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: size || 26, color: color || C.black, font: 'Malgun Gothic' })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: color || '2E74B5', space: 1 } },
  });
}

function sectionHeader(text, bgColor, textColor = 'FFFFFF') {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorders(),
      shading: { fill: bgColor, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      width: { size: 9360, type: WidthType.DXA },
      children: [new Paragraph({ spacing: { after: 0 }, children: [
        new TextRun({ text, bold: true, size: 26, color: textColor, font: 'Malgun Gothic' })
      ]})]
    })]})],
  });
}

function quoteBox(lines, bgColor, borderColor) {
  const children = lines.map(l => new Paragraph({
    spacing: { after: 60 },
    children: boldRuns(l),
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: bordersFrom(borderColor || 'CCCCCC'),
      shading: { fill: bgColor || 'F8F8F8', type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 240, right: 240 },
      width: { size: 9360, type: WidthType.DXA },
      children,
    })]})],
  });
}

function spacer(pts = 100) {
  return new Paragraph({ spacing: { after: pts }, children: [] });
}

// ── 참여자 교재 생성 ──────────────────────────────────────────

function buildParticipantDocx(lesson, subject) {
  const col = C[subject.key];
  const { weekNum, title, scriptures, intro, lecture, wordStudy, discussion, tasks, prayer, preview } = lesson;
  const children = [];

  // ── 표지 ──
  children.push(
    spacer(600),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: `${subject.fullName}: 4차원의 영성 12주 성경공부`, size: 24, color: col.primary, font: 'Malgun Gothic' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: `제 ${weekNum}과`, size: 52, bold: true, color: col.primary, font: 'Malgun Gothic' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: title, size: 36, bold: true, color: col.secondary, font: 'Malgun Gothic' })],
    }),
  );

  // 핵심 말씀 (표지에 첫 번째 말씀)
  if (scriptures.length > 0) {
    children.push(
      new Table({
        width: { size: 7200, type: WidthType.DXA },
        columnWidths: [7200],
        rows: [new TableRow({ children: [new TableCell({
          borders: bordersFrom(col.secondary),
          shading: { fill: col.pale, type: ShadingType.CLEAR },
          margins: { top: 200, bottom: 200, left: 300, right: 300 },
          width: { size: 7200, type: WidthType.DXA },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
              children: [new TextRun({ text: scriptures[0].ref, bold: true, size: 22, color: col.primary, font: 'Malgun Gothic' })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
              children: [new TextRun({ text: `"${scriptures[0].text}"`, size: 20, color: '333333', font: 'Malgun Gothic', italics: true })] }),
          ],
        })]})],
      }),
      spacer(60),
    );
  }

  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      children: [new TextRun({ text: `V1-1  |  ${weekNum}주차`, size: 18, color: '888888', font: 'Malgun Gothic' })] }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ── 1. 이번 주 핵심 말씀 ──
  children.push(sectionHeader('📖 이번 주 핵심 말씀', col.primary), spacer(80));
  for (const s of scriptures) {
    children.push(
      quoteBox([`${s.ref}`, `"${s.text}"`], col.pale, col.secondary),
      spacer(80),
    );
  }

  // ── 2. 도입 질문 ──
  children.push(sectionHeader('💬 도입 질문 (마음 열기)', col.secondary), spacer(80));
  children.push(para('편안하게 이야기 나눠 봅시다. 정답이 없는 질문입니다. 솔직하게 나눠 주세요.', { color: '666666', size: 20 }));
  children.push(spacer(60));
  for (let i = 0; i < intro.length; i++) {
    children.push(new Paragraph({
      spacing: { after: 80 },
      indent: { left: 360 },
      children: [
        new TextRun({ text: `${i + 1}.  `, bold: true, size: 22, color: col.secondary, font: 'Malgun Gothic' }),
        ...boldRuns(intro[i]),
      ],
    }));
    children.push(new Paragraph({
      spacing: { after: 60 },
      indent: { left: 560 },
      children: [new TextRun({ text: '', size: 18 })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 1 } },
    }));
    children.push(spacer(40));
  }

  // ── 3. 본문 강의 ──
  children.push(sectionHeader('📚 본문 강의', col.primary), spacer(80));
  for (const sec of lecture) {
    if (sec.subtitle) {
      children.push(new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: sec.subtitle, bold: true, size: 24, color: col.primary, font: 'Malgun Gothic' })],
      }));
    }
    for (const p of sec.paragraphs) {
      children.push(new Paragraph({
        spacing: { after: 100 },
        children: boldRuns(p),
      }));
    }
  }

  // ── 4. 말씀 연구 ──
  children.push(spacer(100), sectionHeader('🔍 말씀 연구', col.secondary), spacer(80));
  children.push(para('아래 구절들을 함께 찾아 읽고, 각 구절이 오늘의 주제와 어떻게 연결되는지 생각해 봅시다.', { color: '555555', size: 20 }));
  children.push(spacer(60));

  if (wordStudy.length > 0) {
    // 헤더 행
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          borders: bordersFrom(col.secondary),
          shading: { fill: col.primary, type: ShadingType.CLEAR },
          width: { size: 1400, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '구절', bold: true, color: 'FFFFFF', font: 'Malgun Gothic', size: 20 })] })],
        }),
        new TableCell({
          borders: bordersFrom(col.secondary),
          shading: { fill: col.primary, type: ShadingType.CLEAR },
          width: { size: 2960, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '내용', bold: true, color: 'FFFFFF', font: 'Malgun Gothic', size: 20 })] })],
        }),
        new TableCell({
          borders: bordersFrom(col.secondary),
          shading: { fill: col.primary, type: ShadingType.CLEAR },
          width: { size: 5000, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '주석 / 적용', bold: true, color: 'FFFFFF', font: 'Malgun Gothic', size: 20 })] })],
        }),
      ],
    });

    const dataRows = wordStudy.map((row, i) => new TableRow({
      children: [
        new TableCell({
          borders: bordersFrom('CCCCCC'),
          shading: { fill: i % 2 === 0 ? col.pale : 'FFFFFF', type: ShadingType.CLEAR },
          width: { size: 1400, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: row.ref, bold: true, font: 'Malgun Gothic', size: 20, color: col.secondary })] })],
        }),
        new TableCell({
          borders: bordersFrom('CCCCCC'),
          shading: { fill: i % 2 === 0 ? col.pale : 'FFFFFF', type: ShadingType.CLEAR },
          width: { size: 2960, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 }, children: boldRuns(row.content) })],
        }),
        new TableCell({
          borders: bordersFrom('CCCCCC'),
          shading: { fill: i % 2 === 0 ? col.pale : 'FFFFFF', type: ShadingType.CLEAR },
          width: { size: 5000, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ spacing: { after: 0 }, children: boldRuns(row.commentary) })],
        }),
      ],
    }));

    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1400, 2960, 5000],
      rows: [headerRow, ...dataRows],
    }));
    children.push(spacer(100));
  }

  // ── 5. 토론 질문 ──
  children.push(sectionHeader('🗣️ 토론 질문 (소그룹 나눔)', col.primary), spacer(80));
  children.push(para('아래 질문들을 순서대로 나눠 보세요. 모든 질문을 다 다루지 않아도 됩니다.', { color: '555555', size: 20 }));
  children.push(spacer(60));

  let qNum = 1;
  for (const g of discussion) {
    children.push(new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: g.group, bold: true, size: 22, color: col.secondary, font: 'Malgun Gothic' })],
    }));
    for (const q of g.items) {
      children.push(new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: `Q${qNum}.  `, bold: true, size: 22, color: col.primary, font: 'Malgun Gothic' }),
          ...boldRuns(q),
        ],
      }));
      // 답변 쓰기 칸
      for (let l = 0; l < 2; l++) {
        children.push(new Paragraph({
          spacing: { after: 40 },
          indent: { left: 560 },
          children: [new TextRun({ text: '                                              ', size: 20 })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 1 } },
        }));
      }
      children.push(spacer(30));
      qNum++;
    }
  }

  // ── 6. 실천 과제 ──
  children.push(spacer(80), sectionHeader('✅ 이번 주 실천 과제', col.secondary), spacer(80));
  if (tasks.individual) {
    children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '개인 실천', bold: true, size: 22, color: col.primary, font: 'Malgun Gothic' })] }));
    children.push(quoteBox([tasks.individual], col.pale, col.secondary));
    children.push(spacer(80));
  }
  if (tasks.group) {
    children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '가정 / 그룹 실천', bold: true, size: 22, color: col.primary, font: 'Malgun Gothic' })] }));
    children.push(quoteBox([tasks.group], col.pale, col.secondary));
    children.push(spacer(80));
  }

  // ── 7. 마무리 기도 ──
  children.push(sectionHeader('🙏 마무리 기도', col.primary), spacer(80));
  children.push(para('인도자가 읽거나, 함께 소리 내어 읽어도 좋습니다.', { color: '666666', size: 20 }));
  children.push(spacer(60));
  const prayerLines = prayer.split('\n').filter(Boolean);
  children.push(quoteBox(prayerLines.length > 0 ? prayerLines : [prayer], col.pale, col.secondary));
  children.push(spacer(100));

  // ── 8. 다음 주 예고 ──
  if (preview) {
    children.push(new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [new TableRow({ children: [new TableCell({
        borders: bordersFrom(col.secondary),
        shading: { fill: col.light, type: ShadingType.CLEAR },
        margins: { top: 140, bottom: 140, left: 240, right: 240 },
        width: { size: 9360, type: WidthType.DXA },
        children: [new Paragraph({ spacing: { after: 0 }, children: [
          new TextRun({ text: '다음 주 예고  ', bold: true, size: 22, color: col.primary, font: 'Malgun Gothic' }),
          ...boldRuns(preview.replace(/\*\*/g, '')),
        ]})],
      })]})],
    }));
  }

  return new Document({
    styles: {
      default: {
        document: { run: { font: 'Malgun Gothic', size: 22 } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1260 },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: col.secondary, space: 1 } },
          spacing: { after: 0 },
          children: [
            new TextRun({ text: `${subject.fullName} — ${weekNum}주차: ${title}`, size: 18, color: col.primary, font: 'Malgun Gothic' }),
            new TextRun({ text: '\t', size: 18, font: 'Malgun Gothic' }),
            new TextRun({ text: 'V1-1', size: 18, color: '888888', font: 'Malgun Gothic' }),
          ],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888', font: 'Malgun Gothic' }),
          ],
        })] }),
      },
      children,
    }],
  });
}

// ── 인도자 매뉴얼 생성 ───────────────────────────────────────

function buildFacilitatorDocx(lesson, subject) {
  const col = C[subject.key];
  const { weekNum, title, scriptures, intro, lecture, wordStudy, discussion, tasks, prayer, preview } = lesson;
  const children = [];

  // ── 표지 ──
  children.push(
    spacer(500),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: '인도자 매뉴얼', size: 24, color: 'FFFFFF', font: 'Malgun Gothic' })],
    }),
  );

  // 표지 배경 블록
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [new TableRow({ children: [new TableCell({
        borders: noBorders(),
        shading: { fill: col.primary, type: ShadingType.CLEAR },
        margins: { top: 300, bottom: 300, left: 400, right: 400 },
        width: { size: 9360, type: WidthType.DXA },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
            children: [new TextRun({ text: subject.fullName, size: 24, color: col.light, font: 'Malgun Gothic' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
            children: [new TextRun({ text: `제 ${weekNum}과 인도자 매뉴얼`, size: 48, bold: true, color: 'FFFFFF', font: 'Malgun Gothic' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
            children: [new TextRun({ text: title, size: 30, color: col.light, font: 'Malgun Gothic' })] }),
        ],
      })]})],
    }),
    spacer(80),
  );

  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      children: [new TextRun({ text: `V1-1  |  ${weekNum}주차  |  소그룹 60~90분용`, size: 18, color: '888888', font: 'Malgun Gothic' })] }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ── 섹션 1: 이번 주 개요 ──
  children.push(sectionHeader('📋 이번 주 개요', col.primary), spacer(80));

  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2800, 6560],
    rows: [
      tableRow2col('주제', title, col),
      tableRow2col('핵심 말씀', scriptures.map(s => s.ref).join(' / '), col),
      tableRow2col('소요 시간', '60분 기본 / 90분 확장', col),
      tableRow2col('준비물', '성경, 교재, 필기구, 출석부', col),
      tableRow2col('이번 주 목표', `참여자들이 ${title}의 의미를 이해하고 삶에 적용하도록 돕는다.`, col),
    ],
  }));
  children.push(spacer(100));

  // ── 섹션 2: 시간 계획 ──
  children.push(sectionHeader('⏰ 시간 계획표', col.secondary), spacer(80));
  const timeItems = [
    ['0~5분', '환영 및 기도 오프닝', '참여자 맞이, 간단 기도로 시작'],
    ['5~15분', '도입 질문', `질문 ${intro.length}개 중 1~2개 선택하여 나눔`],
    ['15~30분', '본문 강의', '인도자가 주요 내용 요약 설명'],
    ['30~45분', '말씀 연구', `${wordStudy.length}개 구절 함께 읽고 나눔`],
    ['45~65분', '토론 질문', `총 ${discussion.reduce((a, g) => a + g.items.length, 0)}개 중 핵심 질문 위주로 진행`],
    ['65~75분', '실천 과제 나눔', '이번 주 실천 과제 함께 읽고 결단'],
    ['75~80분', '마무리 기도', '함께 소리 내어 기도'],
    ['80~90분', '(선택) 친교 시간', '다과와 함께 자유 대화'],
  ];
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 3000, 5160],
    rows: [
      new TableRow({ tableHeader: true, children: [
        headerCell('시간', col.primary, 1200),
        headerCell('활동', col.primary, 3000),
        headerCell('인도자 참고', col.primary, 5160),
      ]}),
      ...timeItems.map(([t, a, n], i) => new TableRow({ children: [
        dataCell(t, i, col, 1200),
        dataCell(a, i, col, 3000, true),
        dataCell(n, i, col, 5160),
      ]})),
    ],
  }));
  children.push(spacer(100));

  // ── 섹션 3: 핵심 말씀 해설 ──
  children.push(sectionHeader('📖 핵심 말씀 인도자 해설', col.primary), spacer(80));
  for (const s of scriptures) {
    children.push(new Paragraph({ spacing: { after: 60 },
      children: [new TextRun({ text: s.ref, bold: true, size: 24, color: col.secondary, font: 'Malgun Gothic' })] }));
    children.push(quoteBox([`"${s.text}"`], col.pale, col.secondary));
    children.push(para('▸ 인도 포인트: 이 말씀이 오늘의 주제와 어떻게 연결되는지 1~2문장으로 연결해 주세요.', { color: '666666', size: 20 }));
    children.push(spacer(80));
  }

  // ── 섹션 4: 도입 질문 가이드 ──
  children.push(sectionHeader('💬 도입 질문 인도 가이드', col.secondary), spacer(80));
  children.push(quoteBox([
    '▸ 시간에 따라 1~2개만 선택하세요.',
    '▸ 정답보다 솔직한 나눔을 격려하세요.',
    '▸ 인도자도 먼저 짧게 자신의 이야기를 나눠 분위기를 열어 주세요.',
  ], 'F0F4FF', col.secondary));
  children.push(spacer(80));
  for (let i = 0; i < intro.length; i++) {
    children.push(new Paragraph({ spacing: { after: 40 }, children: [
      new TextRun({ text: `Q${i + 1}.  `, bold: true, size: 22, color: col.secondary, font: 'Malgun Gothic' }),
      ...boldRuns(intro[i]),
    ]}));
    children.push(para(`   → 예상 답변 방향: 개인 경험이나 구체적 사례를 자연스럽게 이끌어내세요.`, { color: '666666', size: 20, indent: { left: 360 } }));
    children.push(spacer(60));
  }

  // ── 섹션 5: 본문 강의 요약 ──
  children.push(sectionHeader('📚 본문 강의 핵심 요약', col.primary), spacer(80));
  children.push(quoteBox([
    '▸ 강의 전체를 읽기보다 각 소제목의 핵심 메시지 1~2문장을 전달하세요.',
    '▸ 조용기 목사님 설교의 고유 용어(4차원, 3차원 등)를 쉽게 풀어 설명하세요.',
    '▸ 강의 후 "이 중에서 가장 와닿는 부분이 있으신가요?"로 전환하세요.',
  ], 'FFF8F0', col.primary));
  children.push(spacer(80));
  for (const sec of lecture) {
    if (sec.subtitle) {
      children.push(new Paragraph({ spacing: { after: 60 },
        children: [new TextRun({ text: `▶ ${sec.subtitle}`, bold: true, size: 22, color: col.primary, font: 'Malgun Gothic' })] }));
    }
    if (sec.paragraphs.length > 0) {
      children.push(para(`핵심: ${sec.paragraphs[0].substring(0, 80)}...`, { color: '444444', size: 20, indent: { left: 360 } }));
    }
    children.push(spacer(40));
  }

  // ── 섹션 6: 토론 질문 심화 가이드 ──
  children.push(spacer(60), sectionHeader('🗣️ 토론 질문 심화 가이드', col.secondary), spacer(80));
  children.push(quoteBox([
    '▸ 시간이 부족하면 [적용] 질문 1개를 중심으로 진행하세요.',
    '▸ 한 사람이 독점하지 않도록 "다른 분은 어떻게 생각하세요?"로 참여를 넓히세요.',
    '▸ 민감한 이야기가 나오면 비밀보장을 상기시켜 주세요.',
  ], 'F5F5FF', col.secondary));
  children.push(spacer(80));

  let qIdx = 1;
  for (const g of discussion) {
    children.push(new Paragraph({ spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: g.group, bold: true, size: 22, color: col.secondary, font: 'Malgun Gothic' })] }));
    for (const q of g.items) {
      children.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [
        new TextRun({ text: `Q${qIdx}.  `, bold: true, size: 22, color: col.primary, font: 'Malgun Gothic' }),
        ...boldRuns(q),
      ]}));
      children.push(para('   → 심화 질문: "이 말씀이 내 삶의 어떤 구체적인 상황에서 힘이 되었나요?"', { color: '777777', size: 20, indent: { left: 360 } }));
      children.push(para('   → 주의사항: 너무 이론적 토론이 되지 않도록 구체적 삶으로 연결하세요.', { color: '777777', size: 20, indent: { left: 360 } }));
      children.push(spacer(60));
      qIdx++;
    }
  }

  // ── 섹션 7: 실천 과제 나눔 가이드 ──
  children.push(sectionHeader('✅ 실천 과제 나눔 가이드', col.primary), spacer(80));
  children.push(quoteBox([
    '▸ 지난 주 실천 과제를 먼저 점검하세요 (2~3분).',
    '▸ 이번 주 실천 과제를 함께 소리 내어 읽으세요.',
    '▸ 각자 이번 주에 실제로 실천할 한 가지를 선언하게 하세요.',
  ], col.pale, col.secondary));
  children.push(spacer(80));
  if (tasks.individual) {
    children.push(para('개인 실천 과제:', { bold: true, color: col.primary }));
    children.push(quoteBox([tasks.individual], col.pale, col.secondary));
    children.push(spacer(60));
  }
  if (tasks.group) {
    children.push(para('가정/그룹 실천 과제:', { bold: true, color: col.primary }));
    children.push(quoteBox([tasks.group], col.pale, col.secondary));
    children.push(spacer(80));
  }

  // ── 섹션 8: 마무리 기도 ──
  children.push(sectionHeader('🙏 마무리 기도', col.secondary), spacer(80));
  children.push(quoteBox([
    '▸ 인도자가 먼저 읽고, 참여자들과 함께 소리 내어 읽을 수 있습니다.',
    '▸ 또는 각자 한 문장씩 돌아가며 기도해도 좋습니다.',
  ], 'F8F8F8', col.secondary));
  children.push(spacer(60));
  const prayerLines = prayer.split('\n').filter(Boolean);
  children.push(quoteBox(prayerLines.length > 0 ? prayerLines : [prayer], col.pale, col.primary));
  children.push(spacer(100));

  // ── 섹션 9: 다음 주 예고 ──
  if (preview) {
    children.push(sectionHeader('📅 다음 주 예고 및 준비사항', col.primary), spacer(80));
    children.push(quoteBox([preview.replace(/\*\*/g, '')], col.light, col.secondary));
    children.push(spacer(60));
    children.push(quoteBox([
      '▸ 다음 주 교재를 미리 읽고 핵심 메시지를 파악하세요.',
      '▸ 이번 주 실천 과제의 결과를 다음 주에 나눌 수 있도록 독려하세요.',
      '▸ 모임 장소, 시간, 출석 여부를 확인하세요.',
    ], 'F0F8FF', col.secondary));
  }

  // ── 섹션 10: 특별 상황 대처법 ──
  children.push(spacer(100), sectionHeader('⚠️ 특별 상황 대처법', col.secondary), spacer(80));
  const specialCases = [
    ['침묵이 길어질 때', '인도자가 먼저 짧게 자신의 경험을 나누고, "여러분의 생각이 궁금합니다"로 초대하세요.'],
    ['한 사람이 독점할 때', '"좋은 나눔 감사합니다. 다른 분들의 생각도 들어볼까요?"로 자연스럽게 전환하세요.'],
    ['신학적 논쟁이 생길 때', '"오늘은 이 부분은 함께 더 공부해보기로 하고, 다음 질문으로 넘어갑시다"로 정리하세요.'],
    ['감정이 격해질 때', '조용히 기도로 전환하거나, "지금 이 마음을 하나님께 드리겠습니다"라고 말하세요.'],
    ['시간이 부족할 때', '도입 질문 1개 + 토론 질문 [적용] 1개 + 마무리 기도로 최소 구성을 유지하세요.'],
  ];
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 6960],
    rows: [
      new TableRow({ tableHeader: true, children: [
        headerCell('상황', col.primary, 2400),
        headerCell('대처 방법', col.primary, 6960),
      ]}),
      ...specialCases.map(([s, a], i) => new TableRow({ children: [
        dataCell(s, i, col, 2400, true),
        dataCell(a, i, col, 6960),
      ]})),
    ],
  }));
  children.push(spacer(100));

  // ── 섹션 11: 모임 전 체크리스트 ──
  children.push(sectionHeader('📝 모임 전 체크리스트', col.primary), spacer(80));
  const checklist = [
    '교재 숙지: 이번 주 교재 전체를 2회 이상 읽었다',
    '기도 준비: 각 참여자를 위해 이름을 부르며 기도했다',
    '장소 확인: 모임 장소, 온도, 좌석 배치를 확인했다',
    '교재 준비: 참여자 인원 수에 맞게 교재를 준비했다',
    '시간 계획: 오늘 진행할 질문과 섹션을 표시해 두었다',
    '출석 확인: 참여 여부를 사전에 연락으로 확인했다',
  ];
  for (const item of checklist) {
    children.push(new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [
        new TextRun({ text: '☐  ', size: 22, color: col.secondary, font: 'Malgun Gothic' }),
        new TextRun({ text: item, size: 22, font: 'Malgun Gothic' }),
      ],
    }));
  }

  return new Document({
    styles: {
      default: { document: { run: { font: 'Malgun Gothic', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1260 },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: col.primary, space: 1 } },
          spacing: { after: 0 },
          children: [
            new TextRun({ text: `[인도자 매뉴얼] ${subject.fullName} — ${weekNum}주차: ${title}`, size: 18, color: col.primary, font: 'Malgun Gothic' }),
            new TextRun({ text: '\t', size: 18 }),
            new TextRun({ text: '비공개', size: 18, color: col.primary, font: 'Malgun Gothic', bold: true }),
          ],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888', font: 'Malgun Gothic' })],
        })] }),
      },
      children,
    }],
  });
}

// ── 테이블 셀 헬퍼 ──────────────────────────────────────────
function headerCell(text, bgColor, width) {
  return new TableCell({
    borders: bordersFrom(bgColor),
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ spacing: { after: 0 }, children: [
      new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Malgun Gothic', size: 20 })
    ]})],
  });
}

function dataCell(text, rowIndex, col, width, isBold = false) {
  return new TableCell({
    borders: bordersFrom('CCCCCC'),
    shading: { fill: rowIndex % 2 === 0 ? col.pale : 'FFFFFF', type: ShadingType.CLEAR },
    width: { size: width, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ spacing: { after: 0 }, children: [
      new TextRun({ text, bold: isBold, font: 'Malgun Gothic', size: 20 })
    ]})],
  });
}

function tableRow2col(label, value, col) {
  return new TableRow({ children: [
    new TableCell({
      borders: bordersFrom('CCCCCC'),
      shading: { fill: col.pale, type: ShadingType.CLEAR },
      width: { size: 2800, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [
        new TextRun({ text: label, bold: true, font: 'Malgun Gothic', size: 20, color: col.primary })
      ]})],
    }),
    new TableCell({
      borders: bordersFrom('CCCCCC'),
      shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
      width: { size: 6560, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ spacing: { after: 0 }, children: boldRuns(value) })],
    }),
  ]});
}

// ── 메인 실행 ─────────────────────────────────────────────────

async function main() {
  console.log('V1-1 전체 교재 생성 시작...\n');

  let total = 0;
  let success = 0;

  for (const subject of SUBJECTS) {
    const mdPath = join(ROOT, 'curriculum', subject.file);
    console.log(`\n[${subject.key}] 교재 파싱 중: ${subject.file}`);

    let lessons;
    try {
      lessons = parseCurriculum(mdPath);
      console.log(`  → ${lessons.length}개 과 파싱 완료`);
    } catch (err) {
      console.error(`  ✗ 파싱 실패: ${err.message}`);
      continue;
    }

    for (const lesson of lessons) {
      const { weekNum, title } = lesson;
      const baseFilename = `${subject.key}_V1-1_${weekNum}과`;
      const participantPath = join(OUT, `${baseFilename}.docx`);
      const facilitatorPath = join(OUT, `${baseFilename}_인도자매뉴얼.docx`);

      // 참여자 교재 생성
      total++;
      try {
        const doc = buildParticipantDocx(lesson, subject);
        const buf = await Packer.toBuffer(doc);
        writeFileSync(participantPath, buf);
        success++;
        console.log(`  ✓ ${baseFilename}.docx`);
      } catch (err) {
        console.error(`  ✗ ${baseFilename}.docx 실패: ${err.message}`);
      }

      // 인도자 매뉴얼 생성
      total++;
      try {
        const doc = buildFacilitatorDocx(lesson, subject);
        const buf = await Packer.toBuffer(doc);
        writeFileSync(facilitatorPath, buf);
        success++;
        console.log(`  ✓ ${baseFilename}_인도자매뉴얼.docx`);
      } catch (err) {
        console.error(`  ✗ ${baseFilename}_인도자매뉴얼.docx 실패: ${err.message}`);
      }
    }
  }

  console.log(`\n완료: ${success}/${total}개 파일 생성 성공`);
  console.log(`출력 경로: ${OUT}`);
}

main().catch(console.error);
