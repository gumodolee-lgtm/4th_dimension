/**
 * 특정 과(lesson) 재생성 스크립트 (v1-2 포맷)
 * 사용법: node scripts/regenerate-lessons.js --element=생각 --lessons=1,2
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
const MAX_TOKENS = 4096;
const LESSON_DELAY = 35000; // 35초 — output token rate limit 대응

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
  const lessonsArg = args.find(a => a.startsWith('--lessons='))?.split('=')[1] || '1,2';
  const targetLessons = lessonsArg.split(',').map(Number);

  const plan = CURRICULUM_PLAN[element];
  if (!plan) {
    console.error(`알 수 없는 요소: ${element}`);
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const outDir = join(OUTPUT_DIR, element);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  console.log(`v1-2 '${element}' ${targetLessons.join(',')}과 재생성`);
  console.log(`모델: ${MODEL}, max_tokens: ${MAX_TOKENS}\n`);

  for (let i = 0; i < targetLessons.length; i++) {
    const lessonNum = targetLessons[i];
    const lessonInfo = plan.find(l => l.lesson === lessonNum);
    if (!lessonInfo) {
      console.error(`${element}에 ${lessonNum}과가 없습니다.`);
      continue;
    }

    const classified = pickBestSermon(element, lessonNum);
    let sermonText = '';
    if (classified) {
      const sermonPath = join(SERMON_DIR, classified.sourceFile);
      if (existsSync(sermonPath)) {
        const parsed = parseSermonFile(sermonPath);
        sermonText = `제목: ${parsed.title}\n본문: ${parsed.scriptureRef}\n\n${parsed.content}`;
        console.log(`${lessonNum}과: "${lessonInfo.theme}" ← ${classified.title} (${classified.date})`);
      }
    } else {
      sermonText = `핵심 성경 본문: ${lessonInfo.scripture}\n(참고 설교 없음)`;
      console.log(`${lessonNum}과: "${lessonInfo.theme}" ← (설교 없음)`);
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildPrompt(element, lessonInfo, sermonText) }],
    });

    const content = response.content[0].text.trim();
    const outFile = join(outDir, `${String(lessonNum).padStart(2, '0')}_${element}_${lessonNum}과.md`);
    writeFileSync(outFile, content, 'utf-8');

    const lines = content.split('\n').length;
    const chars = content.length;
    console.log(`  → 저장: ${outFile}`);
    console.log(`  → 분량: ${lines}줄, ${chars}자`);
    console.log(`  → 토큰 사용: input ${response.usage.input_tokens}, output ${response.usage.output_tokens}`);

    // 마지막 과 제외하고 딜레이
    if (i < targetLessons.length - 1) {
      console.log(`\n  (${LESSON_DELAY / 1000}초 대기 — rate limit 방지)\n`);
      await new Promise(r => setTimeout(r, LESSON_DELAY));
    }
  }

  console.log('\n✅ 완료!');
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
