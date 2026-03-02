/**
 * v1-2: 단일 과(lesson) 생성기
 * 사용법: node scripts/generate-lesson.js --element=생각 --lesson=1 --sermon=2012-06-03.txt
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import { parseSermonFile } from './lib/parser.js';
import { CURRICULUM_PLAN } from './lib/curriculum-plan.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TEMPLATE_FILE = join(__dirname, 'templates', 'lesson-template.md');
const SERMON_DIR = join(ROOT, 'sermon');
const OUTPUT_DIR = join(ROOT, 'curriculum', 'v1-2');

const MODEL = 'claude-sonnet-4-6';

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

async function generateLesson(client, element, lessonNum, sermonFile) {
  const plan = CURRICULUM_PLAN[element];
  if (!plan) throw new Error(`알 수 없는 요소: ${element}`);

  const lessonInfo = plan.find(l => l.lesson === lessonNum);
  if (!lessonInfo) throw new Error(`${element}에 ${lessonNum}과가 없습니다.`);

  // 설교 텍스트 로드
  const sermonPath = join(SERMON_DIR, sermonFile);
  const sermon = parseSermonFile(sermonPath);
  const sermonText = `제목: ${sermon.title}\n본문: ${sermon.scriptureRef}\n\n${sermon.content}`;

  console.log(`생성 중: ${element} ${lessonNum}과 — "${lessonInfo.theme}"`);
  console.log(`참고 설교: ${sermon.title} (${sermon.date})`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildPrompt(element, lessonInfo, sermonText) }],
  });

  return response.content[0].text.trim();
}

async function main() {
  const args = process.argv.slice(2);
  const elementArg = args.find(a => a.startsWith('--element='))?.split('=')[1] || '생각';
  const lessonArg = parseInt(args.find(a => a.startsWith('--lesson='))?.split('=')[1] || '1');
  const sermonArg = args.find(a => a.startsWith('--sermon='))?.split('=')[1];

  if (!sermonArg) {
    console.error('사용법: node scripts/generate-lesson.js --element=생각 --lesson=1 --sermon=2012-06-03.txt');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content = await generateLesson(client, elementArg, lessonArg, sermonArg);

  // 저장
  const outDir = join(OUTPUT_DIR, elementArg);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${String(lessonArg).padStart(2, '0')}_${elementArg}_${lessonArg}과.md`);
  writeFileSync(outFile, content, 'utf-8');

  console.log(`\n✓ 저장 완료: ${outFile}`);
  console.log('\n--- 미리보기 (첫 300자) ---');
  console.log(content.substring(0, 300) + '...');
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
