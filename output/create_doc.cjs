const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat,
        HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageNumber, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "2E5090", type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, font: "Malgun Gothic", size: 20, color: "FFFFFF" })] })]
  });
}

function cell(texts, width, opts = {}) {
  const paragraphs = Array.isArray(texts) ? texts : [texts];
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    children: paragraphs.map(t => {
      if (typeof t === 'object' && t.type === 'paragraph') return t.value;
      return new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: String(t), font: "Malgun Gothic", size: 18 })] });
    })
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Malgun Gothic", size: 36, color: "1F3864" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, font: "Malgun Gothic", size: 28, color: "2E5090" })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, font: "Malgun Gothic", size: 24, color: "385723" })]
  });
}

function p(text, opts = {}) {
  const runs = [];
  if (opts.bold) {
    runs.push(new TextRun({ text, bold: true, font: "Malgun Gothic", size: opts.size || 20 }));
  } else {
    runs.push(new TextRun({ text, font: "Malgun Gothic", size: opts.size || 20, italics: opts.italics || false, color: opts.color }));
  }
  return new Paragraph({
    spacing: { before: opts.spaceBefore || 80, after: opts.spaceAfter || 80 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    alignment: opts.align,
    children: runs
  });
}

function quote(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: 500, right: 500 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: "2E5090", space: 8 } },
    children: [new TextRun({ text, font: "Malgun Gothic", size: 19, italics: true, color: "333333" })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Malgun Gothic", size: 20 })]
  });
}

function numberedItem(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Malgun Gothic", size: 20 })]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "CCCCCC", space: 8 } },
    children: []
  });
}

// ========== BUILD DOCUMENT ==========

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Malgun Gothic", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Malgun Gothic", color: "1F3864" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Malgun Gothic", color: "2E5090" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Malgun Gothic", color: "385723" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ] },
      { reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.DECIMAL, text: "%2)", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ] },
      { reference: "numbers2",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "(%1)", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        ] },
    ]
  },
  sections: [
    // ===== COVER PAGE =====
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: [
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "\uC0DD\uAC01 \uCE74\uD14C\uACE0\uB9AC \uC124\uAD50", font: "Malgun Gothic", size: 52, bold: true, color: "1F3864" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "\uC885\uD569 \uC815\uB9AC", font: "Malgun Gothic", size: 40, bold: true, color: "2E5090" })]
        }),
        divider(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: "77\uD3B8 \uC124\uAD50 \uBD84\uC11D \uBCF4\uACE0\uC11C", font: "Malgun Gothic", size: 28, color: "666666" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: "4\uCC28\uC6D0\uC758 \uC601\uC131 \uD504\uB85C\uC81D\uD2B8", font: "Malgun Gothic", size: 24, color: "888888" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: "2026\uB144 3\uC6D4", font: "Malgun Gothic", size: 24, color: "888888" })]
        }),
      ]
    },
    // ===== TABLE OF CONTENTS PAGE =====
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "2E5090", space: 4 } },
            children: [new TextRun({ text: "\uC0DD\uAC01 \uCE74\uD14C\uACE0\uB9AC \uC124\uAD50 \uC885\uD569 \uC815\uB9AC", font: "Malgun Gothic", size: 16, color: "888888" })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], font: "Malgun Gothic", size: 18 })]
          })]
        })
      },
      children: [
        h1("\uBAA9\uCC28"),
        new Paragraph({ spacing: { before: 200 } }),
        p("\uC81C1\uC7A5  \uC0DD\uAC01\uC758 \uC911\uC694\uC131 ............................................................. 2", { size: 22 }),
        new Paragraph({ spacing: { before: 100 } }),
        p("\uC81C2\uC7A5  \uC131\uACBD \uC778\uBB3C \uC911 \uC0DD\uAC01\uC744 \uBC14\uAFBC \uC0AC\uB78C\uB4E4 ............................. 6", { size: 22 }),
        new Paragraph({ spacing: { before: 100 } }),
        p("\uC81C3\uC7A5  \uC0DD\uAC01\uC744 \uC5B4\uB5BB\uAC8C \uBC14\uAFC0 \uC218 \uC788\uB294\uAC00 .............................. 11", { size: 22 }),
        new Paragraph({ spacing: { before: 100 } }),
        p("\uC81C4\uC7A5  \uC808\uB300\uAE0D\uC815, \uC808\uB300\uAC10\uC0AC\uC640 \uC0DD\uAC01\uC758 \uC5F0\uAD00\uC131 ..................... 16", { size: 22 }),
      ]
    },
    // ===== CHAPTER 1: 생각의 중요성 =====
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "2E5090", space: 4 } },
            children: [new TextRun({ text: "\uC81C1\uC7A5 | \uC0DD\uAC01\uC758 \uC911\uC694\uC131", font: "Malgun Gothic", size: 16, color: "888888" })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], font: "Malgun Gothic", size: 18 })]
          })]
        })
      },
      children: [
        h1("\uC81C1\uC7A5. \uC0DD\uAC01\uC758 \uC911\uC694\uC131"),
        p("\uD575\uC2EC \uC6D0\uB9AC: \"\uC0DD\uAC01\uC774 \uC778\uC0DD\uC758 \uD130\uC804\uC774\uBA70, \uC0B6\uC758 \uACB0\uACFC\uB97C \uACB0\uC815\uD55C\uB2E4\"", { bold: true, size: 22 }),
        divider(),

        // 1-1
        h2("1. \uC0DD\uAC01\uC740 \uC0DD\uBA85\uC758 \uADFC\uC6D0\uC774\uB2E4"),
        p("\uAC70\uC758 \uBAA8\uB4E0 \uC124\uAD50\uC5D0\uC11C \uBC18\uBCF5 \uC778\uC6A9\uB418\uB294 \uD575\uC2EC \uAD6C\uC808:"),
        quote("\uC7A0 4:23 \"\uBAA8\uB4E0 \uC9C0\uD0AC \uB9CC\uD55C \uAC83 \uC911\uC5D0 \uB354\uC6B1 \uB124 \uB9C8\uC74C\uC744 \uC9C0\uD0A4\uB77C \uC0DD\uBA85\uC758 \uADFC\uC6D0\uC774 \uC774\uC5D0\uC11C \uB0A8\uC774\uB2C8\uB77C\""),
        quote("\uC7A0 23:7 \"\uB300\uC800 \uADF8 \uB9C8\uC74C\uC758 \uC0DD\uAC01\uC774 \uC5B4\uB5A0\uD558\uBA74 \uADF8 \uC704\uC778\uB3C4 \uADF8\uB7EC\uD55C\uC989\""),
        p("\uC0DD\uAC01\uC740 \uC9D1\uC758 \uAE30\uCD08\uC640 \uAC19\uC2B5\uB2C8\uB2E4. \uC0DD\uAC01\uC758 \uD130\uAC00 \uB113\uACE0 \uBC14\uB974\uACE0 \uAC74\uAC15\uD558\uBA74 \uC778\uC0DD\uB3C4 \uD2BC\uD2BC\uD558\uACE0, \uC881\uACE0 \uBCD1\uB4E4\uBA74 \uC778\uC0DD\uB3C4 \uD5C8\uC57D\uD569\uB2C8\uB2E4."),
        quote("\"인생의 터는 바로 생각입니다. 생각이 흔들리지 않고 튼튼해야 그 위에 인생이란 집을 잘 지을 수 있습니다.\" (2013-11-03 생각의 터전)"),

        // 1-2
        h2("2. \uC0DD\uAC01\uC774 \uD604\uC2E4\uC744 \uCC3D\uC870\uD55C\uB2E4"),
        quote("\"생각이 더 커지면 꿈이 되고, 꿈을 꾸면 믿게 되고, 믿게 되면 말하게 되어, 결국에는 축복의 역사가 일어나게 됩니다.\" (2013-08-04 현실을 다스리며 사는 길)"),
        quote("\"지금 우리 주위에 형체를 입고 나타나는 모든 것은 한때 우리 마음에 생각으로 있었던 것입니다.\" (2019-03-31 마음을 지키라)"),
        quote("\"마음에 일어나지 않은 것은 환경에도 일어나지 않습니다.\" (2018-04-29 생명의 전문가, 예수)"),
        p("\uC0DD\uAC01\uC740 \uB2E8\uC21C\uD55C \uC815\uC2E0 \uD65C\uB3D9\uC774 \uC544\uB2C8\uB77C, \uBBF8\uB798\uB97C \uCC3D\uC870\uD558\uB294 \uC7AC\uB8CC\uC785\uB2C8\uB2E4. \uC124\uAD50\uC790\uB294 \uC77C\uAD00\uB418\uAC8C \"\uC0DD\uAC01 \u2192 \uAFC8 \u2192 \uBBFF\uC74C \u2192 \uB9D0\"\uC774\uB77C\uB294 4\uCC28\uC6D0 \uC601\uC131\uC758 \uC21C\uC11C\uB97C \uC81C\uC2DC\uD569\uB2C8\uB2E4."),

        // 1-3
        h2("3. \uC0DD\uAC01\uC740 \uC131\uB839\uACFC \uAD50\uC81C\uD558\uB294 \uC5F0\uACB0\uACE0\uB9AC\uC774\uB2E4"),
        quote("\"성령은 우리 생각을 통해서 교제하십니다. 생각으로 '성령님을 모신다'고 하면 들어오시고, '멀리한다'고 하면 떠나가십니다.\" (2014-12-14 네 자신을 알고 진리를 따라 살라)"),
        p("\uC0DD\uAC01\uC774 \uC131\uB839\uACFC\uC758 \uAD50\uC81C \uCC44\uB110\uC774 \uB418\uBBC0\uB85C, \uC0DD\uAC01\uC744 \uBC14\uB85C \uD558\uB294 \uAC83\uC774 \uC601\uC801 \uC0B6\uC758 \uCD9C\uBC1C\uC810\uC785\uB2C8\uB2E4."),

        // 1-4
        h2("4. \uC0DD\uAC01\uC740 \uC2B5\uAD00\uC774 \uB41C\uB2E4"),
        quote("\"물이 한 방향으로 계속 흐르면 물길이 생기듯이 생각도 계속하면 습관이 생기는 것입니다.\" (2017-10-01 생각의 중요성)"),
        p("\uAE0D\uC815\uC801 \uC0DD\uAC01\uC744 \uBC18\uBCF5\uD558\uBA74 \uAE0D\uC815\uC758 \uC2B5\uAD00\uC774 \uB418\uACE0, \uBD80\uC815\uC801 \uC0DD\uAC01\uC744 \uBC18\uBCF5\uD558\uBA74 \uBD80\uC815\uC758 \uC2B5\uAD00\uC774 \uB429\uB2C8\uB2E4."),

        // 1-5
        h2("5. \uBD80\uC815\uC801 \uC0DD\uAC01\uC758 \uBC30\uD6C4 \u2014 \uB9C8\uADC0"),
        quote("\"\uB9C8\uADC0\uAC00 \uBC8C\uC368 \uC2DC\uBAAC\uC758 \uC544\uB4E4 \uAC00\uB8DF \uC720\uB2E4\uC758 \uB9C8\uC74C\uC5D0 \uC608\uC218\uB97C \uD314\uB824\uB294 \uC0DD\uAC01\uC744 \uB123\uC5C8\uB354\uB77C\" (\uC694 13:2)"),
        quote("\"긍정적인 것의 배후에는 하나님이 계시고, 부정적인 것의 배후에는 마귀가 있습니다.\" (2015-03-15 나는 나의 자화상을 본다)"),
        p("\uB818 6:19 \"\uC774 \uBC31\uC131\uC5D0\uAC8C \uC7AC\uC559\uC744 \uB0B4\uB9AC\uB9AC\uB2C8 \uC774\uAC83\uC774 \uADF8\uB4E4\uC758 \uC0DD\uAC01\uC758 \uACB0\uACFC\uB77C\" \u2014 \uC720\uB2E4 \uBC31\uC131\uC758 \uC7AC\uC559\uC774 \uC0DD\uAC01\uC758 \uACB0\uACFC\uC784\uC744 \uACBD\uACE0\uD569\uB2C8\uB2E4."),

        // 1-6
        h2("6. \uACFC\uD559\uC801 \uADFC\uAC70"),
        bullet("\uD558\uBC84\uB4DC\uB300 \uC5D8\uB80C \uB801\uC5B4 \uAD50\uC218 \uC2E4\uD5D8: 70\uB300 \uB178\uC778 8\uBA85\uC774 50\uB300\uB85C \uB3CC\uC544\uAC14\uB2E4\uACE0 \uC0DD\uAC01\uD558\uBA70 \uC0DD\uD65C\uD558\uB2C8 \uC77C\uC8FC\uC77C \uB9CC\uC5D0 \uC2DC\uB825, \uCCAD\uB825, \uAE30\uC5B5\uB825\uC774 50\uB300 \uC218\uC900\uC73C\uB85C \uD68C\uBCF5"),
        bullet("\uD30C\uC2A4\uCE7C: \"\uC5B4\uC81C\uC758 \uC0DD\uAC01\uC774 \uC624\uB298\uC758 \uB2F9\uC2E0\uC744 \uB9CC\uB4E4\uACE0, \uC624\uB298\uC758 \uC0DD\uAC01\uC774 \uB0B4\uC77C\uC758 \uB2F9\uC2E0\uC744 \uB9CC\uB4E0\uB2E4\""),
        bullet("\uB7F0\uB358\uB300 \uC5F0\uAD6C: \uAE0D\uC815\uC801 \uC0AC\uB78C\uC774 \uBD80\uC815\uC801 \uC0AC\uB78C\uBCF4\uB2E4 \uD3C9\uADE0 \uC218\uBA85\uC774 10\uB144 \uB354 \uAE38\uB2E4"),
        bullet("\uD558\uB8E8\uC57C\uB9C8 \uC2DC\uAC8C\uC624: \"\uB9C8\uC74C\uC758 \uC0DD\uAC01\uC740 \uAD6C\uCCB4\uC801\uC778 \uD654\uD559\uBB3C\uC9C8\uB85C \uBD84\uBE44\uB418\uC5B4 \uAC74\uAC15\uC5D0 \uC601\uD5A5\uC744 \uC900\uB2E4\""),
        bullet("\uB370\uC77C \uCE74\uB124\uAE30: \"\uAC00\uC7A5 \uC870\uC2EC\uD574\uC57C \uD560 \uC77C\uC740 \uAC00\uB09C\uB3C4 \uC9C8\uBCD1\uB3C4 \uC544\uB2CC \uB2F9\uC2E0\uC758 \uC0DD\uAC01\uC785\uB2C8\uB2E4\""),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== CHAPTER 2 =====
        h1("\uC81C2\uC7A5. \uC131\uACBD \uC778\uBB3C \uC911 \uC0DD\uAC01\uC744 \uBC14\uAFBC \uC0AC\uB78C\uB4E4"),
        divider(),

        h2("A. \uAE0D\uC815\uC801\uC73C\uB85C \uC0DD\uAC01\uC744 \uBC14\uAFBC \uC778\uBB3C\uB4E4"),

        // Table for positive figures
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1400, 4560, 3400],
          rows: [
            new TableRow({ children: [
              headerCell("\uC778\uBB3C", 1400),
              headerCell("\uC0DD\uAC01\uC758 \uC804\uD658", 4560),
              headerCell("\uAD00\uB828 \uC124\uAD50", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uB2E4\uC717", 1400, { shading: "F2F7FB" }),
              cell("\uBAA8\uB4E0 \uC774\uC2A4\uB77C\uC5D8\uC774 \uACE8\uB9AC\uC557\uC744 \uB450\uB824\uC6CC\uD560 \uB54C \"\uB9CC\uAD70\uC758 \uC57C\uD6E8\uC758 \uC774\uB984\uC73C\uB85C \uB098\uC544\uAC04\uB2E4\"\uACE0 4\uCC28\uC6D0\uC801 \uC0AC\uACE0\uB85C \uC804\uD658. \"\uC808\uB300\uAE0D\uC815\uC758 \uC0DD\uAC01\uC744 \uAC00\uC9C4 \uC0AC\uB78C\" \u2014 \uD560 \uC218 \uC788\uB2E4! \uD558\uBA74 \uB41C\uB2E4! \uD574 \uBCF4\uC790!", 4560),
              cell("2013-09-15, 2015-11-08, 2017-10-01, 2018-08-19, 2019-03-03 \uB4F1 (\uAC00\uC7A5 \uBE48\uBC88)", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uC5EC\uD638\uC218\uC544\uC640 \uAC08\uB819", 1400, { shading: "F2F7FB" }),
              cell("10\uBA85\uC758 \uC815\uD0D0\uAFBC\uC774 \"\uC6B0\uB9AC\uB294 \uBA54\uB69C\uAE30 \uAC19\uB2E4\"\uACE0 \uD588\uC744 \uB54C \"\uADF8\uB4E4\uC740 \uC6B0\uB9AC\uC758 \uBC25\uC774\uB77C\"\uACE0 \uC120\uC5B8. \uAC08\uB819\uC740 85\uC138\uC5D0\uB3C4 \"\uB0B4 \uD798\uC774 \uADF8\uB54C\uB098 \uC9C0\uAE08\uC774\uB098 \uAC19\uB2E4\"\uBA70 \uC120\uBD09\uC7A5 \uC790\uC6D0", 4560),
              cell("2015-07-12, 2016-01-17, 2017-02-19, 2017-06-04, 2019-04-14 \uB4F1", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uBAA8\uC138", 1400, { shading: "F2F7FB" }),
              cell("\"\uB098\uB294 \uB204\uAD6C\uC774\uAE30\uC5D0 \uBC14\uB85C\uC5D0\uAC8C \uAC00\uBA70\"(\uCD9C 3:11)\uB77C\uB294 \uBD80\uC815\uC801 \uC790\uAE30\uC778\uC2DD\uC5D0\uC11C \u2192 \"\uD558\uB098\uB2D8\uC774 \uD568\uAED8\uD558\uC2DC\uB2C8 \uD560 \uC218 \uC788\uB2E4\"\uB294 \uC0DD\uAC01\uC73C\uB85C \uC804\uD658\uD558\uC5EC \uCD9C\uC560\uAD49\uC744 \uC774\uB054", 4560),
              cell("2012-08-19, 2013-09-15", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uBC14\uC6B8\uACFC \uC2E4\uB77C", 1400, { shading: "F2F7FB" }),
              cell("\uBE4C\uB9BD\uBCF4 \uAC10\uC625\uC5D0\uC11C \uB9E4\uB97C \uB9DE\uC740 \uD6C4 \uBD84\uB178/\uC6D0\uD55C \uB300\uC2E0 \uCC2C\uC1A1\uACFC \uAE30\uB3C4\uB97C \uC120\uD0DD \u2192 \uC9C0\uC9C4\uC774 \uC77C\uC5B4\uB098\uACE0 \uC625\uBB38\uC774 \uC5F4\uB9BC. \"\uB0B4\uAC8C \uB2A5\uB825 \uC8FC\uC2DC\uB294 \uC790 \uC548\uC5D0\uC11C \uBAA8\uB4E0 \uAC83\uC744 \uD560 \uC218 \uC788\uB290\uB2C8\uB77C\" (\uBE4C 4:13)", 4560),
              cell("2014-05-25, 2015-03-22, 2016-08-28, 2018-05-27", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uB098\uBCD1\uD658\uC790 \uB124 \uC0AC\uB78C", 1400, { shading: "F2F7FB" }),
              cell("\"\uC5EC\uAE30 \uC549\uC544 \uC8FD\uAE30\uB97C \uAE30\uB2E4\uB9B4 \uAC83\uC774\uB0D0?\" \u2014 \uC808\uB9DD\uC5D0\uC11C \uC2E4\uB0B1\uAC19\uC740 \uD76C\uB9DD\uC744 \uD5A5\uD574 \uC804\uC9C4\uD558\uAE30\uB85C \uACB0\uB2E8", 4560),
              cell("2019-06-23", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uD608\uB8E8\uBCD1 \uC5EC\uC778", 1400, { shading: "F2F7FB" }),
              cell("\"\uB098\uB294 \uBABB \uC0B0\uB2E4, \uB098\uB294 \uC8FD\uB294\uB2E4\"\uC5D0\uC11C \"\uC608\uC218\uB2D8 \uC637\uC790\uB77D\uB9CC \uB9CC\uC838\uB3C4 \uC0B0\uB2E4\"\uB85C \uC0DD\uAC01\uC774 \uBC14\uB00C\uC5B4 \uAE30\uC801 \uCCB4\uD5D8", 4560),
              cell("2016-01-17, 2017-10-01, 2019-03-31", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uAE30\uB4DC\uC628", 1400, { shading: "F2F7FB" }),
              cell("\"\uB098\uB294 \uAC00\uC7A5 \uC791\uC740 \uC790\"\uB77C\uB294 \uBD80\uC815\uC801 \uC790\uD654\uC0C1\uC5D0\uC11C \"\uD070 \uC6A9\uC0AC\uC5EC\"\uB77C\uB294 \uD558\uB098\uB2D8\uC758 \uD638\uCE6D\uC744 \uD1B5\uD574 \uBCC0\uD654", 4560),
              cell("2017-10-29, 2020-01-26", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uD0D5\uC790 (\uB458\uC9F8 \uC544\uB4E4)", 1400, { shading: "F2F7FB" }),
              cell("\uB3FC\uC9C0\uC18C\uAD74\uC5D0\uC11C \"\uC2A4\uC2A4\uB85C \uB3CC\uC774\uCF1C\" \uC544\uBC84\uC9C0\uAED8 \uB3CC\uC544\uAC10 \u2014 \uC790\uAE30\uC911\uC2EC\uC801 \uC0DD\uAC01\uC5D0\uC11C \uD68C\uAC1C\uC758 \uC0DD\uAC01\uC73C\uB85C \uC804\uD658", 4560),
              cell("2014-09-28, 2018-10-07", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uC548\uB4DC\uB808", 1400, { shading: "F2F7FB" }),
              cell("\uBE4C\uB9BD\uC774 \"\uBA39\uC77C \uBC29\uBC95\uC774 \uC5C6\uB2E4\"\uACE0 \uD560 \uB54C, \uBCF4\uB9AC\uB5A1\uACFC \uBB3C\uACE0\uAE30\uB97C \uC608\uC218\uB2D8\uAED8 \uAC00\uC838\uC634 \u2014 \uC608\uC218\uB2D8\uC744 \uACC4\uC0B0\uC5D0 \uB123\uC740 \uC0AC\uACE0", 4560),
              cell("2012-07-29, 2019-03-03", 3400),
            ]}),
          ]
        }),

        new Paragraph({ spacing: { before: 300 } }),
        h2("B. \uBD80\uC815\uC801\uC73C\uB85C \uC0DD\uAC01\uD55C \uC778\uBB3C\uB4E4"),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1600, 4360, 3400],
          rows: [
            new TableRow({ children: [
              headerCell("\uC778\uBB3C", 1600),
              headerCell("\uC798\uBABB\uB41C \uC0DD\uAC01", 4360),
              headerCell("\uAD00\uB828 \uC124\uAD50", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uC544\uB2F4\uACFC \uD558\uC640", 1600, { shading: "FDF2F2" }),
              cell("\uC798\uBABB\uB41C \uBC14\uB77C\uBD04\uC758 \uBC95\uCE59\uC73C\uB85C \uC120\uC545\uACFC\uB97C \uBCF4\uACE0, \uB9C8\uADC0\uC758 \uAC70\uC9D3\uB9D0\uC5D0 \uC18D\uC544 \uD558\uB098\uB2D8\uC758 \uBA85\uB839\uC744 \uC5B4\uAE40. \uAC10\uC0AC\uB97C \uC783\uC5B4\uBC84\uB824 \uD0C0\uB77D", 4360),
              cell("2013-04-14, 2013-11-03, 2015-02-01, 2016-02-28", 3400),
            ]}),
            new TableRow({ children: [
              cell("10\uBA85\uC758 \uC815\uD0D0\uAFBC", 1600, { shading: "FDF2F2" }),
              cell("\"\uC6B0\uB9AC\uB294 \uC2A4\uC2A4\uB85C \uBCF4\uAE30\uC5D0\uB3C4 \uBA54\uB69C\uAE30 \uAC19\uC73C\uB2C8\" \u2014 \uD558\uB098\uB2D8\uC774 \uBE60\uC9C4 \uC778\uAC04\uC801 \uC2DC\uAC01. \uACB0\uACFC: \uAD11\uC57C\uC5D0\uC11C \uC0AC\uB9DD", 4360),
              cell("2015-07-12, 2017-02-19, 2017-06-04", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uAC00\uB8DF \uC720\uB2E4", 1600, { shading: "FDF2F2" }),
              cell("\uB9C8\uADC0\uAC00 \uB9C8\uC74C\uC5D0 \uB123\uC5B4\uC900 \uC545\uD55C \uC0DD\uAC01\uC744 \uBC1B\uC544\uB4E4\uC784 (\uC694 13:2)", 4360),
              cell("2014-05-25, 2017-06-11", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uBE4C\uB9BD", 1600, { shading: "FDF2F2" }),
              cell("\uC624\uBCD1\uC774\uC5B4 \uC0AC\uAC74\uC5D0\uC11C \"\uC774\uBC31 \uB370\uB098\uB9AC\uC628\uC758 \uB5A1\uC774 \uBD80\uC871\uD558\uB9AC\uC774\uB2E4\" \u2014 3\uCC28\uC6D0\uC801, \uC778\uAC04\uC801 \uACC4\uC0B0\uB9CC \uD568", 4360),
              cell("2012-07-29, 2016-05-15, 2019-03-03", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uC694\uB098", 1600, { shading: "FDF2F2" }),
              cell("\uC560\uAD6D\uC2EC\uC774 \uD558\uB098\uB2D8\uC758 \uB73B\uC744 \uB118\uC5B4\uC11C \uC778\uAC04\uC801 \uC0DD\uAC01\uC73C\uB85C \uD558\uB098\uB2D8\uC758 \uBA85\uB839\uC744 \uAC70\uC5ED", 4360),
              cell("2018-01-07", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uAC00\uC778", 1600, { shading: "FDF2F2" }),
              cell("\uBD84\uB178\uC758 \uC0DD\uAC01\uC744 \uD488\uACE0 \uCC38\uC9C0 \uBABB\uD574 \uCD5C\uCD08\uC758 \uC0B4\uC778\uC744 \uC800\uC9C0\uB984", 4360),
              cell("2015-03-22", 3400),
            ]}),
            new TableRow({ children: [
              cell("\uC655\uC758 \uC7A5\uAD00 (\uC655\uD558 7\uC7A5)", 1600, { shading: "FDF2F2" }),
              cell("\"\uC57C\uD6E8\uAED8\uC11C \uD558\uB298\uC5D0 \uCC3D\uC744 \uB0B4\uC2E0\uB4E4 \uC5B4\uCC0C \uC774\uB7F0 \uC77C\uC774 \uC788\uC73C\uB9AC\uC694\" \u2014 \uBD88\uC2E0\uC559\uC758 \uC0DD\uAC01", 4360),
              cell("2019-06-23", 3400),
            ]}),
          ]
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== CHAPTER 3 =====
        h1("\uC81C3\uC7A5. \uC0DD\uAC01\uC744 \uC5B4\uB5BB\uAC8C \uBC14\uAFC0 \uC218 \uC788\uB294\uAC00"),
        divider(),

        h2("1. \uC131\uACBD \uB9D0\uC500 \uC77D\uAE30\uC640 \uBBC5\uC0C1 \u2014 \uAC00\uC7A5 \uD575\uC2EC\uC801 \uBC29\uBC95"),
        quote("\"생각을 바꾸는 가장 좋은 방법은 우리의 생각을 하나님의 말씀으로 가득 채우는 것입니다. 어둠을 몰아내기 위해 어둠과 싸울 필요 없이, 전등불을 켜서 빛으로 채우면 어둠은 저절로 물러갑니다.\" (2018-08-19)"),
        quote("\"성경보다 더 좋은 책이 없습니다.\" (2016-02-21)"),
        bullet("\uB9D0\uC500\uC5D0 \uC790\uAE30 \uC774\uB984\uC744 \uB123\uC5B4 \uC77D\uB294 \uAD6C\uCCB4\uC801 \uC2E4\uCC9C\uBC95 (2017-07-30)"),
        bullet("\uBBF5\uC0C1 = \"\uC528\uD600\uC11C \uB2E8\uBB3C\uC774 \uB098\uC624\uB294 \uAC83\" \u2014 \uC624\uC911\uBCF5\uC74C\uC744 \uD558\uB8E8\uC5D0 \uC218\uC2ED \uBC88 \uBBF5\uC0C1 (2019-07-14)"),

        h2("2. \uD68C\uAC1C \u2014 \uC0DD\uAC01\uC758 \uADFC\uBCF8\uC801 \uC804\uD658"),
        quote("\"회개는 '생각을 바꾼다'는 의미입니다. 인본주의적인 생각을 고치고 바꿔 예수님만을 의지하고 나갈 때 구원을 받을 수 있습니다.\" (2013-06-09 회개와 천국)"),
        bullet("\uB86C 12:2 \"\uC774 \uC138\uB300\uB97C \uBCF8\uBC1B\uC9C0 \uB9D0\uACE0 \uC624\uC9C1 \uB9C8\uC74C\uC744 \uC0C8\uB86D\uAC8C \uD568\uC73C\uB85C \uBCC0\uD654\uB97C \uBC1B\uC544\""),

        h2("3. \uC2ED\uC790\uAC00 \uBBF5\uC0C1"),
        quote("\"잠들기 전에 십자가 밑을 찾아가 마음에 이 생각이 가득하면 부정적인 생각이 들어올 데가 없습니다.\" (2016-02-21)"),
        bullet("\uC624\uC911\uBCF5\uC74C \uBBF5\uC0C1: \uC8C4 \uC0AC\uD568, \uC131\uB839 \uCDA9\uB9CC, \uCE58\uC720, \uCD95\uBCF5, \uBD80\uD65C \uCC9C\uAD6D (2018-04-29, 2019-07-14)"),

        h2("4. \uC785\uC220\uC758 \uACE0\uBC31 (\uCC3D\uC870\uC801 \uC120\uC5B8)"),
        quote("\"마음이 아무리 답답하고 고통스러울지라도 긍정적인 고백을 해야 합니다.\" (2019-03-31)"),
        bullet("\"\uD560 \uC218 \uC788\uB2E4, \uD558\uBA74 \uB41C\uB2E4, \uD574 \uBCF4\uC790\" \u2014 \uBC18\uBCF5 \uC120\uD3EC"),
        bullet("\"\uB098\uB294 \uC6A9\uC11C\uBC1B\uC740 \uC0AC\uB78C\uC774\uB2E4. \uC131\uB839\uB2D8\uC774 \uB098\uC640 \uAC19\uC774 \uACC4\uC2E0\uB2E4.\" (2019-03-31)"),
        bullet("\uC140\uD504\uD1A0\uD06C(Self-Talk): \uC131\uACBD \uB9D0\uC500\uC744 \uC790\uAE30 \uC790\uC2E0\uC5D0\uAC8C \uC18C\uB9AC \uB0B4\uC5B4 \uC77D\uC5B4\uC8FC\uAE30 (2017-10-29)"),

        h2("5. \uAC10\uC0AC\uC640 \uCC2C\uC591"),
        quote("\"감사할 수 없는 상황에서도 감사와 찬양을 고백하면 쓰디쓴 마음의 원한과 염려와 근심이 사라지고 희망이 넘치게 됩니다.\" (2014-05-25)"),
        bullet("\"\uBD80\uC815\uC801\uC778 \uB9D0\uC744 \uBB3C\uB9AC\uCE58\uB294 \uC88B\uC740 \uBC29\uBC95\uC740 \uAC10\uC0AC\uC758 \uB9D0\uC744 \uD558\uB294 \uAC83\" (2018-06-17)"),

        h2("6. \uBD80\uC815\uC801 \uC0DD\uAC01 \uC989\uC2DC \uB300\uC801\uD558\uAE30"),
        quote("\"부정적인 생각이 들어오면 '나사렛 예수의 이름으로 명하노니 물러가라!'고 명령하면 부정적 생각이 순식간에 떠나가는 것입니다.\" (2018-12-30)"),
        bullet("\uBD80\uC815\uC801 \uC0DD\uAC01\uC740 \uC7A1\uCD08\uCC98\uB7FC \uBE68\uB9AC \uBF51\uC544\uC57C \uD568 (2018-12-30)"),

        h2("7. \uAE30\uB3C4\uB85C \uD558\uB098\uB2D8\uAED8 \uB9E1\uAE30\uAE30"),
        quote("\"농구선수가 볼 던지듯이 '하나님 여기 던집니다. 받아 주십시오.'\" (2017-09-10)"),
        bullet("\uBE4C 4:6-7 \"\uAC10\uC0AC\uD568\uC73C\uB85C \uD558\uB098\uB2D8\uAED8 \uC544\uB8B0\uB77C \uADF8\uB9AC\uD558\uBA74 \uD558\uB098\uB2D8\uC758 \uD3C9\uAC15\uC774 \uB108\uD76C \uB9C8\uC74C\uACFC \uC0DD\uAC01\uC744 \uC9C0\uD0A4\uC2DC\uB9AC\uB77C\""),

        h2("8. \uBC14\uB77C\uBD04\uC758 \uBC95\uCE59 \uD65C\uC6A9"),
        bullet("\uBCF4\uC9C0 \uB9D0\uC544\uC57C \uD560 \uAC83\uC744 \uD53C\uD558\uACE0, \uD558\uB098\uB2D8\uC758 \uC57D\uC18D\uC744 \uBC14\uB77C\uBCF4\uAE30 (2013-12-01)"),
        bullet("\uD658\uACBD\uC774 \uC544\uB2CC \"\uC6B0\uB9AC\uC640 \uD568\uAED8 \uD558\uC2E0 \uBD84\"\uC744 \uBC14\uB77C\uBCF4\uB294 \uD6C8\uB828 (2013-01-13)"),

        h2("9. \uAE0D\uC815\uC801 \uC0AC\uB78C\uACFC\uC758 \uAD50\uC81C"),
        quote("링컨: \"내가 성공한 것은 부정적인 사람을 멀리하고 긍정적인 사람을 가까이 두었기 때문이다\" (2013-11-03)"),

        h2("10. \uC5B5\uC9C0\uB85C\uB77C\uB3C4 \uC2E4\uCC9C\uD558\uAE30 (\uD6C8\uB828)"),
        quote("\"두뇌는 환경이 그렇지 않은데도 불구하고 기뻐하고 즐거워하면 그것이 가짜인지 분별을 못한다.\" (2015-09-13)"),
        bullet("\uC2A4\uD2F0\uBE10 \uCF54\uBE44\uC758 \uBE44\uC720: \uC6B0\uC8FC\uC120\uC774 \uC9C0\uAD6C \uC911\uB825\uC744 \uB3CC\uD30C\uD558\uB294 \uAC83\uCC98\uB7FC \uCC98\uC74C\uC774 \uAC00\uC7A5 \uC5B4\uB835\uC9C0\uB9CC \uC77C\uB2E8 \uBC97\uC5B4\uB098\uBA74 \uC790\uC720\uB85C\uC6CC\uC9D0 (2018-08-19)"),

        new Paragraph({ children: [new PageBreak()] }),

        // ===== CHAPTER 4 =====
        h1("\uC81C4\uC7A5. \uC808\uB300\uAE0D\uC815, \uC808\uB300\uAC10\uC0AC\uC640 \uC0DD\uAC01\uC758 \uC5F0\uAD00\uC131"),
        divider(),

        h2("A. \uC808\uB300\uAE0D\uC815\uC758 \uC0DD\uAC01"),

        h3("1) \uC808\uB300\uAE0D\uC815\uC740 \uD558\uB098\uB2D8 \uC911\uC2EC\uC758 \uC0DD\uAC01\uC774\uB2E4"),
        quote("\"하나님의 생각에는 부정적인 것이 없다. 우리는 '할 수 없다'라고 생각하지만 하나님께서는 언제든지 '할 수 있다'라고 생각하시는 것입니다.\" (2019-03-03)"),
        quote("\"긍정적인 마음을 가지면 하나님이 곁에 오시고, 부정적인 마음을 가지면 마귀가 곁에 오는 것입니다.\" (2016-08-28)"),
        bullet("\uB2E4\uC717\uC744 \"\uC808\uB300\uAE0D\uC815\uC758 \uC0DD\uAC01\uC744 \uAC00\uC9C4 \uC0AC\uB78C\"\uC73C\uB85C \uBA85\uBA85 (2013-09-15)"),

        h3("2) \uC808\uB300\uAE0D\uC815\uC758 \uC2E4\uC81C\uC801 \uC120\uC5B8"),
        quote("\"절대긍정의 마음은 중요합니다. 없는 것을 있는 것같이 생각하고, 입으로 시인하면 생각할 수도 없는 희한한 일이 생겨납니다.\" (2018-06-17)"),
        quote("\"성도가 하나님의 말씀을 절대적으로 믿으면 마귀는 절대긍정에 절대부정으로 반격합니다. 그러나 승리자는 이미 예수님의 십자가에서 결정된 것\" (2020-01-26)"),
        bullet("\uAE30\uB3C4\uBB38: \"\uC804\uB2A5\uD558\uC2E0 \uD558\uB098\uB2D8, \uC6B0\uB9AC \uBAA8\uB450\uAC00 \uC808\uB300\uAE0D\uC815\uC758 \uB9C8\uC74C\uC744 \uAC16\uAC8C \uD558\uC2DC\uACE0, 4\uCC28\uC6D0\uC758 \uC601\uC131\uC73C\uB85C \uBB34\uC7A5\uD558\uAC8C \uD558\uC639\uC18C\uC11C.\" (2018-06-17)"),

        h3("3) \uC808\uB300\uAE0D\uC815\uC758 \uACFC\uD559\uC801 \uADFC\uAC70"),
        bullet("\uC601\uAD6D \uC2EC\uB9AC\uD559\uC790 \uD558\uB4DC\uD544\uB4DC: \"\uB10C \uD2C0\uB838\uC5B4\"\uB77C\uACE0 \uB9D0\uD560 \uB54C \uB2A5\uB825\uC758 30%\uB3C4 \uBC1C\uD718 \uBABB\uD558\uC9C0\uB9CC, \"\uB10C \uD560 \uC218 \uC788\uC5B4\"\uB77C\uACE0 \uB9D0\uD560 \uB54C \uB2A5\uB825\uC758 150%\uAE4C\uC9C0 \uBC1C\uD718 (2017-02-19)"),
        bullet("\uC18C\uB0D0 \uB958\uBCF4\uBA38\uC2A4\uD0A4 \uAD50\uC218: \"\uD658\uACBD\uC801 \uC694\uC778\uC740 10%\uBC16\uC5D0 \uC548 \uB418\uACE0, \uAE0D\uC815\uC801 \uC0DD\uAC01\uC774\uB098 \uBBFF\uC74C \uB4F1 \uC790\uAE30 \uB178\uB825\uC5D0 \uC758\uD574 \uD589\uBCF5\uC774 \uACB0\uC815\uB41C\uB2E4\" (2015-10-11)"),
        bullet("\uACE0\uB09C\uC744 \"\uBA54\uB69C\uAE30\"(\uC704\uD611)\uB85C \uBCFC \uAC83\uC778\uAC00, \"\uBC25\"(\uC601\uC591\uBD84)\uC73C\uB85C \uBCFC \uAC83\uC778\uAC00\uB294 \uC804\uC801\uC73C\uB85C \uC0DD\uAC01\uC5D0 \uB2EC\uB824 \uC788\uB2E4 (2015-07-12)"),

        new Paragraph({ spacing: { before: 300 } }),
        h2("B. \uC808\uB300\uAC10\uC0AC\uC758 \uC0DD\uAC01"),

        h3("1) \uAC10\uC0AC\uB294 \uB9C8\uC74C\uC744 \uAE0D\uC815\uC801\uC73C\uB85C \uBCC0\uD654\uC2DC\uD0A4\uB294 \uCD09\uB9E4\uC81C\uC774\uB2E4"),
        quote("\"감사는 긍정적인 생각을 갖게 하고 삶의 분위기를 행복하게 만들어 주는 것입니다.\" (2016-12-18)"),
        quote("\"감사는 아무 힘이 없어 보이지만 실상은 굉장한 힘이 있습니다. 악한 마음을 진동하고, 마귀의 진을 훼파하며, 하나님의 보좌를 진동해서 미래를 창조하는 능력을 허락하여 주십니다.\" (2013-01-13)"),
        quote("\"행복은 언제나 감사의 문으로 들어와서 불평의 문으로 나갑니다.\" (2016-12-18)"),

        h3("2) \uAC10\uC0AC\uB294 \uB9C8\uADC0\uB97C \uBB3C\uB9AC\uCE58\uB294 \uBB34\uAE30\uC774\uB2E4"),
        quote("\"감사와 찬송은 하나님에게는 영광의 지진이 일어나게 하고, 마귀에게는 불안과 절망의 지진이 일어나게 하는 것입니다.\" (2014-05-25)"),
        bullet("\uC544\uB2F4\uC740 \uAC10\uC0AC\uB97C \uC783\uC5B4\uBC84\uB824 \uD0C0\uB77D\uD588\uACE0, \uC695\uC740 \uBAA8\uB4E0 \uAC83\uC744 \uC783\uC5C8\uC744 \uB54C \uAC10\uC0AC\uD558\uC5EC \uB9C8\uADC0\uC758 \uADA4\uACC4\uB97C \uBC15\uC0B4\uB0C4 (2016-02-28)"),
        bullet("\"\uAC10\uC0AC\uB294 \uBAA8\uB4E0 \uC18D\uBC15\uC5D0\uC11C \uC6B0\uB9AC\uB97C \uC790\uC720\uB86D\uAC8C \uB9CC\uB4E4\uC5B4 \uC90D\uB2C8\uB2E4\" (2016-02-28)"),

        h3("3) \uBC94\uC0AC\uC5D0 \uAC10\uC0AC (\uC808\uB300\uAC10\uC0AC\uC758 \uC2E0\uD559\uC801 \uADFC\uAC70)"),
        quote("\"\uD56D\uC0C1 \uAE30\uBE60\uD558\uB77C \uC26C\uC9C0 \uB9D0\uACE0 \uAE30\uB3C4\uD558\uB77C \uBC94\uC0AC\uC5D0 \uAC10\uC0AC\uD558\uB77C \uC774\uAC83\uC774 \uADF8\uB9AC\uC2A4\uB3C4 \uC608\uC218 \uC548\uC5D0\uC11C \uB108\uD76C\uB97C \uD5A5\uD558\uC2E0 \uD558\uB098\uB2D8\uC758 \uB73B\uC774\uB2C8\uB77C\" (\uC0B4\uC804 5:16-18)"),
        quote("\"좋은 일에만 감사할 것이 아니라 좋지 않은 일에도 감사하고, 희망이 있어서 감사하고, 절망이라는 벽에 부딪혀도 감사해야 합니다.\" (2016-08-28)"),
        bullet("\uD55C\uC2A4 \uC140\uB9AC\uC5D0 \uBC15\uC0AC\uC758 \uC2A4\uD2B8\uB808\uC2A4 \uD574\uC18C \uBE44\uACB0: \"\uC5B4\uD504\uB9AC\uC2DC\uC5D0\uC774\uC158!(\uAC10\uC0AC!)\" (2017-09-10)"),

        new Paragraph({ spacing: { before: 300 } }),
        h2("C. \uC808\uB300\uAE0D\uC815\uACFC \uC808\uB300\uAC10\uC0AC\uC758 \uC21C\uD658 \uAD6C\uC870"),

        p("\uC124\uAD50\uB4E4\uC774 \uC81C\uC2DC\uD558\uB294 \uC0DD\uAC01 \u2192 \uC808\uB300\uAE0D\uC815 \u2192 \uC808\uB300\uAC10\uC0AC\uC758 \uC720\uAE30\uC801 \uC21C\uD658:", { bold: true }),
        new Paragraph({ spacing: { before: 100 } }),

        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1200, 1000, 7160],
          rows: [
            new TableRow({ children: [
              headerCell("\uB2E8\uACC4", 1200),
              headerCell("\uD750\uB984", 1000),
              headerCell("\uB0B4\uC6A9", 7160),
            ]}),
            new TableRow({ children: [
              cell("1\uB2E8\uACC4", 1200, { shading: "E8F0FE" }),
              cell("\u2192", 1000),
              cell("\uAC10\uC0AC\uC640 \uCC2C\uC591\uC73C\uB85C \uB9C8\uC74C\uC758 \uC4F4\uBB3C(\uBD80\uC815\uC801 \uC0DD\uAC01)\uC774 \uB2EC\uC544\uC9D0", 7160),
            ]}),
            new TableRow({ children: [
              cell("2\uB2E8\uACC4", 1200, { shading: "E8F0FE" }),
              cell("\u2192", 1000),
              cell("\uAE0D\uC815\uC801 \uC0DD\uAC01\uC774 \uC790\uB9AC\uC7A1\uC73C\uBA70 \uAFC8\uC774 \uC0DD\uACA8\uB0A8", 7160),
            ]}),
            new TableRow({ children: [
              cell("3\uB2E8\uACC4", 1200, { shading: "E8F0FE" }),
              cell("\u2192", 1000),
              cell("\uAFC8\uC774 \uBBFF\uC74C\uC73C\uB85C \uBC1C\uC804\uD568", 7160),
            ]}),
            new TableRow({ children: [
              cell("4\uB2E8\uACC4", 1200, { shading: "E8F0FE" }),
              cell("\u2192", 1000),
              cell("\uBBFF\uC74C\uC774 \uAE0D\uC815\uC801 \uACE0\uBC31(\uB9D0)\uC73C\uB85C \uB098\uC634", 7160),
            ]}),
            new TableRow({ children: [
              cell("5\uB2E8\uACC4", 1200, { shading: "E8F0FE" }),
              cell("\u2192", 1000),
              cell("\uC131\uB839\uC774 \uC5ED\uC0AC\uD558\uC154\uC11C \uD604\uC2E4\uC774 \uBCC0\uD654\uB428", 7160),
            ]}),
            new TableRow({ children: [
              cell("6\uB2E8\uACC4", 1200, { shading: "E8F0FE" }),
              cell("\u2192", 1000),
              cell("\uBCC0\uD654\uB41C \uD604\uC2E4\uC774 \uB354 \uAE4A\uC740 \uAC10\uC0AC\uB85C \uC774\uC5B4\uC9D0 \u2192 \uC21C\uD658 \uBC18\uBCF5", 7160),
            ]}),
          ]
        }),

        new Paragraph({ spacing: { before: 200 } }),
        p("\uD575\uC2EC \uC131\uACBD \uAD6C\uC808:", { bold: true }),
        quote("\uBE4C 4:6-7 \"\uC544\uBB34 \uAC83\uB3C4 \uC5FC\uB824\uD558\uC9C0 \uB9D0\uACE0 \uB2E4\uB9CC \uBAA8\uB4E0 \uC77C\uC5D0 \uAE30\uB3C4\uC640 \uAC04\uAD6C\uB85C, \uB108\uD76C \uAD6C\uD560 \uAC83\uC744 \uAC10\uC0AC\uD568\uC73C\uB85C \uD558\uB098\uB2D8\uAED8 \uC544\uB8B0\uB77C \uADF8\uB9AC\uD558\uBA74 \uBAA8\uB4E0 \uC9C0\uAC01\uC5D0 \uB6F0\uC5B4\uB09C \uD558\uB098\uB2D8\uC758 \uD3C9\uAC15\uC774 \uADF8\uB9AC\uC2A4\uB3C4 \uC608\uC218 \uC548\uC5D0\uC11C \uB108\uD76C \uB9C8\uC74C\uACFC \uC0DD\uAC01\uC744 \uC9C0\uD0A4\uC2DC\uB9AC\uB77C\""),

        new Paragraph({ spacing: { before: 200 } }),
        p("\uACB0\uB860:", { bold: true, size: 22 }),
        p("\uC808\uB300\uAE0D\uC815\uC740 \uC0DD\uAC01\uC758 \uCD9C\uBC1C\uC810\uC774\uBA70, \uC808\uB300\uAC10\uC0AC\uB294 \uBD80\uC815\uC801 \uC0DD\uAC01\uC744 \uC815\uD654\uD558\uACE0 \uAE0D\uC815\uC801 \uC0DD\uAC01\uC73C\uB85C \uC804\uD658\uD558\uB294 \uCD09\uB9E4\uC81C\uC785\uB2C8\uB2E4. \uC774 \uB458\uC774 \uD568\uAED8 \uC791\uC6A9\uD560 \uB54C 4\uCC28\uC6D0\uC758 \uC601\uC131(\uC0DD\uAC01, \uAFC8, \uBBFF\uC74C, \uB9D0)\uC774 3\uCC28\uC6D0\uC758 \uD604\uC2E4\uC744 \uBCC0\uD654\uC2DC\uD0A4\uB294 \uAC83\uC774 77\uD3B8 \uC124\uAD50\uC758 \uC77C\uAD00\uB41C \uBA54\uC2DC\uC9C0\uC785\uB2C8\uB2E4.", { size: 21 }),
      ]
    },
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("d:/Ai_aigent/4th_dimension/output/생각_카테고리_설교_종합정리.docx", buffer);
  console.log("Document created successfully!");
});
