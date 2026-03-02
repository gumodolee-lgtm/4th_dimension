/**
 * v1-2: 전체 커리큘럼 빌더
 * classified/ 폴더의 분류 결과를 활용해 각 과에 최적 설교를 자동 매칭 후 12과 전체 생성
 *
 * 사용법: node scripts/build-curriculum-v2.js --element=생각
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import { parseSermonFile } from './lib/parser.js';
import { CURRICULUM_PLAN } from './lib/curriculum-plan.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TEMPLATE_FILE = join(__dirname, 'templates', 'lesson-template.md');
const SERMON_DIR = join(ROOT, 'sermon');
const CLASSIFIED_DIR = join(ROOT, 'classified');
const OUTPUT_DIR = join(ROOT, 'curriculum', 'v1-2');

const MODEL = 'claude-sonnet-4-6';
const LESSON_DELAY = 2000; // ms between lessons

// classified/ 에서 과 유형별 최적 설교 선택
function pickBestSermon(element, lessonNum, usedFiles = new Set()) {
  const dir = join(CLASSIFIED_DIR, element);
  if (!existsSync(dir)) return null;

  const weekTypeMap = {
    1: '1', 2: '2-4', 3: '2-4', 4: '2-4',
    5: '5-8', 6: '5-8', 7: '5-8', 8: '5-8',
    9: '9-11', 10: '9-11', 11: '9-11', 12: '12',
  };
  const targetWeek = weekTypeMap[lessonNum] || '5-8';

  const sermons = readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dir, f), 'utf-8')))
    .filter(s => !usedFiles.has(s.sourceFile))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const match = sermons.find(s => s.weekSuggestion === targetWeek);
  return match || sermons[0] || null;
}

function buildPrompt(element, lessonInfo, sermonText) {
  const template = readFileSync(TEMPLATE_FILE, 'utf-8');
  const userSection = template.split('## User Prompt Template')[1]?.trim() || '';
  return userSection
    .replace(/\{element\}/g, element)
    .replace(/\{lessonNum\}/g, lessonInfo.lesson)
    .replace(/\{theme\}/g, lessonInfo.theme)
    .replace(/\{scriptureRef\}/g, lessonInfo.scripture)
    .replace(/\{sermonText\}/g, sermonText.substring(0, 5000));
}

function buildSystemPrompt() {
  const template = readFileSync(TEMPLATE_FILE, 'utf-8');
  return template.split('## System Prompt')[1]?.split('## User Prompt Template')[0]?.trim() || '';
}

async function main() {
  const args = process.argv.slice(2);
  const element = args.find(a => a.startsWith('--element='))?.split('=')[1] || '생각';

  const plan = CURRICULUM_PLAN[element];
  if (!plan) {
    console.error(`알 수 없는 요소: ${element}`);
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const usedFiles = new Set();
  const chapters = [];
  const outDir = join(OUTPUT_DIR, element);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  console.log(`v1-2 '${element}' 12과 교재 생성 시작`);
  console.log(`모델: ${MODEL}\n`);

  for (const lessonInfo of plan) {
    const classified = pickBestSermon(element, lessonInfo.lesson, usedFiles);

    let sermonText = '';
    if (classified) {
      const sermonPath = join(SERMON_DIR, classified.sourceFile);
      if (existsSync(sermonPath)) {
        const parsed = parseSermonFile(sermonPath);
        sermonText = `제목: ${parsed.title}\n본문: ${parsed.scriptureRef}\n\n${parsed.content}`;
        usedFiles.add(classified.sourceFile);
        console.log(`${lessonInfo.lesson}과: "${lessonInfo.theme}" ← ${classified.title}`);
      }
    } else {
      console.log(`${lessonInfo.lesson}과: "${lessonInfo.theme}" ← (설교 없음, 성경 본문만 사용)`);
      sermonText = `핵심 성경 본문: ${lessonInfo.scripture}\n(참고 설교 없음 — 성경 본문 중심으로 작성)`;
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildPrompt(element, lessonInfo, sermonText) }],
    });

    const content = response.content[0].text.trim();
    chapters.push(content);

    // 과별 파일 저장
    const lessonFile = join(outDir, `${String(lessonInfo.lesson).padStart(2, '0')}_${element}_${lessonInfo.lesson}과.md`);
    writeFileSync(lessonFile, content, 'utf-8');

    await new Promise(r => setTimeout(r, LESSON_DELAY));
  }

  // 전체 교재 합본
  const cover = `# ${element}의 삶 (v1-2): 4차원의 영성 12주 성경공부

> **버전**: v1-2 (표준 포맷 기반)
> **대상**: 소그룹 (60~90분/주)
> **생성일**: ${new Date().toLocaleDateString('ko-KR')}

---

`;
  const full = cover + chapters.join('\n\n---\n\n');
  const mainFile = join(OUTPUT_DIR, `${element}_12주_교재_v1-2.md`);
  writeFileSync(mainFile, full, 'utf-8');

  console.log('\n═══════════════════════════════');
  console.log(`완료! 합본 저장: ${mainFile}`);
  console.log(`과별 파일: ${outDir}/`);
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
