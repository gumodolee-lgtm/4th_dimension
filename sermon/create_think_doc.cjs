const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, PageBreak, Footer,
  Header, AlignmentType, HeadingLevel, LevelFormat,
  FootnoteReferenceRun, PageNumber, BorderStyle, TableOfContents,
  TabStopType, TabStopPosition,
} = require("docx");

// ============================================================
// 각주 데이터
// ============================================================
const footnoteData = {};
let fnId = 1;
function fn(text) {
  const id = fnId++;
  footnoteData[id] = { children: [new Paragraph({ children: [new TextRun({ text, font: "Batang", size: 18 })] })] };
  return id;
}

// 미리 각주 ID 생성
const FN = {
  think1981: fn("조용기, 「나, 나의 생각」, 1981년 6월 28일 설교"),
  think1984: fn("조용기, 「생각을 바꿔라」, 1984년 11월 18일 설교"),
  think1986: fn("조용기, 「마음의 밭, 생각의 씨앗」, 1986년 7월 27일 설교"),
  think1988: fn("조용기, 「마음의 변화」, 1988년 6월 19일 설교"),
  think1990: fn("조용기, 「마음의 눈」, 1990년 1월 7일 설교"),
  think1996: fn("조용기, 「축복을 가져오는 생활태도」, 1996년 10월 13일 설교"),
  think1996b: fn("조용기, 「생각을 주장하라」, 1996년 8월 25일 설교"),
  think1999: fn("조용기, 「겉사람과 속사람」, 1999년 10월 24일 설교"),
  think2001: fn("조용기, 「삶의 성공과 실패를 가져오는 자화상」, 2001년 7월 8일 설교"),
  think2001b: fn("조용기, 「나는 누구입니까? (정체성의 위기)」, 2001년 6월 17일 설교"),
  think2007: fn("조용기, 「마음 성전」, 2007년 10월 14일 설교"),
  think2010a: fn("조용기, 「마음의 생각을 지켜라」, 2010년 5월 23일 설교"),
  think2010b: fn("조용기, 「나를 다스리는 힘」, 2010년 7월 11일 설교"),
  think2010c: fn("조용기, 「내 속의 숨은 정체성을 보라」, 2010년 11월 14일 설교"),
  think2011a: fn("조용기, 「마음을 다스려야 삶을 다스릴 수 있다」, 2011년 5월 29일 설교"),
  think2011b: fn("조용기, 「겉사람과 속사람」, 2011년 6월 26일 설교"),
  think2011c: fn("조용기, 「항상 긍정적으로」, 2011년 2월 20일 설교"),
  think2011d: fn("조용기, 「자화상과 자존심」, 2011년 11월 6일 설교"),
  think2013: fn("조용기, 「생각의 터전」, 2013년 11월 3일 설교"),
  think2014: fn("조용기, 「마음 다스리기」, 2014년 3월 30일 설교"),
  think2015a: fn("조용기, 「자화상」, 2015년 11월 8일 설교"),
  think2015b: fn("조용기, 「나는 나의 자화상을 본다」, 2015년 3월 15일 설교"),
  think2015c: fn("조용기, 「흑자 인생과 적자 인생」, 2015년 2월 1일 설교"),
  think2017a: fn("조용기, 「생각의 중요성」, 2017년 10월 1일 설교"),
  think2017b: fn("조용기, 「요 3:1~18」, 2017년 10월 29일 설교"),
  think2018a: fn("조용기, 「생명의 전문가, 예수」, 2018년 4월 29일 설교"),
  think2019: fn("조용기, 「마음을 지키라」, 2019년 3월 31일 설교"),
  think2020: fn("조용기, 「네 마음을 지키라 생명의 근원이 이에게 남이니라」, 2020년 1월 26일 설교"),
  pascal: fn("Blaise Pascal, Pensees, 1670"),
};

// ============================================================
// 스타일 헬퍼
// ============================================================
const FONT = "Batang";
const FONT_TITLE = "Dotum";

function bodyText(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: 24, ...opts });
}

function bodyPara(texts, opts = {}) {
  const children = typeof texts === "string"
    ? [bodyText(texts)]
    : texts;
  return new Paragraph({
    spacing: { after: 180, line: 360 },
    children,
    ...opts,
  });
}

function biblePara(text) {
  return new Paragraph({
    spacing: { before: 120, after: 120, line: 360 },
    indent: { left: 720, right: 720 },
    children: [new TextRun({ text, font: FONT, size: 22, italics: true, color: "333333" })],
  });
}

function quotePara(text, source) {
  return new Paragraph({
    spacing: { before: 160, after: 160, line: 340 },
    indent: { left: 600, right: 600 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: "888888", space: 8 } },
    children: [
      new TextRun({ text: `"${text}"`, font: FONT, size: 22, color: "444444" }),
    ],
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 300 },
    children: [new TextRun({ text, font: FONT_TITLE, size: 36, bold: true })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 240 },
    children: [new TextRun({ text, font: FONT_TITLE, size: 30, bold: true })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 180 },
    children: [new TextRun({ text, font: FONT_TITLE, size: 26, bold: true })],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

// ============================================================
// 문서 내용
// ============================================================
function buildContent() {
  const content = [];

  // ─── 표지 ───
  content.push(emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine());
  content.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "4차원의 영성", font: FONT_TITLE, size: 32, color: "666666" })],
  }));
  content.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: "생각의 능력", font: FONT_TITLE, size: 56, bold: true })],
  }));
  content.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "왜 생각이 중요하며, 어떻게 바꿀 것인가", font: FONT_TITLE, size: 28, color: "555555" })],
  }));
  content.push(emptyLine(), emptyLine());
  content.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: "조용기 목사 설교 137편 분석", font: FONT, size: 24, color: "777777" })],
  }));
  content.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "(1981~2020)", font: FONT, size: 24, color: "777777" })],
  }));
  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ─── 목차 ───
  content.push(heading1("목차"));
  content.push(new TableOfContents("목차", { hyperlink: true, headingStyleRange: "1-3" }));
  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════
  // 서론
  // ═══════════════════════════════════════
  content.push(heading1("서론: 4차원의 영성과 생각"));

  content.push(bodyPara([
    bodyText("조용기 목사는 40여 년간의 목회를 통해 "),
    bodyText("'4차원의 영성'", { bold: true }),
    bodyText("이라는 독특한 신학적 틀을 제시하였다. 이 영성은 네 가지 핵심 요소로 이루어져 있다: "),
    bodyText("생각(Thought), 꿈(Dream), 믿음(Faith), 말(Word)", { bold: true }),
    bodyText("이 그것이다. 이 네 요소는 보이지 않는 영적 차원에서 보이는 물질적 현실을 창조하고 변화시키는 통로가 된다."),
  ]));

  content.push(bodyPara([
    bodyText("이 문서는 4차원의 영성 중 첫 번째 요소인 "),
    bodyText("'생각'", { bold: true }),
    bodyText("에 초점을 맞추어, 조용기 목사가 1981년부터 2020년까지 전한 설교 중 '생각' 주제로 분류된 137편을 분석한 결과물이다. 생각이 왜 중요한지, 그리고 생각을 어떻게 바꿀 수 있는지를 설교 본문에 근거하여 체계적으로 정리하였다."),
  ]));

  content.push(bodyPara([
    bodyText("조용기 목사는 잠언 4장 23절 "),
    bodyText("\"지킬만한 것보다 더욱 네 마음을 지켜라 생명의 근원이 이에서 남이니라\"", { italics: true }),
    bodyText("를 생각 영역의 대표 말씀으로 삼았다. 이 구절은 그의 '생각' 설교 전체를 관통하는 주제 성구이며, 마음을 지키는 것이 곧 생명의 근원을 지키는 것임을 선포한다."),
    new FootnoteReferenceRun(FN.think2020),
  ]));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════
  // 제1장
  // ═══════════════════════════════════════
  content.push(heading1("제1장. 생각이란 무엇인가"));

  content.push(heading2("1. 생각하는 갈대 — 인간 존재의 본질"));

  content.push(bodyPara([
    bodyText("프랑스의 철학자 블레즈 파스칼은 \"인간은 생각하는 갈대\"라고 하였다."),
    new FootnoteReferenceRun(FN.pascal),
    bodyText(" 갈대처럼 연약하고 보잘것없는 존재이지만, 인간의 위대성은 바로 생각에 있다는 뜻이다. 조용기 목사는 이 통찰을 신학적으로 더 깊이 발전시킨다."),
  ]));

  content.push(quotePara(
    "몸은 형편없어도 그 속에 있는 생각은 거인입니다. 인간에게 있어서의 위대성은 그 몸에 있지 않고 생각에 있으며 인간의 몸은 거인이 아니나 그 생각은 위대한 거인인 것입니다."
  ));
  content.push(bodyPara([
    bodyText("— 「나, 나의 생각」(1981) 중에서", { italics: true, color: "666666", size: 20 }),
  ], { alignment: AlignmentType.RIGHT }));

  content.push(bodyPara([
    bodyText("체력으로 따지면 인간은 사자나 곰, 호랑이에 비할 바가 못 된다. 그러나 인간이 지구의 주인이 된 것은 "),
    bodyText("생각하는 능력", { bold: true }),
    bodyText(" 때문이다. 별과 우주의 끝까지 생각이 미치고, 원자 단위까지 파고들어 에너지를 꺼내는 것이 인간의 생각이다. 과학 문명의 모든 것이 생각의 산물이며, 과거를 돌아보고 미래를 설계하는 것도 오직 생각의 힘이다."),
    new FootnoteReferenceRun(FN.think1984),
  ]));

  content.push(heading2("2. 생각이 곧 그 사람의 실체이다"));

  content.push(bodyPara([
    bodyText("조용기 목사는 "),
    bodyText("잠언 23장 7절", { bold: true }),
    bodyText("을 반복적으로 인용하며 이 진리를 강조한다."),
  ]));

  content.push(biblePara("\"그 마음의 생각이 어떠하면 그 사람도 그러하니\" (잠 23:7)"));

  content.push(bodyPara([
    bodyText("이 말씀은 생각이 단순히 머릿속 활동이 아니라, 그 사람의 "),
    bodyText("존재 자체", { bold: true }),
    bodyText("임을 선언한다. 병든 생각을 가진 사람은 병든 인간이 되고, 가난한 생각을 가진 사람은 가난한 인간이 되며, 승리의 생각을 가진 사람은 승리자가 된다. 현재 마음속에 어떤 생각을 품고 있는가가 바로 그 사람의 진실한 모습이다."),
    new FootnoteReferenceRun(FN.think1981),
  ]));

  content.push(quotePara(
    "여러분 속에 내가 현재 어떠한 생각을 가지고 있는가, 그 생각이 바로 그러한 사람으로 여러분을 만들어 가는 것입니다."
  ));

  content.push(bodyPara([
    bodyText("이것은 단순한 심리학적 관찰이 아니다. "),
    bodyText("하나님이 인간을 자기 형상대로 창조하셨을 때(창 1:27), 그 형상의 핵심이 바로 생각하는 능력이었다.", { }),
    bodyText(" 하나님은 영이시니(요 4:24), 육체가 아닌 영과 생각이 하나님을 닮은 부분이다. 따라서 생각은 하나님의 형상이 가장 직접적으로 반영된 인간의 본질이다."),
    new FootnoteReferenceRun(FN.think1981),
  ]));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════
  // 제2장
  // ═══════════════════════════════════════
  content.push(heading1("제2장. 생각은 왜 중요한가"));

  content.push(bodyPara("조용기 목사의 설교를 분석하면, 생각이 중요한 이유가 크게 다섯 가지로 정리된다."));

  // 2-1
  content.push(heading2("1. 생각이 미래의 운명을 결정한다"));

  content.push(bodyPara([
    bodyText("\"마음속에 '나는 망한다'고 생각하면서 미래에 흥하는 사람이 없으며, '나는 패배자'라고 생각하면서 승리자로 나타날 수 없다.\""),
    new FootnoteReferenceRun(FN.think1981),
    bodyText(" 현재의 생각이 미래의 예언이라는 것이다. 인생을 같은 곳에서 같이 출발해도 생각하는 방향에 따라 한 사람은 성공하고 다른 사람은 파멸한다."),
  ]));

  content.push(bodyPara([
    bodyText("이 원리를 가장 극적으로 보여주는 것이 "),
    bodyText("열두 정탐꾼의 이야기", { bold: true }),
    bodyText("(민 13~14장)이다. 모세가 가나안 땅에 12명의 정탐꾼을 보냈을 때, 40일간 같은 곳을 돌아보고도 그 결과는 하늘과 땅처럼 달랐다."),
  ]));

  content.push(bodyPara([
    bodyText("10명의 정탐꾼은 이렇게 보고했다: "),
    bodyText("\"우리가 거기서 네피림 후손인 아낙 자손의 네피림을 보았나니 우리는 스스로 보기에도 메뚜기 같으니\"", { italics: true }),
    bodyText("(민 13:33). 그들은 스스로를 '메뚜기'로 보았다. 반면 여호수아와 갈렙은 \"하나님이 기뻐하시면 우리가 당장 점령할 수 있다\"고 보고했다. 같은 환경, 같은 적, 같은 도전이었지만, 10명의 부정적 사고는 광야에서의 죽음을, 여호수아와 갈렙의 긍정적 사고는 가나안 정복을 가져왔다."),
    new FootnoteReferenceRun(FN.think1984),
  ]));

  content.push(quotePara(
    "똑같은 사람들이 똑같은 환경에서 생각을 어떻게 하는가에 따라서 그들의 운명이 하늘과 땅처럼 달라졌다는 것을 생각하고 우리는 전율하지 아니할 수 없습니다."
  ));

  // 2-2
  content.push(heading2("2. 마음이 생명의 근원이다"));

  content.push(biblePara("\"지킬만한 것보다 더욱 네 마음을 지켜라 생명의 근원이 이에서 남이니라\" (잠 4:23)"));

  content.push(bodyPara([
    bodyText("이 말씀은 조용기 목사의 '생각' 설교 전체를 관통하는 핵심 구절이다. 1981년부터 2020년까지 거의 모든 '생각' 관련 설교에서 반복적으로 인용된다. '지킬만한 것보다 더욱'이라는 표현은 마음 지킴이 재산이나 건강이나 지위보다 더 우선적임을 말한다. 마음을 지키는 것이 곧 생명을 지키는 것이며, 마음의 상태가 삶의 모든 영역을 결정짓기 때문이다."),
    new FootnoteReferenceRun(FN.think2019),
  ]));

  content.push(bodyPara([
    bodyText("조용기 목사는 이것을 "),
    bodyText("마음의 성전", { bold: true }),
    bodyText("이라는 개념으로 확장한다. 구약의 성전이 하나님이 거하시는 거룩한 장소였듯이, 신약 시대에는 성도의 마음이 하나님의 성전이다. 이 성전을 깨끗하게 지키고 부정한 것이 들어오지 못하도록 파수하는 것이 성도의 핵심 사명이다."),
    new FootnoteReferenceRun(FN.think2007),
  ]));

  // 2-3
  content.push(heading2("3. 하나님이 생각을 통해 역사하신다"));

  content.push(biblePara("\"우리 가운데서 역사하시는 능력대로 우리의 온갖 구하는 것이나 생각하는 것에 더 넘치도록 능히 하실 이에게\" (엡 3:20)"));

  content.push(bodyPara([
    bodyText("이 말씀은 하나님이 우리의 생각을 "),
    bodyText("통로", { bold: true }),
    bodyText("로 삼아 역사하심을 보여준다. 하나님의 능력은 무한하시지만, 그 능력이 임하는 통로는 우리의 생각이다. 생각이 크면 큰 역사가 임하고, 생각이 작으면 하나님의 역사도 그 안에서 제한된다. 이것이 4차원의 영성에서 생각을 첫 번째 요소로 놓은 이유이다."),
    new FootnoteReferenceRun(FN.think1981),
  ]));

  // 2-4
  content.push(heading2("4. 생각은 씨앗처럼 반드시 열매를 맺는다"));

  content.push(biblePara("\"스스로 속이지 말라 하나님은 만홀히 여김을 받지 아니하시나니 사람이 무엇으로 심든지 그대로 거두리라\" (갈 6:7)"));

  content.push(bodyPara([
    bodyText("조용기 목사는 "),
    bodyText("마태복음 13장의 씨뿌리는 자의 비유", { bold: true }),
    bodyText("를 통해 이 원리를 구체적으로 설명한다. 매일의 생각이 마음이라는 밭에 뿌려지는 씨앗이다. 잘못된 생각을 심으면 파괴를 거두고, 좋은 생각을 심으면 30배, 60배, 100배의 열매를 거둔다. 씨앗을 뿌리면 반드시 그 종류대로 열매가 나오듯이, 생각도 반드시 그에 합당한 결과를 가져온다."),
    new FootnoteReferenceRun(FN.think1986),
  ]));

  content.push(quotePara(
    "나는 못한다. 나는 안 된다. 나는 할 수 없다. 나는 못산다. 나는 실패자다. 나는 패배자다. 이와 같은 생각을 심어놓으면 반드시 그의 인격 속에 파멸을 거두게 되는 것입니다."
  ));

  // 2-5
  content.push(heading2("5. 마귀의 공격 목표가 바로 생각이다"));

  content.push(bodyPara([
    bodyText("영적 전투의 관점에서 보면, 마귀가 인간을 공격하는 핵심 목표는 육체가 아니라 "),
    bodyText("생각", { bold: true }),
    bodyText("이다. 에덴동산에서 마귀가 아담과 하와에게 한 것은 육체적 공격이 아니라 "),
    bodyText("\"너도 하나님처럼 되라\"", { italics: true }),
    bodyText("는 생각의 오염이었다. 이후로 인간의 모든 타락은 잘못된 생각에서 시작되었다."),
    new FootnoteReferenceRun(FN.think1981),
  ]));

  content.push(bodyPara([
    bodyText("조용기 목사는 이것을 "),
    bodyText("'누에와 파리'", { bold: true }),
    bodyText("의 비유로 설명한다. 뽕잎을 먹고 자란 누에는 고치를 짓고 그 안에서 아름다운 나비가 나온다. 그런데 파리가 누에 위에 알을 까버리면, 고치에서 나비가 아니라 구더기가 나온다. 인간의 생각도 하나님의 형상대로 위대한 '나비'가 나와야 하지만, 마귀가 부패의 씨를 뿌려 아무리 위대한 것을 만들어도 뒤에는 파괴와 부패가 따라 나온다."),
    new FootnoteReferenceRun(FN.think1981),
  ]));

  content.push(bodyPara([
    bodyText("이것이 인간 문명의 양면성이다. 인공위성을 쏘아 올리지만 그 위에 핵탄두를 올리고, 비행기를 발명하지만 폭격에 사용한다. 모든 위대한 발명 속에 부패가 들어 있는 것은 타락한 생각의 결과이다. 따라서 생각을 지키는 것은 단순히 긍정적으로 사는 문제가 아니라, "),
    bodyText("영적 전투의 핵심", { bold: true }),
    bodyText("인 것이다."),
  ]));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════
  // 제3장
  // ═══════════════════════════════════════
  content.push(heading1("제3장. 자화상 — 내가 나를 어떻게 보는가"));

  content.push(bodyPara([
    bodyText("조용기 목사의 '생각' 설교에서 가장 빈번하게 등장하는 주제 중 하나가 "),
    bodyText("'자화상'(self-portrait)", { bold: true }),
    bodyText("이다. 2001년 「삶의 성공과 실패를 가져오는 자화상」, 2011년 「자화상과 자존심」, 2015년 「자화상」과 「나는 나의 자화상을 본다」 등 다수의 설교가 이 주제를 다룬다."),
  ]));

  content.push(heading2("1. 자화상이 삶의 방향을 결정한다"));

  content.push(bodyPara([
    bodyText("자화상이란 '내가 나 자신을 어떻게 보는가'이다. 스스로를 메뚜기로 보면 메뚜기로 살게 되고, 하나님의 자녀로 보면 승리자로 살게 된다. 앞서 살펴본 12정탐꾼의 이야기가 바로 이것이다. 10명의 정탐꾼은 스스로를 '메뚜기'로 보았고, 그 자화상이 그들의 운명을 결정했다."),
    new FootnoteReferenceRun(FN.think2001),
  ]));

  content.push(quotePara(
    "여러분의 진실한 모습은 바로 여러분 속에 있는 그 생각인 것입니다. 생각이 여러분 진실한 자신이며 여러분 삶의 자원입니다."
  ));
  content.push(bodyPara([
    bodyText("— 「자화상」(2015) 중에서", { italics: true, color: "666666", size: 20 }),
  ], { alignment: AlignmentType.RIGHT }));

  content.push(heading2("2. 정체성의 위기와 회복"));

  content.push(bodyPara([
    bodyText("현대인의 가장 근본적인 문제 중 하나가 "),
    bodyText("정체성의 위기", { bold: true }),
    bodyText("이다. '나는 누구인가?'라는 질문에 답하지 못할 때, 사람은 방향을 잃고 표류한다. 조용기 목사는 이 위기의 해답을 "),
    bodyText("하나님의 시각", { bold: true }),
    bodyText("에서 찾는다."),
    new FootnoteReferenceRun(FN.think2001b),
  ]));

  content.push(bodyPara([
    bodyText("세상의 눈으로 자신을 보면 부족하고 연약한 존재에 불과하다. 그러나 하나님의 눈으로 보면, 우리는 "),
    bodyText("\"택하신 족속이요 왕 같은 제사장이요 거룩한 나라요 그의 소유가 된 백성\"", { italics: true }),
    bodyText("(벧전 2:9)이다. 자화상을 바꾸는 것은 세상의 눈에서 하나님의 눈으로 시각을 전환하는 것이다. 하나님이 나를 보시는 그대로 나를 보기 시작할 때, 삶은 근본적으로 변화한다."),
    new FootnoteReferenceRun(FN.think2010c),
  ]));

  content.push(heading2("3. 색안경의 비유"));

  content.push(bodyPara([
    bodyText("조용기 목사는 "),
    bodyText("색안경의 비유", { bold: true }),
    bodyText("를 자주 사용한다. 새파란 안경을 끼면 세상이 파랗게 보이고, 빨간 안경을 끼면 온 세상이 불타는 것처럼 빨갛게 보인다. 마찬가지로 마음속에 어떤 생각의 안경을 끼고 있느냐에 따라 같은 세상이 절망으로도 보이고 희망으로도 보인다. 문제는 세상이 변해야 하는 것이 아니라, 내 마음의 안경을 바꾸는 것이다."),
    new FootnoteReferenceRun(FN.think1984),
  ]));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════
  // 제4장
  // ═══════════════════════════════════════
  content.push(heading1("제4장. 마음의 밭과 생각의 씨앗"));

  content.push(bodyPara([
    bodyText("마태복음 13장의 씨뿌리는 자의 비유는 조용기 목사의 '생각' 신학에서 매우 중요한 위치를 차지한다. 이 비유를 통해 마음의 상태와 생각의 결과를 구체적으로 설명하기 때문이다."),
  ]));

  content.push(heading2("1. 네 가지 마음의 밭"));

  content.push(bodyPara([
    bodyText("예수님은 네 종류의 밭을 말씀하셨다. 조용기 목사는 이것을 현대 성도의 마음 상태에 적용한다."),
    new FootnoteReferenceRun(FN.think1986),
  ]));

  content.push(bodyPara([
    bodyText("첫째, 길가 같은 마음.", { bold: true }),
    bodyText(" 세속에 짓밟혀 굳어진 마음이다. 세상의 가치관으로 단단하게 굳어져서 말씀의 씨앗이 뿌려져도 뿌리를 내리지 못하고, 새(마귀)가 와서 먹어버린다."),
  ]));

  content.push(bodyPara([
    bodyText("둘째, 자갈밭 같은 마음.", { bold: true }),
    bodyText(" 겉으로는 받아들이는 것 같지만 깊이가 없다. 염려와 불안이 돌덩이처럼 밑에 깔려 있어서, 시련의 햇빛이 내리쬐면 금방 말라죽는다."),
  ]));

  content.push(bodyPara([
    bodyText("셋째, 가시밭 같은 마음.", { bold: true }),
    bodyText(" 탐심과 욕심이 가시떨기처럼 우거진 마음이다. 말씀이 들어와도 세상 염려와 재리의 유혹에 기운이 눌려 열매를 맺지 못한다."),
  ]));

  content.push(bodyPara([
    bodyText("넷째, 옥토 같은 마음.", { bold: true }),
    bodyText(" 회개하고 깨어져서 하나님 중심으로 돌아온 마음이다. 이 마음에 좋은 씨앗이 뿌려지면 "),
    bodyText("30배, 60배, 100배", { bold: true }),
    bodyText("의 열매를 맺는다."),
  ]));

  content.push(heading2("2. 매일의 생각이 매일의 씨앗이다"));

  content.push(quotePara(
    "우리의 매일 매일 생각하는 그 생각이 바로 마음의 밭에 뿌려서 매일 거두게 되는 씨앗이라는 것을 알아야 되는 것입니다."
  ));
  content.push(bodyPara([
    bodyText("— 「마음의 밭, 생각의 씨앗」(1986) 중에서", { italics: true, color: "666666", size: 20 }),
  ], { alignment: AlignmentType.RIGHT }));

  content.push(bodyPara([
    bodyText("이 관점에서 보면, 생각은 일회성 사건이 아니라 "),
    bodyText("매일 반복되는 파종 행위", { bold: true }),
    bodyText("이다. 오늘 무슨 생각을 했는가가 내일의 수확을 결정한다. 농부가 봄에 무엇을 심느냐에 따라 가을의 수확이 결정되듯이, 생각의 질이 삶의 질을 결정한다. 아무리 부지런해도 땅이 박토이고 씨가 나쁘면 수확이 없듯, 마음의 상태와 생각의 내용이 모든 것의 출발점이다."),
    new FootnoteReferenceRun(FN.think1986),
  ]));

  content.push(heading2("3. 의식화의 원리"));

  content.push(bodyPara([
    bodyText("조용기 목사는 생각의 반복적 주입을 "),
    bodyText("'의식화(이식화)'", { bold: true }),
    bodyText("라는 개념으로 설명한다. 사람의 마음에 어떤 생각을 반복적으로 이식시키느냐에 따라 전혀 다른 사람이 된다."),
    new FootnoteReferenceRun(FN.think1986),
  ]));

  content.push(bodyPara([
    bodyText("그는 극단적인 예를 든다. 공산주의 사상을 마음에 이식시키면 부모도 형제도 알아보지 못하고 대량 학살까지 자행하는 사람이 된다. 반대로 예수 그리스도의 십자가를 마음에 이식시키면 용서와 사랑과 치유와 축복의 열매를 맺는 사람이 된다. 같은 사람이라도 마음에 무엇을 심느냐에 따라 천사가 될 수도 있고 악마가 될 수도 있다."),
  ]));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════
  // 제5장
  // ═══════════════════════════════════════
  content.push(heading1("제5장. 겉사람과 속사람"));

  content.push(biblePara("\"우리가 낙심하지 아니하노니 겉사람은 후패하나 속사람은 날로 새롭도다\" (고후 4:16)"));

  content.push(bodyPara([
    bodyText("조용기 목사는 겉사람과 속사람의 구분을 통해 생각의 중요성을 또 다른 각도에서 조명한다. 겉사람은 육체, 외모, 사회적 지위 등 눈에 보이는 자아이다. 속사람은 생각, 영혼, 내면의 세계이다. 세상은 겉사람을 보지만, 하나님은 속사람을 보신다."),
    new FootnoteReferenceRun(FN.think2011b),
  ]));

  content.push(bodyPara([
    bodyText("겉사람은 나이가 들면 쇠해간다. 그것은 자연의 법칙이어서 누구도 막을 수 없다. 그러나 속사람은 "),
    bodyText("'날로 새로워진다'", { bold: true }),
    bodyText("고 성경은 말한다. 이것은 자동으로 이루어지는 것이 아니라, 의식적으로 속사람을 돌보고 생각을 새롭게 할 때 가능해진다."),
  ]));

  content.push(biblePara("\"오직 심령으로 새롭게 되어 하나님을 따라 의와 진리의 거룩함으로 지으심을 받은 새 사람을 입으라\" (엡 4:23-24)"));

  content.push(bodyPara([
    bodyText("속사람을 새롭게 하는 것은 곧 "),
    bodyText("생각을 새롭게 하는 것", { bold: true }),
    bodyText("이다. '심령으로 새롭게 되라'는 명령은 생각의 갱신을 뜻한다. 겉모습을 꾸미는 데 들이는 시간의 일부만이라도 속사람을 가꾸는 데 투자한다면, 삶의 질은 근본적으로 달라질 것이다."),
    new FootnoteReferenceRun(FN.think1999),
  ]));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════
  // 제6장
  // ═══════════════════════════════════════
  content.push(heading1("제6장. 생각을 어떻게 바꿀 것인가"));

  content.push(bodyPara("지금까지 생각이 왜 중요한지를 살펴보았다. 이제 핵심 질문에 답할 차례이다. 생각을 어떻게 바꿀 수 있는가? 조용기 목사는 40년간의 설교를 통해 구체적이고 실천적인 방법들을 제시하였다."));

  // 6-1
  content.push(heading2("1. 십자가를 기초로 생각을 바꿔라"));

  content.push(bodyPara([
    bodyText("세상에도 '긍정적 사고'를 가르치는 곳은 많다. 그러나 조용기 목사는 이유 없는 긍정은 오래가지 못한다고 지적한다."),
  ]));

  content.push(quotePara(
    "사람이 이유 없이 긍정적으로나 적극적으로 생각할 수 없습니다. 우리는 예수 그리스도의 십자가의 구속을 통해서 그것을 기초로 해서 우리 생각을 바꿔야 되는 것입니다."
  ));
  content.push(bodyPara([
    bodyText("— 「나, 나의 생각」(1981) 중에서", { italics: true, color: "666666", size: 20 }),
  ], { alignment: AlignmentType.RIGHT }));

  content.push(bodyPara([
    bodyText("기독교의 생각 전환에는 확실한 근거가 있다. "),
    bodyText("겟세마네 동산에서", { bold: true }),
    bodyText(" 예수님이 피땀을 흘리며 '내 뜻대로 마옵시고 아버지 뜻대로 하옵소서'라고 기도하셨기에, 우리는 '나는 순종할 수 있다'로 생각을 바꿀 근거가 있다. "),
    bodyText("가시관의 피가", { bold: true }),
    bodyText(" 저주를 해제하셨으므로(갈 3:13), 우리는 '나는 저주받지 않았다, 나는 축복받았다'고 생각할 수 있다. "),
    bodyText("십자가의 채찍 자국이", { bold: true }),
    bodyText(" 질병을 대속하셨으므로(사 53:5), 우리는 '나는 치유받았다'고 생각할 수 있다."),
    new FootnoteReferenceRun(FN.think1981),
  ]));

  content.push(bodyPara([
    bodyText("이것이 세상의 긍정적 사고(Positive Thinking)와 4차원 영성의 생각이 근본적으로 다른 지점이다. 십자가라는 역사적, 신학적 사실 위에 세워진 생각의 전환이기에, 감정에 좌우되지 않는 확고한 기초를 갖는다."),
  ]));

  // 6-2
  content.push(heading2("2. 회개하여 마음을 옥토로 만들어라"));

  content.push(bodyPara([
    bodyText("아무리 좋은 씨앗도 밭이 준비되어 있지 않으면 소용없다. 생각을 바꾸기 위한 첫 번째 단계는 "),
    bodyText("회개", { bold: true }),
    bodyText("이다."),
  ]));

  content.push(biblePara("\"회개하라 천국이 가까이 왔느니라\" (마 4:17)"));

  content.push(bodyPara([
    bodyText("'회개'의 원어 '메타노이아(metanoia)'는 문자적으로 '생각의 전환'을 뜻한다. 회개는 단순한 후회나 눈물이 아니다. 중심에서부터 "),
    bodyText("생각의 방향을 바꾸는 것", { bold: true }),
    bodyText("이다. 세속으로 향하던 길가 같은 마음을 깨뜨리고, 염려로 가득한 자갈밭을 파내고, 탐욕의 가시를 뽑아야 한다. 그래야 비로소 옥토가 되어 하나님의 말씀이 뿌리내릴 수 있다."),
    new FootnoteReferenceRun(FN.think1986),
  ]));

  content.push(quotePara(
    "하나님은 지극히 높은 보좌에 계시고 또한 마음이 깨어지고 회개하는 자의 마음을 소생케 하기 위하여 그와 같이 계신다."
  ));

  // 6-3
  content.push(heading2("3. 긍정적, 적극적, 창조적으로 생각하라"));

  content.push(bodyPara([
    bodyText("조용기 목사는 생각의 방향을 세 가지로 제시한다: "),
    bodyText("긍정적, 적극적, 창조적", { bold: true }),
    bodyText(" 사고이다."),
    new FootnoteReferenceRun(FN.think1984),
  ]));

  content.push(heading3("긍정적 사고 — 밝은 면을 보라"));

  content.push(bodyPara([
    bodyText("범사에 밝은 면을 찾고 희망을 품는 것이다. 로마서 8장 28절 "),
    bodyText("\"하나님을 사랑하는 자에게는 모든 것이 합력하여 선을 이루느니라\"", { italics: true }),
    bodyText("는 긍정적 사고의 궁극적 근거이다. 결국에는 선이 될 것을 알기에, 현재의 어려움 속에서도 절망하지 않을 수 있다."),
  ]));

  content.push(quotePara(
    "우리 예수 믿는 사람들에게는 부정적인 절망이란 있을 수가 없습니다. 우리에게는 끝없는 희망으로 꽉 들어차고 인생에 밝은 면만 찾아야 될 수 있는 의무가 있는 것입니다."
  ));

  content.push(heading3("적극적 사고 — 할 수 있다고 선포하라"));

  content.push(bodyPara([
    bodyText("소극적으로 '못한다, 안 된다'가 아니라 '할 수 있다, 하면 된다, 해보자'의 태도를 갖는 것이다."),
  ]));

  content.push(biblePara("\"내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라\" (빌 4:13)"));

  content.push(bodyPara([
    bodyText("오천 명을 먹이는 기적의 현장에서 빌립은 '이백 데나리온의 떡으로도 부족하다'며 소극적으로 반응했다. 그러나 안드레는 떡 다섯 개와 물고기 두 마리를 찾아 예수께 가져왔다. 안드레의 적극적 행동이 기적의 통로가 되었다. 소극적 사고는 가능성을 닫고, 적극적 사고는 하나님의 역사를 위한 문을 연다."),
    new FootnoteReferenceRun(FN.think1984),
  ]));

  content.push(heading3("창조적 사고 — 새것을 꿈꾸어라"));

  content.push(bodyPara([
    bodyText("옛것에 집착하지 말고 하나님이 하시는 새 일을 기대하는 것이다."),
  ]));

  content.push(biblePara("\"보라 내가 새 일을 행하리니 이제 나타낼 것이라 너희가 그것을 알지 못하겠느냐\" (사 43:19)"));

  content.push(bodyPara([
    bodyText("과거의 실패에 매이지 말고, 현재의 한계에 갇히지 말고, 하나님이 하실 수 있는 새로운 일을 향해 생각을 열어야 한다. 창조적 사고는 불가능해 보이는 상황에서도 하나님의 가능성을 발견하는 눈이다."),
    new FootnoteReferenceRun(FN.think1984),
  ]));

  // 6-4
  content.push(heading2("4. 말씀으로 생각을 무장하라"));

  content.push(bodyPara([
    bodyText("생각을 바꾸려면 새로운 내용으로 생각을 채워야 한다. 그 내용이 바로 "),
    bodyText("하나님의 말씀", { bold: true }),
    bodyText("이다."),
  ]));

  content.push(biblePara("\"무엇에든지 참되며 무엇에든지 경건하며 무엇에든지 옳으며 무엇에든지 정결하며 무엇에든지 사랑할 만하며 무엇에든지 칭찬할 만하며 무슨 덕이 있든지 무슨 기림이 있든지 이것들을 생각하라\" (빌 4:8)"));

  content.push(bodyPara([
    bodyText("이 말씀은 생각의 내용을 구체적으로 지시한다. 아무 생각이나 해도 되는 것이 아니라, 참되고 경건하고 옳고 정결하고 사랑할 만하고 칭찬할 만한 것으로 마음을 채워야 한다. 이것이 생각의 기준이다."),
    new FootnoteReferenceRun(FN.think1996b),
  ]));

  content.push(biblePara("\"이 율법책을 네 입에서 떠나지 말게 하며 주야로 그것을 묵상하라 그리하면 네 길이 평탄하게 될 것이며 네가 형통하리라\" (수 1:8)"));

  content.push(bodyPara([
    bodyText("주야로 말씀을 묵상하는 것, 이것이 생각의 무장이다. 세상의 정보와 뉴스와 걱정이 마음을 채우기 전에, 먼저 말씀으로 마음을 채우라. 그러면 부정적 생각이 들어올 자리가 없어진다."),
    new FootnoteReferenceRun(FN.think2017a),
  ]));

  // 6-5
  content.push(heading2("5. 생각을 사로잡아 그리스도께 복종시켜라"));

  content.push(biblePara("\"모든 이론을 파하며 하나님 아는 것을 대적하여 높아진 것을 다 파하고 모든 생각을 사로잡아 그리스도에게 복종케 하니\" (고후 10:5)"));

  content.push(bodyPara([
    bodyText("이 말씀은 생각을 바꾸는 것이 "),
    bodyText("영적 전투", { bold: true }),
    bodyText("임을 분명히 보여준다. '사로잡는다'는 표현은 전쟁 용어이다. 부정적 생각, 두려움, 원한, 탐욕이 떠오를 때 그것을 그냥 두는 것이 아니라 즉시 '붙잡아' 그리스도 앞에 가져가 복종시키는 것이다. 이것은 수동적 기다림이 아니라 능동적 전투이다."),
    new FootnoteReferenceRun(FN.think2017b),
  ]));

  content.push(bodyPara([
    bodyText("실천적으로 이것은, 부정적인 생각이 떠오를 때마다 의식적으로 그것을 인식하고, 말씀의 진리로 대체하는 훈련을 뜻한다. '나는 실패자야'라는 생각이 들면 즉시 '내게 능력 주시는 자 안에서 모든 것을 할 수 있다'(빌 4:13)로 대체한다. 이 과정이 쉽지는 않지만, 반복하면 생각의 패턴이 변하고, 생각의 패턴이 변하면 삶이 변한다."),
  ]));

  // 6-6
  content.push(heading2("6. 성령의 도움을 구하라"));

  content.push(bodyPara([
    bodyText("생각의 변화가 인간의 의지만으로 완성되지 않음을 조용기 목사는 분명히 한다."),
  ]));

  content.push(quotePara(
    "예수님의 보혈로 말미암아 성령의 치료하는 능력이 오늘날 여러분과 나에게 놓여났기 때문에 이제 우리가 예수를 구주로 모시면 예수께서 우리의 영을 치료하고 우리의 도덕성을 치료하고 우리의 생각을 고쳐서 그 속에 영생을 넣어 주시고 성령을 넣어 주신다."
  ));
  content.push(bodyPara([
    bodyText("— 「나, 나의 생각」(1981) 중에서", { italics: true, color: "666666", size: 20 }),
  ], { alignment: AlignmentType.RIGHT }));

  content.push(bodyPara([
    bodyText("인간의 의지만으로 타락한 생각을 완전히 바꿀 수 없다. 도덕으로도, 교육으로도, 철학으로도, 종교적 노력으로도 인간의 근본적 생각의 부패를 고칠 수 없다. 오직 예수 그리스도의 십자가 보혈이 그 부패를 씻고, 성령이 새로운 생각을 불어넣으실 때 진정한 변화가 일어난다. 따라서 생각의 변화를 위해 기도하고 성령의 능력을 의지하는 것이 필수적이다."),
    new FootnoteReferenceRun(FN.think1981),
  ]));

  // 6-7
  content.push(heading2("7. 감사와 찬양으로 마음을 채워라"));

  content.push(bodyPara([
    bodyText("마지막으로, 조용기 목사는 "),
    bodyText("감사와 찬양", { bold: true }),
    bodyText("을 생각 변화의 실천적 도구로 제시한다. 하나님과 화목함을 얻고 성령이 함께하심을 생각할 때 주야로 감사하고 찬미하게 된다. 감사의 생각이 마음을 채우면, 부정적 생각이 들어올 자리가 없어진다. 이것은 물리적 원리와 같다. 빛이 들어오면 어둠이 물러가듯, 감사와 찬양이 마음을 채우면 두려움과 원한과 절망이 자리를 잃는다."),
    new FootnoteReferenceRun(FN.think1986),
  ]));

  content.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══════════════════════════════════════
  // 결론
  // ═══════════════════════════════════════
  content.push(heading1("결론: 생각이 바뀌면 삶이 바뀐다"));

  content.push(biblePara("\"이 세대를 본받지 말고 오직 마음을 새롭게 함으로 변화를 받아 하나님의 선하시고 기뻐하시고 온전하신 뜻이 무엇인지 분별하도록 하라\" (롬 12:2)"));

  content.push(bodyPara([
    bodyText("로마서 12장 2절의 '변화를 받으라'는 원어로 '메타모르포오(metamorphoo)'이다. 이것은 애벌레가 나비로 변하는 것과 같은 "),
    bodyText("근본적 변형", { bold: true }),
    bodyText("을 뜻한다. 그리고 그 변형의 방법은 "),
    bodyText("'마음을 새롭게 함으로'", { bold: true }),
    bodyText("이다. 생각이 바뀌면 사람이 바뀌고, 사람이 바뀌면 삶이 바뀐다."),
    new FootnoteReferenceRun(FN.think2011a),
  ]));

  content.push(bodyPara([
    bodyText("조용기 목사의 137편 '생각' 설교를 종합하면, 4차원의 영성에서 생각이 첫 번째 자리를 차지하는 이유가 명확해진다. 생각은 단순한 정신 활동이 아니다. 그것은 "),
    bodyText("하나님의 형상이 반영된 인간 존재의 핵심", { bold: true }),
    bodyText("이며, "),
    bodyText("운명을 결정짓는 씨앗", { bold: true }),
    bodyText("이며, "),
    bodyText("하나님이 역사하시는 통로", { bold: true }),
    bodyText("이며, "),
    bodyText("영적 전투의 최전선", { bold: true }),
    bodyText("이다."),
  ]));

  content.push(bodyPara([
    bodyText("그리고 이 생각은 바뀔 수 있다. 십자가의 확실한 근거 위에서, 회개를 통해 마음을 옥토로 만들고, 말씀으로 무장하고, 부정적 생각을 사로잡아 그리스도께 복종시키며, 성령의 능력을 의지하고, 감사와 찬양으로 마음을 채울 때, 생각은 변화된다. 그리고 생각이 변화될 때, 삶은 변화된다."),
  ]));

  content.push(emptyLine());

  content.push(quotePara(
    "병든 생각 가진 사람 병든 인간 되고, 가난한 생각 가진 사람 가난한 인간 되고, 패배한 생각 가진 사람 패배한 인간 되고, 악한 생각 가진 사람 악한 인간 되기 때문에 이제 구원받은 우리들은 여러분과 나의 생각을 바꾸어서 올바른 생각, 승리로운 생각, 축복의 생각으로 변화를 시켜야만 되는 것입니다."
  ));
  content.push(bodyPara([
    bodyText("— 조용기, 「나, 나의 생각」(1981)", { italics: true, color: "666666", size: 20 }),
  ], { alignment: AlignmentType.RIGHT }));

  return content;
}

// ============================================================
// 문서 생성
// ============================================================
async function main() {
  const content = buildContent();

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Batang", size: 24 } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Dotum" },
          paragraph: { spacing: { before: 480, after: 300 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 30, bold: true, font: "Dotum" },
          paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 1 },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "Dotum" },
          paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 2 },
        },
      ],
    },
    footnotes: footnoteData,
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1700, right: 1440, bottom: 1700, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "4차원의 영성: 생각의 능력", font: "Dotum", size: 18, color: "999999" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "- ", font: "Dotum", size: 18, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Dotum", size: 18, color: "999999" }),
              new TextRun({ text: " -", font: "Dotum", size: 18, color: "999999" })],
          })],
        }),
      },
      children: content,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = "d:/AI_PROJECT/4th_dimension/sermon/4차원의영성_생각의능력.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("문서 생성 완료:", outPath);
}

main().catch(console.error);
