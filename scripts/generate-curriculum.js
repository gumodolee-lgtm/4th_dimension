import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CLASSIFIED_DIR = join(ROOT, 'classified');
const CURRICULUM_DIR = join(ROOT, 'curriculum');
const PROMPT_FILE = join(__dirname, 'prompts', 'curriculum-prompt.md');

const MODEL = 'claude-sonnet-4-6';
const RATE_LIMIT_DELAY = 30000; // 30초 — output token rate limit (8,000/min) 대응

// 12주 커리큘럼 구조
const WEEK_PLAN = {
  생각: [
    { week: 1,  theme: '마음의 변화: 4차원의 영성이란 무엇인가', type: '개론' },
    { week: 2,  theme: '생각의 힘: 마음이 새로워지는 원리',       type: '기초' },
    { week: 3,  theme: '긍정적 사고의 성경적 근거',               type: '기초' },
    { week: 4,  theme: '두려움을 이기는 생각의 능력',             type: '기초' },
    { week: 5,  theme: '성령과 함께하는 마음의 변화',             type: '심화' },
    { week: 6,  theme: '역경 속에서도 긍정적으로 생각하기',       type: '심화' },
    { week: 7,  theme: '하나님의 관점으로 세상을 바라보기',       type: '심화' },
    { week: 8,  theme: '생각의 변화가 삶을 바꾼 사람들',         type: '심화' },
    { week: 9,  theme: '매일 마음을 새롭게 하는 훈련',           type: '훈련' },
    { week: 10, theme: '부정적 생각 패턴 극복하기',               type: '훈련' },
    { week: 11, theme: '감사와 찬양으로 생각 훈련하기',           type: '훈련' },
    { week: 12, theme: '변화된 마음으로 살아가는 삶',             type: '통합' },
  ],
  믿음: [
    { week: 1,  theme: '믿음이란 무엇인가: 4차원의 영성과 믿음', type: '개론' },
    { week: 2,  theme: '믿음의 실체: 바라는 것의 실상',           type: '기초' },
    { week: 3,  theme: '하나님의 약속을 붙드는 믿음',             type: '기초' },
    { week: 4,  theme: '믿음과 행함: 살아있는 믿음',              type: '기초' },
    { week: 5,  theme: '시험과 연단을 통해 자라는 믿음',          type: '심화' },
    { week: 6,  theme: '기도의 믿음: 구하면 받으리라',            type: '심화' },
    { week: 7,  theme: '기적을 일으키는 믿음의 힘',               type: '심화' },
    { week: 8,  theme: '믿음으로 산 사람들의 이야기',             type: '심화' },
    { week: 9,  theme: '일상에서 믿음 훈련하기',                  type: '훈련' },
    { week: 10, theme: '의심을 극복하는 믿음 훈련',               type: '훈련' },
    { week: 11, theme: '공동체 안에서 서로의 믿음 세우기',        type: '훈련' },
    { week: 12, theme: '믿음의 완성: 소망과 인내',                type: '통합' },
  ],
  꿈: [
    { week: 1,  theme: '비전이란 무엇인가: 하나님이 주시는 꿈',  type: '개론' },
    { week: 2,  theme: '꿈의 성경적 근거: 요엘의 예언',           type: '기초' },
    { week: 3,  theme: '하나님의 목적을 발견하는 꿈',             type: '기초' },
    { week: 4,  theme: '꿈을 품고 사는 삶의 능력',               type: '기초' },
    { week: 5,  theme: '역경 속에서도 꿈을 지키기',               type: '심화' },
    { week: 6,  theme: '꿈을 이루어가는 믿음의 과정',             type: '심화' },
    { week: 7,  theme: '공동체의 꿈: 함께 이루는 비전',           type: '심화' },
    { week: 8,  theme: '꿈으로 산 사람들의 이야기',               type: '심화' },
    { week: 9,  theme: '꿈을 명확하게 하는 훈련',                 type: '훈련' },
    { week: 10, theme: '꿈을 향한 구체적 계획 세우기',            type: '훈련' },
    { week: 11, theme: '포기하지 않는 꿈의 훈련',                 type: '훈련' },
    { week: 12, theme: '꿈의 성취와 하나님께 영광',               type: '통합' },
  ],
  말: [
    { week: 1,  theme: '말의 능력: 4차원의 영성과 언어',          type: '개론' },
    { week: 2,  theme: '말이 창조하는 힘: 성경적 근거',           type: '기초' },
    { week: 3,  theme: '믿음의 고백이란 무엇인가',                type: '기초' },
    { week: 4,  theme: '선포하는 삶: 하나님의 약속을 말하기',     type: '기초' },
    { week: 5,  theme: '부정적 언어를 극복하는 믿음의 말',        type: '심화' },
    { week: 6,  theme: '치유와 회복을 가져오는 말의 능력',        type: '심화' },
    { week: 7,  theme: '공동체 안에서 덕을 세우는 말',            type: '심화' },
    { week: 8,  theme: '말로 역사하신 믿음의 사람들',             type: '심화' },
    { week: 9,  theme: '매일 선포하는 말의 훈련',                 type: '훈련' },
    { week: 10, theme: '혀를 다스리는 훈련',                      type: '훈련' },
    { week: 11, theme: '중보기도와 선포하는 기도',                type: '훈련' },
    { week: 12, theme: '말의 사람으로 살아가기',                  type: '통합' },
  ],
};

// 분류된 설교 로드
function loadClassifiedSermons(element) {
  const dir = join(CLASSIFIED_DIR, element);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dir, f), 'utf-8')))
    .filter(s => s.relevanceScore >= 0.7)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// 주차 유형에 맞는 설교 선정
function selectSermonsForWeek(sermons, weekType, usedIds = new Set()) {
  const typeMap = { '개론': '1', '기초': '2-4', '심화': '5-8', '훈련': '9-11', '통합': '12' };
  const targetWeek = typeMap[weekType];

  const candidates = sermons.filter(s =>
    s.weekSuggestion === targetWeek && !usedIds.has(s.id)
  );

  // 해당 주차 후보가 없으면 전체에서 선택
  const pool = candidates.length >= 2 ? candidates : sermons.filter(s => !usedIds.has(s.id));
  return pool.slice(0, 3);
}

// 설교 요약 텍스트 생성
function formatSermonSummaries(sermons) {
  return sermons.map((s, i) =>
    `[${i + 1}] "${s.title}" (${s.date})\n` +
    `  본문: ${s.scriptureRef}\n` +
    `  요약: ${s.summary}\n` +
    `  핵심 구절: ${s.keyVerses.join(', ')}`
  ).join('\n\n');
}

// 프롬프트 생성
function buildPrompt(element, weekInfo, sermons) {
  const template = readFileSync(PROMPT_FILE, 'utf-8');
  const userSection = template.split('## User Prompt Template')[1]?.trim() || '';
  return userSection
    .replace('{element}', element)
    .replace('{weekNum}', weekInfo.week)
    .replace('{theme}', weekInfo.theme)
    .replace('{weekType}', weekInfo.type)
    .replace('{sermonCount}', sermons.length)
    .replace('{sermonSummaries}', formatSermonSummaries(sermons));
}

function buildSystemPrompt() {
  const template = readFileSync(PROMPT_FILE, 'utf-8');
  return template.split('## System Prompt')[1]?.split('## User Prompt Template')[0]?.trim() || '';
}

// 교재 생성
async function generateWeekContent(client, element, weekInfo, sermons) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildPrompt(element, weekInfo, sermons) }],
  });
  return response.content[0].text.trim();
}

// 메인 실행
async function main() {
  const args = process.argv.slice(2);
  const elementArg = args.find(a => a.startsWith('--element='));
  const element = elementArg ? elementArg.split('=')[1] : '생각';

  if (!WEEK_PLAN[element]) {
    console.error(`유효하지 않은 요소: ${element}. 사용 가능: 생각, 믿음, 꿈, 말`);
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sermons = loadClassifiedSermons(element);

  console.log(`'${element}' 요소 교재 생성 시작`);
  console.log(`사용 가능한 설교: ${sermons.length}편`);
  console.log(`모델: ${MODEL}`);
  console.log('');

  const weeks = WEEK_PLAN[element];
  const usedIds = new Set();
  const chapters = [];

  for (const weekInfo of weeks) {
    const selectedSermons = selectSermonsForWeek(sermons, weekInfo.type, usedIds);
    selectedSermons.forEach(s => usedIds.add(s.id));

    console.log(`${weekInfo.week}주차: ${weekInfo.theme} (설교 ${selectedSermons.length}편 참고)`);

    const content = await generateWeekContent(client, element, weekInfo, selectedSermons);
    chapters.push(content);

    // API 부하 방지
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }

  // 전체 교재 조합
  const cover = `# ${element}의 삶: 4차원의 영성 12주 성경공부

> 조용기 목사님의 설교를 바탕으로 한 소그룹 성경공부 교재
> 대상: 소그룹 (60~90분/주)
> 생성일: ${new Date().toLocaleDateString('ko-KR')}

---

`;

  const fullCurriculum = cover + chapters.join('\n\n---\n\n');
  const outputPath = join(CURRICULUM_DIR, `${element}_12주_교재.md`);
  writeFileSync(outputPath, fullCurriculum, 'utf-8');

  console.log('');
  console.log('═══════════════════════════════');
  console.log(`완료! 저장 위치: ${outputPath}`);
}

main().catch(err => {
  console.error('실행 오류:', err.message);
  process.exit(1);
});
