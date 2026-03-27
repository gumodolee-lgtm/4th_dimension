/**
 * "생각의 중요성" DOCX 문서 생성
 * 전체 설교(1981~2020)에서 추출한 내용 기반
 * 사용법: node scripts/create-importance-of-thinking-docx.js
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, BorderStyle, TableOfContents, LevelFormat,
  Header, Footer, PageNumber, NumberFormat,
  BookmarkStart, BookmarkEnd, PageReference,
  Table, TableRow, TableCell, WidthType, VerticalAlign,
} from 'docx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'output');

// ── 색상 ──────────────────────────────
const C = {
  navy: '000080',
  darkBlue: '00008B',
  black: '000000',
  gray: '808080',
  darkGray: '444444',
  accent: '8B0000',  // 강조 (다크레드)
  verseColor: '2F4F4F', // 성경구절 색상
};

// ── 공통 스타일 헬퍼 ──────────────────
const FONT = '맑은 고딕';

function titleParagraph(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 44, // 22pt
        bold: true,
        color: C.navy,
      }),
    ],
  });
}

function subtitleParagraph(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 200 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 24, // 12pt
        color: C.gray,
        italics: true,
      }),
    ],
  });
}

function sectionHeading(number, text) {
  const bmId = String(number);
  const bmName = `section_${number}`;
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 80 },
    children: [
      new BookmarkStart({ id: bmId, name: bmName }),
      new TextRun({
        text: `${number}. ${text}`,
        font: FONT,
        size: 30, // 15pt
        bold: true,
        color: C.darkBlue,
      }),
      new BookmarkEnd(bmId),
    ],
  });
}

function verseParagraph(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 400, right: 400 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 6, color: C.darkBlue },
    },
    children: [
      new TextRun({
        text: `📖 ${text}`,
        font: FONT,
        size: 20, // 10pt
        color: C.verseColor,
        italics: true,
      }),
    ],
  });
}

function bodyParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { before: 40, after: 40, line: 276 }, // 1.15줄 간격
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 21, // 10.5pt
        color: options.color || C.black,
        bold: options.bold || false,
        italics: options.italics || false,
      }),
    ],
  });
}

function quoteParagraph(text, source) {
  const children = [
    new TextRun({
      text: `"${text}"`,
      font: FONT,
      size: 20, // 10pt
      color: C.darkGray,
      italics: true,
    }),
  ];
  if (source) {
    children.push(
      new TextRun({
        text: `  — ${source}`,
        font: FONT,
        size: 18, // 9pt
        color: C.gray,
        italics: true,
      })
    );
  }
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 600, right: 400 },
    children,
  });
}

function biblePerson(name, description) {
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    indent: { left: 300 },
    children: [
      new TextRun({
        text: `▸ ${name}: `,
        font: FONT,
        size: 20,
        bold: true,
        color: C.accent,
      }),
      new TextRun({
        text: description,
        font: FONT,
        size: 20,
        color: C.black,
      }),
    ],
  });
}

function subHeading(text) {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 22, // 11pt
        bold: true,
        color: C.darkGray,
      }),
    ],
  });
}

function separator() {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
    },
    children: [],
  });
}

function emptyLine() {
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text: '', font: FONT, size: 10 })],
  });
}

// ── 문서 콘텐츠 정의 ──────────────────
const sections = [
  {
    title: '생각은 감정과 의지를 지배한다 — 그러므로 생각이 행동을 결정한다',
    verse: '잠언 4:23 — "무릇 지킬만한 것보다 더욱 네 마음을 지키라 생명의 근원이 이에서 남이니라"',
    body: [
      '생각이 중요한 첫 번째 이유는 생각이 감정을 격동시키고, 감정이 의지를 움직이며, 의지가 행동을 결정하기 때문이다. 이 인과관계는 역전되지 않는다. 행동이 먼저 생각을 바꾸는 것이 아니라, 반드시 생각이 먼저 행동을 바꾼다.',
      '같은 상황에서도 생각이 다르면 감정이 달라지고, 감정이 달라지면 결단이 달라지며, 결단이 달라지면 결과가 달라진다. 도단 성이 아람 군대에 포위되었을 때 엘리사의 종은 "적군"을 생각했고, 그 결과 공포에 사로잡혔다. 그러나 엘리사는 "하나님의 군대"를 생각했고, 그 결과 평안 속에 있었다. 상황은 동일했지만 생각이 달랐기에 감정과 행동이 완전히 달랐다.',
      '다윗과 사울의 병사들도 똑같이 골리앗을 보았다. 병사들은 "저렇게 큰 놈을 어떻게 이기겠는가"라고 생각했고, 그 결과 두려움이라는 감정이 생겨 40일간 아무도 나서지 못했다. 다윗은 "만군의 여호와의 이름으로 나간다"고 생각했고, 그 결과 담대함이라는 감정이 생겨 돌 하나로 거인을 쓰러뜨렸다. 같은 현실, 다른 생각, 정반대의 결과이다.',
    ],
    persons: [
      { name: '엘리사와 종 (열왕기하 6:14-17)', desc: '종은 적군을 보고 "어떻게 하리이까" 하며 공포에 빠졌다. 엘리사는 "우리와 함께 한 자가 그들보다 많으니라"고 생각했다. 엘리사의 기도로 종의 눈이 열리자, 불말과 불병거가 보였다. 생각이 바뀌자 공포가 평안으로 바뀌었다.' },
      { name: '다윗과 골리앗 (사무엘상 17장)', desc: '사울의 병사들과 다윗은 같은 골리앗을 보았지만, 생각이 달랐다. 병사들의 생각("우리는 안 된다")은 두려움을 낳았고, 다윗의 생각("하나님이 함께하신다")은 용기를 낳았다. 생각→감정→행동→결과의 인과관계가 명확히 드러난다.' },
    ],
    quotes: [
      { text: '인간의 생각은 그 감정을 격동하며 인간의 의지를 지배합니다. 생각을 잘 다스리지 못하면 생사 화복이 잘못된 생각으로 말미암아 파탄을 가져올 수 있습니다.', source: '1983년 설교 "저와 함께 한 자보다 많으니라"' },
      { text: '생각의 싸움에 밀리면 패합니다. 인생은 다 그래요. 생각의 싸움에 밀리면 패하고 마는 것입니다.', source: '2002년 설교 "하나님의 생각과 우리의 생각"' },
    ],
    conclusion: '생각이 감정을 만들고, 감정이 의지를 움직이며, 의지가 행동을 결정한다. 그러므로 생각을 다스리지 못하면 감정과 행동과 삶의 결과를 다스릴 수 없다. 이것이 생각이 중요한 첫 번째 이유이다.',
  },
  {
    title: '생각은 자화상을 형성한다 — 자화상대로 인생이 만들어진다',
    verse: '고린도후서 5:17 — "누구든지 그리스도 안에 있으면 새로운 피조물이라 이전 것은 지나갔으니 보라 새 것이 되었도다"',
    body: [
      '생각이 중요한 두 번째 이유는 반복된 생각이 자화상(Self-Image)을 형성하고, 인간은 자화상대로 말하고 행동하기 때문이다. 자화상이란 "나는 어떤 사람인가"에 대한 내면의 그림이다. 이 그림은 하루아침에 만들어지는 것이 아니라 오랜 시간 반복된 생각의 축적으로 형성된다.',
      '인과관계는 이렇다: 반복된 생각 → 자화상 형성 → 자화상에 따른 말과 행동 → 말과 행동에 따른 결과 → 결과가 다시 생각을 강화. 이 순환 고리 때문에 "나는 실패자"라는 생각을 반복하면 실패자의 자화상이 굳어지고, 실패자처럼 말하고 행동하게 되며, 실제로 실패하고, 그 실패가 다시 "역시 나는 안 돼"라는 생각을 강화한다.',
      '열두 정탐꾼 사건이 이를 증명한다. 열 명은 "우리가 스스로 보기에도 메뚜기 같다"고 했다. 이것은 현실의 묘사가 아니라 자화상의 고백이다. 그들은 "메뚜기"라는 생각을 반복했고, 그 자화상대로 "올라가지 못하리라"고 말했으며, 그 말대로 광야에서 죽었다. 반면 여호수아와 갈렙은 "능히 이기리라"는 자화상을 가졌고, 실제로 가나안에 들어갔다.',
    ],
    persons: [
      { name: '열두 정탐꾼 (민수기 13-14장)', desc: '같은 가나안 땅을 보고 열 명은 "메뚜기 자화상"으로 패배를 말했고, 여호수아와 갈렙은 "정복자 자화상"으로 승리를 말했다. 결과는 자화상이 예언한 그대로 실현되었다. 생각→자화상→선언→결과의 인과관계가 성경에서 가장 분명하게 드러나는 사건이다.' },
      { name: '아담과 하와 (창세기 3장)', desc: '타락 전에는 "하나님의 형상"이라는 자화상을 가졌기에 당당했다. 타락 후에는 "벌거벗은 죄인"이라는 자화상이 형성되어 숨고, 변명하고, 책임을 전가했다. 생각이 바뀌자 자화상이 바뀌었고, 자화상이 바뀌자 행동이 완전히 달라졌다.' },
    ],
    quotes: [
      { text: '우리 마음속에 자신에 대한 어떠한 자화상을 가지고 있는가에 따라서 우리의 사고와 행동에 중요한 변화를 가져오게 되는 것입니다.', source: '2001년 설교 "삶의 성공과 실패를 가져오는 자화상"' },
      { text: '인간은 모두다 자기가 자신을 보고 느끼는 모습을 가슴에 품고 그 모습을 쫓아 말하고 생각하고 행동하며 삽니다.', source: '1992년 설교 "보혈로 그린 자화상"' },
    ],
    conclusion: '반복된 생각이 자화상을 만들고, 인간은 자화상대로 말하고 행동하며, 그 결과가 다시 자화상을 강화한다. 그러므로 생각을 바꾸지 않으면 자화상이 바뀌지 않고, 자화상이 바뀌지 않으면 삶이 바뀌지 않는다.',
  },
  {
    title: '생각은 신체를 변화시킨다 — 마음이 몸의 건강을 지배한다',
    verse: '잠언 17:22 — "마음의 즐거움은 양약이라도 심령의 근심은 뼈를 마르게 하느니라"',
    body: [
      '생각이 중요한 세 번째 이유는 생각이 신체에 직접적으로 영향을 미치기 때문이다. 이것은 비유가 아니라 의학적 사실이다. 마음이 부정적이 되고 염려, 근심, 불안, 공포로 짓눌리면 면역체가 힘을 잃어 감기부터 암까지 발생할 수 있다.',
      '인과관계는 이렇다: 부정적 생각 → 스트레스 호르몬 분비 → 면역력 저하 → 질병. 반대로: 긍정적 생각 → 마음의 평안 → 면역력 강화 → 건강 회복. 하버드대 엘렌 렝어 교수의 실험에서 70대 노인들이 "나는 50대"라고 생각하며 생활하자, 실제로 악력, 시력, 관절 유연성 등 신체 기능이 측정 가능한 수준으로 회복되었다. 생각이 바뀌자 몸이 바뀐 것이다.',
      '성경은 이미 이 원리를 선언하고 있다. "마음의 즐거움은 양약이라도 심령의 근심은 뼈를 마르게 하느니라"(잠언 17:22). 즐거운 마음은 약과 같은 치유 효과를 가져오고, 근심하는 마음은 뼈를 마르게 하는 파괴 효과를 가져온다. 생각→마음→몸의 인과관계가 성경에 분명히 기록되어 있다.',
    ],
    persons: [
      { name: '빅토르 프랑클 (아우슈비츠)', desc: '극한의 수용소에서 "삶의 의미"라는 생각을 유지한 사람은 살아남았고, 생각이 무너진 사람은 신체도 무너져 죽어갔다. 같은 환경에서 생각의 차이가 생존과 죽음을 갈랐다. 생각→생존의지→신체반응의 인과관계를 실증한 사례이다.' },
      { name: '사도 바울 (빌립보서 4:4-7)', desc: '로마 감옥에서 "주 안에서 항상 기뻐하라"고 선언했다. 최악의 환경에서도 기쁨의 생각을 선택한 결과, 바울은 건강을 유지하며 서신을 기록할 수 있었다. 환경이 마음을 결정하는 것이 아니라, 생각이 마음을 결정하고, 마음이 몸을 지배함을 보여준다.' },
    ],
    quotes: [
      { text: '현대 의학에도 우리의 마음이 부정적이 되고 염려, 근심, 불안, 공포로 짓눌리면 여러 가지 몸에 병이 생기되 감기로부터 시작해서 암까지 발생한다고 합니다.', source: '1985년 설교 "마음의 건강"' },
      { text: '마음이 달라지면 몸도 달라집니다. 젊은 시절로 돌아갔다고 생각하고 사니까 실제로 몸도 젊어졌습니다. 몸은 마음이 가는대로 따라간다는 말입니다.', source: '2018년 설교 "생명의 전문가, 예수"' },
    ],
    conclusion: '생각은 감정만 바꾸는 것이 아니라 신체까지 변화시킨다. 긍정적 생각은 치유를, 부정적 생각은 질병을 가져온다. 그러므로 건강한 삶을 위해서도 생각이 중요하다.',
  },
  {
    title: '부정적 생각은 방치하면 증폭된다 — 잡초의 원리',
    verse: '로마서 8:6 — "육신의 생각은 사망이요 영의 생각은 생명과 평안이니라"',
    body: [
      '생각이 중요한 네 번째 이유는 부정적 생각이 자동으로 증폭되는 속성을 가지기 때문이다. 가만히 내버려 두면 사람은 원래 부정적인 생각을 하게 되어 있다. 긍정적인 생각은 고의적 노력이 필요하지만, 부정적인 생각은 노력 없이도 자라난다. 마치 잡초는 심지 않아도 자라지만, 곡식은 심고 가꾸어야 하는 것과 같다.',
      '인과관계는 이렇다: 부정적 생각 방치 → 두려움 증폭 → 두려움이 말이 됨 → 말이 현실이 됨. 욥이 이를 증명한다. "내가 두려워하는 그것이 내게 임하고 내가 무서워하는 그것이 내 몸에 미쳤구나"(욥기 3:25). 욥은 재앙이 오기 전부터 두려운 생각을 반복했고, 그 두려움이 입의 말이 되었으며, 결국 두려워한 그대로 재앙이 임했다.',
      '이것은 특수한 사례가 아니다. 헨리 워드 비처는 "사람은 한 가지 일에 세 가지 고생을 한다"고 했다. 일어나기 전에 걱정하고, 일어나는 동안 걱정하고, 일어난 후에 또 걱정한다. 걱정의 85%는 실제로 일어나지 않지만, 부정적 생각의 증폭은 그 85%의 허상 때문에 진짜 고통을 겪게 만든다. 그러므로 생각을 방치하는 것 자체가 위험하다.',
    ],
    persons: [
      { name: '욥 (욥기 3:25)', desc: '"내가 두려워하는 그것이 내게 임하였다." 두려운 생각을 반복하자 그 생각이 말이 되었고, 말이 현실이 되었다. 부정적 생각의 증폭이 가져온 결과를 보여주는 대표적 사례이다.' },
      { name: '이스라엘 백성 (민수기 14:28-29)', desc: '하나님이 말씀하셨다: "너희 말이 내 귀에 들린 대로 내가 너희에게 행하리라." 백성이 "우리가 광야에서 죽을 것이다"라는 부정적 생각을 반복하고 말로 선포하자, 하나님은 "네 말대로 하겠다"고 하셨다. 부정적 생각이 말이 되고, 말이 운명이 된 사건이다.' },
    ],
    quotes: [
      { text: '가만히 내버려두면 사람은 원래부터 부정적인 생각을 하도록 돼있습니다. 긍정적인 플러스 생각을 하려면 고의적으로 힘을 쓰고 애를 써야 됩니다.', source: '1997년 설교 "마음이 우울할 때"' },
      { text: '부정적인 생각을 하고 부정적인 꿈을 꾸고 부정적인 믿음을 받아들이면 부정적인 말을 하게 됩니다. 그런 사람은 결코 행복한 삶을 살아갈 수가 없는 것입니다.', source: '2018년 설교 "행복한 삶"' },
    ],
    conclusion: '부정적 생각은 방치하면 스스로 증폭되어 말이 되고 현실이 된다. 잡초처럼 심지 않아도 자라나기에, 의도적으로 뽑아내지 않으면 마음 전체를 점령한다. 그러므로 생각을 관리하지 않는 것 자체가 삶을 파괴하는 원인이 된다.',
  },
  {
    title: '같은 환경에서 생각을 바꾸면 결과가 바뀐다 — 전환의 증거',
    verse: '빌립보서 4:13 — "내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라"',
    body: [
      '생각이 중요한 다섯 번째 이유는 환경을 바꾸지 않아도 생각을 바꾸면 결과가 달라진다는 것이 반복적으로 증명되기 때문이다. 환경이 운명을 결정한다면, 같은 환경에서 같은 결과가 나와야 한다. 그러나 성경은 같은 환경에서 생각만 다르면 정반대의 결과가 나온다는 것을 여러 차례 보여준다.',
      '사도 바울과 실라는 빌립보 감옥에서 매를 맞고 갇혔다. 객관적 환경은 최악이었다. 그러나 그들은 "하나님이 함께하신다"는 생각을 선택했고, 그 생각은 찬송이라는 행동으로 나타났으며, 그 결과 지진이 일어나 옥문이 열리고 간수의 가정이 구원받았다. 환경은 동일했지만 생각이 달랐기에 결과가 정반대로 나타났다.',
      '이것은 감옥 안의 특별한 기적만이 아니다. 오토다케 히로타다는 사지 없이 태어났지만 "나는 할 수 있다"는 생각으로 일본 사회에서 성공적 삶을 살았고, 제프 헨더슨은 마약 죄수였지만 감옥에서 생각을 바꾸고 꿈을 품어 최고의 요리사가 되었다. 환경이 변한 것이 아니라 생각이 변했고, 생각이 변하자 환경이 뒤따라 변했다.',
    ],
    persons: [
      { name: '바울과 실라 (사도행전 16:24-26)', desc: '감옥이라는 동일한 환경에서 다른 죄수들은 절망했지만, 바울과 실라는 찬송했다. 생각의 차이가 행동의 차이를 만들었고, 행동의 차이가 기적이라는 결과를 만들었다. "환경이 아니라 생각이 결과를 결정한다"는 원리의 실증이다.' },
      { name: '여호사밧 왕 (역대하 20장)', desc: '세 나라 연합군이라는 절체절명의 환경에서, 인간적 사고방식이라면 패배가 당연했다. 그러나 "하나님이 싸워 주신다"는 생각을 선택하고 성가대를 군대 앞에 세웠다. 생각의 전환이 전쟁의 결과를 뒤집었다.' },
    ],
    quotes: [
      { text: '마음이 새로워져야 사람이 새로워집니다. 아무리 환경과 제도를 새롭게 해도 마음이 구태의연하면 그 모든 것은 다 새로워질 수 없습니다.', source: '1991년 설교 "새로워져야만 한다"' },
      { text: '할 수 있다 하면 된다 해 보자고 나가는 사람은 그 말대로도 되는 것입니다.', source: '2010년 설교 "네 마음을 지켜라"' },
    ],
    conclusion: '같은 환경에서 생각만 바꾸면 결과가 달라진다. 이것은 환경이 아니라 생각이 결과의 진짜 원인임을 뜻한다. 그러므로 삶을 바꾸고 싶다면 환경을 바꾸기 전에 먼저 생각을 바꾸어야 한다.',
  },
  {
    title: '생각이 4차원 창조의 출발점이다 — 생각에서 현실이 만들어진다',
    verse: '히브리서 11:3 — "믿음으로 모든 세계가 하나님의 말씀으로 지어진 줄을 우리가 아나니 보이는 것은 나타난 것으로 말미암아 된 것이 아니니라"',
    body: [
      '생각이 중요한 여섯 번째 이유는 생각이 현실 창조의 출발점이기 때문이다. 4차원의 영성에서 현실이 만들어지는 과정은 분명한 인과관계를 따른다: 생각 → 꿈(비전) → 믿음 → 말(선포) → 현실. 이 순서에서 생각은 첫 번째 고리이며, 생각이 없으면 나머지 과정이 시작되지 않는다.',
      '하나님이 천지를 창조하실 때도 이 원리를 따르셨다. 먼저 빛에 대한 생각이 있으셨고, "빛이 있으라"고 말씀하시니 빛이 생겼다. 보이는 세계(3차원)는 보이지 않는 세계(4차원)에서 나왔다. 성경은 "보이는 것은 나타난 것으로 말미암아 된 것이 아니다"(히브리서 11:3)라고 선언한다. 즉, 눈에 보이는 현실의 원인은 눈에 보이지 않는 생각에 있다.',
      '아브라함의 사례가 이를 증명한다. 하나님은 아이 없는 99세 노인에게 "하늘의 별처럼 많은 후손"을 생각하게 하셨다. 그 생각이 꿈이 되었고, 꿈이 믿음이 되었으며, 믿음을 말로 고백하자 100세에 이삭이 태어났다. 생각→꿈→믿음→선포→현실의 인과관계가 그대로 실현된 것이다. 지금 마음속에 있는 생각이 시간이 지나면 삶에 현실로 나타나게 된다.',
    ],
    persons: [
      { name: '아브라함 (로마서 4:17-25)', desc: '없는 것을 있는 것 같이 부르시는 하나님의 말씀을 따라 먼저 "수많은 후손"을 생각했고, 그 생각이 꿈→믿음→고백→현실의 과정을 거쳐 실현되었다. 4차원의 원리(생각→꿈→믿음→말→현실)가 한 사람의 인생에서 완전히 구현된 대표적 사례이다.' },
      { name: '모세와 홍해 (출애굽기 14장)', desc: '이스라엘 백성은 "죽겠다"고 생각했고, 모세는 "하나님이 구원하신다"고 생각했다. 모세의 생각이 믿음이 되었고, 믿음이 지팡이를 드는 행동이 되었으며, 바다가 갈라지는 현실이 되었다. 생각이 다르면 같은 바다 앞에서도 결과가 완전히 다르다.' },
    ],
    quotes: [
      { text: '지금 우리 주위에 형체를 입고 나타나는 모든 것은 한때 우리 마음에 생각으로 있었던 것입니다. 마음에 있던 생각이 시간이 지나면 우리 삶에 현실로 나타나게 됩니다.', source: '2019년 설교 "마음을 지키라"' },
      { text: '현실에 나타나는 여러분의 모든 상황은 눈에 안 보이는 생각, 꿈, 믿음, 말 이런 것들이 합쳐서 여러분 인생을 반죽을 해서 만들어 내는 것입니다.', source: '2008년 설교 "나의 삶을 다스리는 법칙"' },
    ],
    conclusion: '생각은 꿈, 믿음, 말, 현실로 이어지는 창조 과정의 출발점이다. 생각이 없으면 꿈도, 믿음도, 선포도, 현실의 변화도 시작되지 않는다. 그러므로 생각은 삶의 모든 변화가 시작되는 근원이다.',
  },

  // ── 섹션 7: 하나님/성령과의 소통 통로 ──
  {
    title: '생각은 하나님과 소통하는 통로이다 — 그러므로 생각이 영적 교제를 결정한다',
    verse: '에베소서 3:20 — "우리 가운데서 역사하시는 능력대로 우리가 구하거나 생각하는 모든 것에 더 넘치도록 능히 하실 이에게"',
    body: [
      '하나님은 영이시므로 사람과 소통하실 때 물리적 음성이 아닌 생각을 통로로 사용하신다. 성경은 "보혜사 곧 아버지께서 내 이름으로 보내실 성령 그가 너희에게 모든 것을 가르치고 내가 너희에게 말한 모든 것을 생각나게 하리라"(요한복음 14:26)고 말씀한다. 성령이 역사하시는 방식이 바로 "생각나게 하는 것"이다. 즉, 생각이라는 통로가 막히면 하나님의 음성도 들리지 않는다.',
      '조용기 목사는 "하나님은 우리의 생각 속에 말씀하신다"고 반복적으로 가르쳤다. 기도할 때 떠오르는 성경 말씀, 찬양 중에 주어지는 깨달음, 묵상할 때 마음에 임하는 감동 — 이 모든 것이 생각이라는 채널을 통해 전달된다. 에베소서 3:20의 "구하거나 생각하는 모든 것"이라는 표현에서 하나님은 우리의 생각의 범위 안에서 역사하신다고 말씀한다. 생각의 그릇이 작으면 받을 수 있는 은혜도 작아진다.',
      '아브라함에게 "하늘의 별을 보라"고 하신 것은 아브라함의 생각을 넓히기 위함이었다. 야곱에게 꿈을 주신 것도, 베드로에게 환상을 보이신 것도 모두 생각의 통로를 통해서였다. 하나님은 인간의 생각을 존중하시고, 생각을 통해 교제하시며, 생각을 통해 계시를 전달하신다. 그러므로 생각을 닫는 것은 하나님과의 소통을 닫는 것과 같다.',
    ],
    persons: [
      { name: '베드로의 환상 (사도행전 10:9-20)', desc: '베드로가 지붕 위에서 기도할 때, 하나님은 보자기 환상을 통해 이방인 선교의 뜻을 전달하셨다. 환상은 생각의 형태로 임했고, 베드로는 "생각하고 있을 때" 성령이 말씀하셨다(10:19). 생각이라는 통로가 열려 있었기에 복음이 이방인에게까지 전해지는 역사적 전환이 일어났다.' },
      { name: '엘리야와 세미한 소리 (열왕기상 19:11-13)', desc: '하나님은 바람, 지진, 불이 아닌 "세미한 소리"로 엘리야에게 말씀하셨다. 이 세미한 소리는 고요한 생각 속에서만 들을 수 있는 음성이었다. 생각이 소란하면 하나님의 음성을 놓치게 된다. 엘리야가 동굴에서 고요히 자신의 생각을 가라앉혔을 때 비로소 하나님의 다음 사명이 주어졌다.' },
    ],
    quotes: [
      { text: '하나님은 우리의 생각 속에 말씀하십니다. 성령님은 우리의 생각을 통하여 인도하시고, 가르치시고, 위로하십니다. 그래서 생각을 깨끗이 하고 하나님께 집중하는 것이 기도의 핵심입니다.', source: '1996년 설교 "성령의 인도하심"' },
      { text: '여러분이 구하거나 생각하는 모든 것에 넘치도록 하실 수 있는 분이 하나님이십니다. 그런데 생각하지 않으면 하나님이 넘치게 하실 것이 없습니다. 생각의 그릇을 넓혀야 합니다.', source: '2020년 설교 "에베소서 강해"' },
    ],
    conclusion: '성령은 생각을 통로로 사용하여 말씀하시고, 인도하시고, 깨닫게 하신다. 생각이 닫히면 하나님과의 소통이 끊어진다. 그러므로 생각은 영적 교제의 필수적 통로이다.',
  },

  // ── 섹션 8: 영적 전쟁의 전장 ──
  {
    title: '생각은 영적 전쟁의 전장이다 — 그러므로 생각을 지키는 것이 영적 승리를 결정한다',
    verse: '에베소서 6:17 — "구원의 투구와 성령의 검 곧 하나님의 말씀을 가지라"',
    body: [
      '성경은 영적 전쟁이 가장 먼저 일어나는 곳이 생각임을 분명히 보여준다. 바울은 전신갑주를 설명하면서 "구원의 투구"를 언급했는데, 투구는 머리를 보호하는 장비이다. 머리, 곧 생각이 공격의 대상이기 때문에 투구가 필요한 것이다. 마귀의 전략은 행동을 직접 조종하는 것이 아니라, 생각을 먼저 오염시키는 것이다.',
      '에덴동산에서 뱀이 하와에게 한 것은 폭력이나 강압이 아니었다. "하나님이 참으로 너희에게 동산 모든 나무의 열매를 먹지 말라 하시더냐?"(창세기 3:1) — 이것은 생각에 대한 공격이었다. 하나님의 선하심에 대한 의심을 생각 속에 심은 것이다. 그 하나의 잘못된 생각이 불순종의 행동으로, 행동이 타락의 결과로 이어졌다. 가룟 유다의 배신도 마찬가지다. "마귀가 벌써 시몬의 아들 가룟 유다의 마음에 예수를 팔려는 생각을 넣었더라"(요한복음 13:2). 마귀의 공격 지점은 언제나 생각이다.',
      '그러므로 생각을 지키지 않으면 영적 패배가 시작된다. 반대로, 말씀으로 생각을 무장하면 어떤 공격도 막아낼 수 있다. 예수님이 광야에서 마귀의 시험을 받으셨을 때 "기록되었으되"라는 말씀으로 대응하셨다. 이것은 예수님의 생각 속에 말씀이 가득했기 때문에 가능한 것이었다. 생각의 전쟁에서 이기는 자가 삶의 전쟁에서도 이긴다.',
    ],
    persons: [
      { name: '하와와 에덴의 유혹 (창세기 3:1-6)', desc: '뱀은 하와의 생각에 의심을 심었다. "먹으면 눈이 밝아져 하나님과 같이 되리라"는 거짓 생각이 들어오자, 보기에 좋고 먹음직하다는 감정이 따라왔고, 결국 따먹는 행동으로 이어졌다. 타락의 시작점은 행동이 아니라 생각이었다.' },
      { name: '가룟 유다 (요한복음 13:2, 26-27)', desc: '마귀가 유다의 마음에 "예수를 팔려는 생각"을 넣었고, 유다는 그 생각을 거부하지 않았다. 생각이 계획이 되었고, 계획이 행동이 되어 역사상 가장 비극적인 배신이 일어났다. 만약 유다가 그 생각을 처음 단계에서 물리쳤다면 결과는 완전히 달라졌을 것이다.' },
      { name: '예수님의 광야 시험 (마태복음 4:1-11)', desc: '마귀는 세 번 모두 예수님의 생각을 공격했다. "돌로 떡을 만들라"(육신의 생각), "뛰어내려 보라"(시험하는 생각), "절하면 다 주겠다"(세상적 생각). 예수님은 세 번 모두 "기록되었으되"로 말씀을 생각 속에 세워 승리하셨다.' },
    ],
    quotes: [
      { text: '마귀는 항상 여러분의 생각을 공격합니다. "안 된다, 불가능하다, 포기해라" 이런 생각이 들면 그것은 마귀의 공격입니다. 말씀으로 무장하십시오. 생각의 싸움에서 이기면 인생의 싸움에서 이깁니다.', source: '1981년 설교 "나, 나의 생각"' },
      { text: '투구가 머리를 보호하듯이, 구원의 확신이 우리의 생각을 보호합니다. 생각이 흔들리면 믿음이 흔들리고, 믿음이 흔들리면 모든 것이 무너집니다. 생각을 지키십시오.', source: '2000년 설교 "전신갑주를 입으라"' },
    ],
    conclusion: '마귀의 공격은 언제나 생각에서 시작되고, 영적 승리도 생각에서 시작된다. 생각을 말씀으로 무장하지 않으면 유혹과 거짓에 무방비 상태가 된다. 그러므로 생각을 지키는 것이 영적 전쟁의 핵심이다.',
  },

  // ── 섹션 9: 회개의 본질은 생각의 변화 ──
  {
    title: '회개의 본질은 생각의 변화(메타노이아)이다 — 그러므로 생각이 바뀌어야 삶이 바뀐다',
    verse: '로마서 12:2 — "너희는 이 세대를 본받지 말고 오직 마음을 새롭게 함으로 변화를 받아 하나님의 선하시고 기뻐하시고 온전하신 뜻이 무엇인지 분별하도록 하라"',
    body: [
      '성경에서 "회개"로 번역된 헬라어 "메타노이아(μετάνοια)"의 원래 뜻은 "마음의 변화", 곧 "생각의 전환"이다. 메타(μετά, 이후/변화)와 노이아(νοῖα, 생각/마음)의 합성어이다. 즉, 성경이 말하는 회개는 단순히 눈물을 흘리거나 슬퍼하는 것이 아니라, 근본적으로 생각의 방향을 바꾸는 것이다. 생각이 바뀌지 않은 회개는 진정한 회개가 아니다.',
      '로마서 12:2는 이 원리를 가장 명확하게 보여준다. "마음을 새롭게 함으로 변화를 받으라"는 명령에서, 변화(메타모르포시스)의 방법은 오직 하나 — 마음(nous, 생각)을 새롭게 하는 것이다. 행동을 먼저 바꾸라고 하지 않으셨다. 환경을 바꾸라고 하지 않으셨다. 생각을 새롭게 하면 변화가 따라온다고 하셨다. 이것은 4차원의 영성에서 생각이 출발점인 이유와 정확히 일치한다.',
      '바울은 또한 "모든 생각을 사로잡아 그리스도에게 복종케 하라"(고린도후서 10:5)고 명령했다. 십자가의 능력은 포로 된 생각을 해방시키는 데 있다. 옛 생각에서 새 생각으로, 세상적 사고에서 하나님의 사고로의 전환 — 이것이 구원의 실질적 내용이다. 조용기 목사는 "생각이 바뀌지 않으면 진짜 변하지 않은 것"이라고 가르쳤다.',
    ],
    persons: [
      { name: '사울에서 바울로 (사도행전 9:1-22)', desc: '다메섹 도상에서 사울의 눈이 멀었을 때, 진짜 변한 것은 눈이 아니라 생각이었다. "예수를 죽여야 한다"는 생각이 "예수가 주님이시다"로 완전히 전환되었다. 이 생각의 전환(메타노이아)이 핍박자를 사도로, 교회의 적을 복음의 기둥으로 바꾸었다. 행동의 변화는 생각의 변화에서 시작되었다.' },
      { name: '탕자의 회개 (누가복음 15:17-20)', desc: '"이에 스스로 돌이켜 가로되"(came to himself) — 돼지 먹이를 보면서 탕자에게 일어난 것은 생각의 전환이었다. "아버지 집에는 양식이 풍족하다"는 새로운 생각이 들어오자, 결심이 생겼고, 행동(아버지에게 돌아감)이 따랐다. 회개는 감정이 아니라 생각에서 시작되었다.' },
    ],
    quotes: [
      { text: '회개라는 것은 생각을 바꾸는 것입니다. 하나님이 원하시는 회개는 울고 슬퍼하는 것이 아니라, 마음 깊은 곳의 생각이 변하는 것입니다. 생각이 바뀌면 삶이 바뀝니다.', source: '1990년 설교 "참된 회개"' },
      { text: '십자가는 우리의 옛 생각을 깨뜨리고 새 생각을 심어줍니다. 포로 된 생각을 해방시켜 그리스도의 생각으로 바꾸어 줍니다. 이것이 거듭남의 핵심입니다.', source: '2002년 설교 "십자가의 능력"' },
    ],
    conclusion: '회개(메타노이아)의 원래 뜻 자체가 "생각의 변화"이다. 성경은 삶의 변화가 생각의 변화에서 시작된다고 일관되게 가르친다. 그러므로 생각은 구원과 변화의 출발점이며, 생각이 바뀌지 않으면 아무것도 바뀌지 않는다.',
  },
];

// ── 문서 생성 ──────────────────────────
async function buildDocument() {
  const children = [];

  // 문서 제목
  children.push(titleParagraph('생각의 중요성'));
  children.push(subtitleParagraph('4차원의 영성 — 조용기 목사 설교(1981~2020)에서 발견하는 생각의 원리'));
  children.push(emptyLine());

  // 목차
  children.push(new Paragraph({
    spacing: { before: 100, after: 60 },
    children: [
      new TextRun({
        text: '목  차',
        font: FONT,
        size: 26,
        bold: true,
        color: C.navy,
      }),
    ],
  }));

  // 목차 표
  const tocRows = sections.map((sec, i) => {
    const bmName = `section_${i + 1}`;
    return new TableRow({
      children: [
        // 번호 열
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: `${i + 1}`, font: FONT, size: 21, bold: true, color: C.navy })],
          })],
        }),
        // 제목 열
        new TableCell({
          width: { size: 7800, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          children: [new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: sec.title, font: FONT, size: 21, color: C.darkGray })],
          })],
        }),
        // 페이지 열
        new TableCell({
          width: { size: 700, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 40, after: 40 },
            children: [new PageReference(bmName)],
          })],
        }),
      ],
    });
  });

  children.push(new Table({
    width: { size: 9100, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: tocRows,
  }));

  children.push(separator());

  // 각 섹션
  sections.forEach((sec, i) => {
    // 섹션 제목
    children.push(sectionHeading(i + 1, sec.title));

    // 성경구절
    children.push(verseParagraph(sec.verse));
    children.push(emptyLine());

    // 본문
    sec.body.forEach(para => {
      children.push(bodyParagraph(para));
    });

    // 성경인물/사건
    children.push(emptyLine());
    children.push(subHeading('성경 인물과 사건'));
    sec.persons.forEach(p => {
      children.push(biblePerson(p.name, p.desc));
    });

    // 핵심 인용
    children.push(emptyLine());
    children.push(subHeading('설교에서'));
    sec.quotes.forEach(q => {
      children.push(quoteParagraph(q.text, q.source));
    });

    // 결론 (인과관계 요약)
    if (sec.conclusion) {
      children.push(emptyLine());
      children.push(new Paragraph({
        spacing: { before: 40, after: 40, line: 276 },
        indent: { left: 200, right: 200 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: C.darkBlue },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: C.darkBlue },
        },
        children: [
          new TextRun({
            text: '∴ ',
            font: FONT,
            size: 21,
            bold: true,
            color: C.darkBlue,
          }),
          new TextRun({
            text: sec.conclusion,
            font: FONT,
            size: 21,
            bold: true,
            color: C.darkBlue,
          }),
        ],
      }));
    }

    // 구분선
    children.push(separator());
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 21,
          },
        },
        heading1: {
          run: {
            font: FONT,
            size: 30,
            bold: true,
            color: C.darkBlue,
          },
          paragraph: {
            spacing: { before: 300, after: 80 },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1200, bottom: 1200, left: 1500, right: 1500 }, // 좁은 여백
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: '생각의 중요성 — 4차원의 영성',
                    font: FONT,
                    size: 16,
                    color: C.gray,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    size: 16,
                    color: C.gray,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = join(OUT, '생각의_중요성.docx');
  writeFileSync(outPath, buffer);
  // eslint-disable-next-line no-console
  console.log(`생성 완료: ${outPath}`);
}

buildDocument().catch(err => {
  console.error('문서 생성 실패:', err);
  process.exit(1);
});
