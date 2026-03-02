import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import { parseSermonFile, getSermonFiles } from './lib/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SERMON_DIR = join(ROOT, 'sermon');
const CLASSIFIED_DIR = join(ROOT, 'classified');
const STATS_FILE = join(CLASSIFIED_DIR, 'stats.json');
const PROMPT_FILE = join(__dirname, 'prompts', 'classify-prompt.md');

const MODEL = 'claude-sonnet-4-6';
const BATCH_SIZE = 5;
const RATE_LIMIT_DELAY = 2000; // ms between batches

// CLI 인수 파싱
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const elementArg = args.find(a => a.startsWith('--element='));
const resume = args.includes('--resume');

const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const FILTER_ELEMENT = elementArg ? elementArg.split('=')[1] : null;

// stats.json 로드/초기화
function loadStats() {
  if (existsSync(STATS_FILE)) {
    return JSON.parse(readFileSync(STATS_FILE, 'utf-8'));
  }
  return {
    totalProcessed: 0,
    lastUpdated: null,
    byElement: { 생각: 0, 믿음: 0, 꿈: 0, 말: 0 },
    processedFiles: [],
    errors: [],
  };
}

function saveStats(stats) {
  stats.lastUpdated = new Date().toISOString();
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
}

// 분류 결과 저장
function saveResult(result) {
  const dir = join(CLASSIFIED_DIR, result.primaryElement);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${result.id}.json`);
  writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
}

// 프롬프트 빌드
function buildPrompt(sermon) {
  const promptTemplate = readFileSync(PROMPT_FILE, 'utf-8');
  // User Prompt Template 섹션 추출
  const userSection = promptTemplate.split('## User Prompt Template')[1]?.trim() || '';
  return userSection
    .replace('{title}', sermon.title)
    .replace('{scriptureRef}', sermon.scriptureRef)
    .replace('{content}', sermon.content.substring(0, 4000)); // 최대 4000자
}

function buildSystemPrompt() {
  const promptTemplate = readFileSync(PROMPT_FILE, 'utf-8');
  const systemSection = promptTemplate.split('## System Prompt')[1]?.split('## User Prompt Template')[0]?.trim() || '';
  return systemSection;
}

// Claude API 호출로 설교 분류
async function classifySermon(client, sermon) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildPrompt(sermon) }],
  });

  const raw = response.content[0].text.trim();
  // 마크다운 코드블록(```json ... ```) 제거
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(text);

  return {
    id: sermon.id,
    date: sermon.date,
    title: sermon.title,
    seriesNumber: sermon.seriesNumber,
    scriptureRef: sermon.scriptureRef,
    primaryElement: parsed.primaryElement,
    secondaryElements: parsed.secondaryElements || [],
    relevanceScore: parsed.relevanceScore,
    summary: parsed.summary,
    keyVerses: parsed.keyVerses || [],
    applicationKeywords: parsed.applicationKeywords || [],
    weekSuggestion: parsed.weekSuggestion,
    sourceFile: sermon.sourceFile,
  };
}

// 메인 실행
async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let allFiles = getSermonFiles(SERMON_DIR);
  const stats = loadStats();

  // --resume: 이미 처리된 파일 제외
  if (resume) {
    const processed = new Set(stats.processedFiles);
    allFiles = allFiles.filter(f => !processed.has(f.split('/').pop().replace('\\', '/').split('\\').pop()));
    console.log(`재시작 모드: ${allFiles.length}개 미처리 파일`);
  }

  // --limit 적용
  if (LIMIT) allFiles = allFiles.slice(0, LIMIT);

  console.log(`처리할 설교 파일: ${allFiles.length}개`);
  console.log(`모델: ${MODEL}`);
  if (FILTER_ELEMENT) console.log(`요소 필터: ${FILTER_ELEMENT}`);
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  // 배치 처리
  for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
    const batch = allFiles.slice(i, i + BATCH_SIZE);
    console.log(`배치 ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(allFiles.length / BATCH_SIZE)} 처리 중...`);

    for (const filePath of batch) {
      try {
        const sermon = parseSermonFile(filePath);
        const result = await classifySermon(client, sermon);

        // 요소 필터 적용
        if (FILTER_ELEMENT && result.primaryElement !== FILTER_ELEMENT) {
          // 필터에 맞지 않아도 저장은 함 (분류 결과는 보존)
        }

        saveResult(result);
        stats.processedFiles.push(sermon.sourceFile);
        stats.totalProcessed++;
        stats.byElement[result.primaryElement] = (stats.byElement[result.primaryElement] || 0) + 1;
        saveStats(stats);

        console.log(`  ✓ [${result.primaryElement}] ${sermon.date} - ${sermon.title} (${result.relevanceScore.toFixed(2)})`);
        successCount++;
      } catch (err) {
        if (err.status === 529 || err.message?.includes('overloaded')) {
          console.log('  API 과부하, 60초 대기 후 재시도...');
          await new Promise(r => setTimeout(r, 60000));
          i -= BATCH_SIZE; // 현재 배치 재시도
          break;
        }
        console.error(`  ✗ 오류: ${filePath} - ${err.message}`);
        stats.errors.push({ file: filePath, error: err.message, time: new Date().toISOString() });
        saveStats(stats);
        errorCount++;
      }
    }

    // 배치 간 딜레이
    if (i + BATCH_SIZE < allFiles.length) {
      await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
    }
  }

  console.log('');
  console.log('═══════════════════════════════');
  console.log(`완료: 성공 ${successCount}개, 오류 ${errorCount}개`);
  console.log('요소별 분류 결과:');
  Object.entries(stats.byElement).forEach(([el, cnt]) => {
    console.log(`  ${el}: ${cnt}개`);
  });
}

main().catch(err => {
  console.error('실행 오류:', err.message);
  process.exit(1);
});
