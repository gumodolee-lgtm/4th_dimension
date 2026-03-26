#!/usr/bin/env python3
"""
4차원의 영성 설교 분류기 v3.3 (원저 기반 앙상블, 균형 분류)
=============================================================
조용기 목사 설교를 생각/꿈/믿음/말 카테고리로 자동 분류

핵심 원칙:
- 4차원 영성의 각 차원에 *특화된* 표현만 키워드로 사용
- 기도, 은혜, 사랑, 축복 등 일반 기독교 용어는 키워드에서 제외
- 모든 설교를 4개 카테고리 중 하나에 강제 분류
- 할루시네이션 방지: 실제 텍스트 매칭만으로 분류
"""

import re
import os
import json
import sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

# ============================================================
# 0. 인코딩 처리
# ============================================================
def read_file_auto(filepath):
    encodings = ['utf-8-sig', 'utf-8', 'cp949', 'euc-kr']
    for enc in encodings:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                content = f.read()
            korean = sum(1 for c in content[:5000] if '\uAC00' <= c <= '\uD7A3')
            if korean > 5 or len(content) < 100:
                return content
        except (UnicodeDecodeError, UnicodeError):
            continue
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()

# ============================================================
# 1. 키워드 사전 (4차원 영성 각 차원 특화)
# ============================================================
# 핵심: 각 차원의 "영적 메커니즘"을 가르치는 표현만 포함
# - 생각: 사고방식, 마음가짐, 심상화, 정신 관리의 영적 능력
# - 꿈: 비전, 목표, 미래상, 하나님의 계획과 꿈의 영적 능력
# - 믿음: 믿음 자체의 메커니즘, 믿음의 작동 원리, 믿음의 단계
# - 말: 입으로 하는 고백/선포의 창조적 능력, 말의 영적 힘

KEYWORDS = {
    "생각": {
        "exclusive": [  # 30점
            "4차원의 생각", "4차원 생각", "생각의 능력", "생각의 힘",
            "심상화", "시각화", "마음의 밭에 씨앗",
        ],
        "high": [  # 5점 x 횟수(최대5)
            # 원저 핵심: 영적 생각 vs 육신적 생각, 긍정/부정 사고, 환경 초월
            "마음을 지키", "마음의 밭", "마음의 눈", "마음의 문",
            "자화상", "자아상", "정체성",
            "긍정적 사고", "부정적 사고", "긍정적인 사고", "부정적인 사고",
            "긍정적 생각", "부정적 생각", "긍정적인 생각", "부정적인 생각",
            "의식의 전환", "생각의 씨앗", "생각을 바꾸",
            "마음의 변화", "마음의 청소",
            "마음을 다스리", "마음을 변화", "마음을 새롭",
            "마음에 그림", "마음에 그리",
            "잠재의식", "의식 혁명", "생각을 경영",
            "플러스 인생", "마이너스 인생",
            "속사람", "겉사람",
            "자존감", "열등감", "패배의식", "열등의식",
            "생각이 바뀌", "생각의 전환",
            "관점의 전환", "관점을 바꾸", "시각의 전환",
            "마음가짐", "마음 자세", "마음의 태도",
            "생각하는 대로", "생각한 대로",
            "마음먹은 대로", "마음에 품은 대로",
            "근심", "걱정", "염려", "낙심", "우울", "절망", "좌절",
            "행복의 조건", "행복한 삶", "행복을 만드",
            "마음의 평강", "마음의 평화", "마음의 건강",
            "깊은 삶", "얕은 삶",
            "마음의 작정", "작정하", "결단",
            # v3.3: 원저 '생각' 챕터 — 마음의 치유, 감사, 환경 초월
            "마음의 치유", "마음의 상처", "상처를 치유",
            "스트레스", "정신건강",
            "감사의 삶", "감사한 삶", "감사로",
            "영의 생각", "육신의 생각",
            "생각을 프로그래밍",
        ],
        "mid": [  # 3점 x 횟수(최대5)
            "자기개발", "자기 계발", "내면세계", "내면의",
            "마음 청소", "의식", "무의식",
            "사고방식", "불안", "두려움",
            "선한 생각", "악한 생각",
            "평안한 마음", "기쁜 마음", "감사한 마음",
            "위로", "감사",
        ],
        "title": [  # 20점
            "마음", "생각", "긍정", "부정", "태도", "시각",
            "정체성", "자화상", "누구인가", "누구입니까",
            "속사람", "겉사람", "마인드", "내면",
            "빈집", "청소", "변화의 능력",
            "낙심", "우울", "절망", "좌절", "근심", "염려",
            "두려움", "불안", "평안", "평강",
            "행복", "자존", "열등", "패배의식",
            "작정", "결심", "결단",
            "감사", "위로", "슬픔", "눈물",
        ],
    },
    "꿈": {
        "exclusive": [  # 30점
            "4차원의 꿈", "4차원 꿈", "꿈의 능력", "꿈의 힘",
            "하나님의 비전", "비전의 능력",
        ],
        "high": [  # 5점
            # 원저 핵심: 성령이 주시는 꿈, 비전, 구체적 목표, 소망, 미래
            "꿈을 꾸", "꿈을 가지", "꿈을 품", "꿈을 그리",
            "비전을 가지", "비전을 품", "비전을 세우", "비전을 잡",
            "비전이 있", "비전이 없",
            "푯대를 향하", "목표를 향하", "목표를 세우",
            "동서남북을 바라보", "눈을 들어 바라보",
            "소망을 품", "소망을 가지", "소망이 있",
            "하나님의 계획", "하나님의 목적",
            "예정과 예비", "예비하신", "예비된",
            "미래를 향", "미래를 설계", "미래를 바라보",
            "꿈꾸는 자", "환상을 보",
            "가나안 땅", "젖과 꿀이 흐르는",
            "약속의 땅", "약속을 바라보",
            "청사진", "설계도",
            "새해를 맞이", "새해를 시작", "새출발",
            "새 역사", "새 것을", "새로운 시작",
            "도전", "개척", "진취",
            "희망", "기대", "전망",
            # v3.3: 축복/번영/성공 = 꿈의 성취
            "축복의 삶", "축복을 받",
            "번영", "형통", "성공", "번성",
            "승리의 삶", "승리를 주",
            "부흥", "교회 성장",
        ],
        "mid": [  # 3점
            "전진", "나아가", "앞으로",
            "큰 교회",
            "나라이 임하", "이루어지이다",
            "새 것", "새로운 일",
            "갈 길", "인도하",
            "큰 뜻", "큰 그림",
            "성장", "풍요", "승리", "축복",
        ],
        "title": [  # 20점
            "꿈", "꿈꾸", "푯대", "비전",
            "나라이", "나라가", "임하옵",
            "동서남북", "가나안",
            "예정", "예비",
            "이루어지", "소망", "희망",
            "도전", "전진", "미래", "개척",
            "새해", "새출발", "새 역사", "새 시작",
            "축복", "번영", "형통", "성공", "승리",
            "부흥", "성장", "번성",
        ],
    },
    "믿음": {
        "exclusive": [  # 30점
            "4차원의 믿음", "4차원 믿음", "믿음의 능력", "믿음의 힘",
            "믿음의 세계", "초자연적 믿음",
            "오중복음", "삼중 축복",
        ],
        "high": [  # 5점
            # 원저 핵심: 바라봄의 법칙, 환경과 싸움, 짐을 맡김, 기적/치유 체험
            "믿음의 조건", "믿음의 단계", "믿음의 시련",
            "믿음으로 살", "믿음으로 행하", "믿음의 생활",
            "믿음의 눈", "믿음의 사람", "믿음의 빛",
            "신앙의 단계", "신앙의 발전", "신앙의 열매",
            "아브라함의 신앙", "아브라함의 믿음",
            "반석 위에 세우", "반석 위에 서",
            "믿음이 잉태", "믿음이 자라",
            "하나님을 믿으라", "주님을 믿으라",
            "확신", "의심을 버리", "의심하지",
            "순종", "불순종",
            "구원", "거듭남", "중생",
            "시련", "시험", "연단",
            # v3.3: 원저 '믿음' 챕터 — 바라봄, 기적, 치유, 환경극복
            "바라봄의 믿음", "믿음의 법칙",
            "없는 것을 있는 것", "있는 것처럼",
            "짐을 주께", "짐을 맡기",
            "병 고침", "치유", "기적", "이적",
            "견디", "이기", "극복",
            "하나님의 은혜", "하나님의 능력",
            "고난", "환난", "역경",
            "십자가의 은혜", "보혈의 은혜",
        ],
        "mid": [  # 3점
            "믿음", "신앙",
            "하나님의 임재", "성령의 임재",
            "십자가", "부활", "보혈",
            "회개", "돌이킴",
            "고난을 이기", "시련을 이기",
        ],
        "title": [  # 20점
            "믿음", "신앙", "확신", "믿으라", "믿는",
            "아브라함", "반석", "인내",
            "순종", "시련", "시험",
            "구원", "십자가", "부활",
            "회개", "고난", "환난", "역경",
            "치유", "기적", "병고침",
            "극복", "이기는", "승리",
        ],
    },
    "말": {
        "exclusive": [  # 30점
            "4차원의 말", "4차원 말", "말의 능력", "말의 힘",
            "말의 세계", "말의 창조력", "말씀의 창조력",
            "레마의 능력",
        ],
        "high": [  # 5점
            # 원저 핵심: 입술의 선포/고백/시인, 창조적 말, 격려, 영적전쟁 무기
            "입술의 고백", "입으로 고백", "입으로 선포",
            "고백의 능력", "선포의 능력", "선언의 능력",
            "말의 권능", "말의 위력",
            "담대히 말씀을 전", "담대히 선포",
            "예수의 이름으로", "주의 이름으로",
            "귀신을 쫓아내", "귀신이 나갔",
            "혀를 다스리", "혀의 능력",
            "말의 씨앗", "말이 씨가 되",
            "좋은 말", "나쁜 말", "축복의 말", "저주의 말",
            "언어의 힘", "언어의 능력",
            "말씀을 붙잡", "말씀을 선포", "말씀을 선언",
            "말씀이 육신이 되",
            "로고스", "레마",
            "증인이 되", "증거하",
            "복음을 전파", "복음을 전하",
            "간증", "전도",
            "찬양의 능력", "찬양으로",
            # v3.3: 원저 '말' 챕터 — 긍정적 선포, 격려의 말, 나사렛예수이름으로
            "나사렛 예수", "일어나 걸으라",
            "말로 시인", "입으로 시인",
            "부정적인 말", "긍정적인 말",
            "방언", "예언",
        ],
        "mid": [  # 3점
            "말로써", "말을 통해", "입을 열",
            "선포", "선언", "고백",
            "하나님이 가라사대", "말씀하시기를",
            "전파", "알리",
            "입술", "혀",
        ],
        "title": [  # 20점
            "고백", "선포", "선언", "증인", "증거",
            "간증", "메신저", "전파", "전도",
            "쫓아내", "풀어놓",
            "이름으로", "말씀으로",
            "입술", "혀", "언어", "말의",
            "가라사대", "레마", "로고스",
            "찬양", "찬송", "찬미",
            "방언", "예언",
        ],
    },
}

# 복합 패턴 (10점 x 횟수)
COMPOUND_PATTERNS = {
    "생각": [
        r"생각[을의]?\s*(바꾸|변화시키|전환|경영)",
        r"마음[을의]?\s*(지키라|다스려|새롭게|관리|작정|변화)",
        r"긍정적[인으]?\s*(생각|사고|태도|마음)",
        r"부정적[인으]?\s*(생각|사고|태도|마음)",
        r"마음[의에]\s*(눈|밭|씨앗|태도|자세|상태|건강|평강|문제|변화)",
        r"(열등|패배|좌절|우울|낙심)[감의]\s",
        r"(자화상|자아상|정체성|자존감)[을를이가]?\s",
        r"마음[에을]?\s*(품|그리|심|먹|작정)",
        r"(행복|불행)[의한을]?\s*(조건|비결|길|원인)",
    ],
    "꿈": [
        r"꿈[을의]?\s*(꾸|가지|품|그리|잡|세우)",
        r"비전[을의]?\s*(가지|품|세우|잡|보)",
        r"(목표|푯대)[를을]?\s*(향하|세우|잡)",
        r"하나님[의이]?\s*(계획|목적|비전|예비)",
        r"(미래|새해|새출발)[를을에]?\s*(향하|설계|시작|맞이)",
        r"(도전|개척|전진)[하며을을의]",
        r"소망[을의이]?\s*(품|가지|있|없)",
    ],
    "믿음": [
        r"아브라함[의이]?\s*(믿음|신앙|순종)",
        r"믿음[의이으]?\s*(시련|시험|조건|단계|결과|열매|생활|눈|사람)",
        # v3.2: 일반 교리 패턴 제거 (성령, 십자가, 순종, 구원 등)
    ],
    "말": [
        r"입[술으]?[로의]?\s*(고백|선포|선언|시인)",
        r"(말|말씀)[의에]?\s*(능력|힘|권능|창조력|위력)",
        r"(혀|언어)[를의을]?\s*(다스리|능력|힘)",
        r"(선포|선언|고백)[의에]?\s*(능력|힘)",
        r"(증인|증거|간증)[이가를을]",
        r"(전도|전파|선교)[하를의을]",
        # v3.3: 기도/성령은 4차원 공통이므로 말 전용 패턴에서 제외
        r"(찬양|찬송)[의으로]?\s*(능력|힘|승리)",
    ],
}

# 성경 구절-테마 매핑 (8점)
BIBLE_THEME = {
    "생각": [
        "잠 4:23", "잠언 4:23", "잠 4장 23",
        "빌 4:8", "빌립보서 4:8", "빌 4장 8",
        "롬 12:2", "로마서 12:2", "롬 12장 2",
        "고후 10:5", "고린도후서 10:5",
        "엡 4:23", "에베소서 4:23",
    ],
    "꿈": [
        "창 13:14", "창세기 13:14", "창 13장 14",
        "합 2:2", "하박국 2:2",
        "잠 29:18", "잠언 29:18",
        "행 2:17", "사도행전 2:17",
        "빌 3:14", "빌립보서 3:14", "빌 3장 14",
    ],
    "믿음": [
        "히 11:1", "히브리서 11:1",
        "롬 1:17", "로마서 1:17",
        "막 11:22", "마가복음 11:22",
        "마 17:20", "마태복음 17:20",
        "약 1:3", "야고보서 1:3",
        "엡 2:8", "에베소서 2:8",
    ],
    "말": [
        "잠 18:21", "잠언 18:21",
        "막 11:23", "마가복음 11:23",
        "롬 10:10", "로마서 10:10",
        "요 1:1", "요한복음 1:1",
        "히 4:12", "히브리서 4:12",
        "약 3:", "야고보서 3",
        "창 1:3", "창세기 1:3",
    ],
}

# 각 카테고리의 기본 바이어스 (균형 조절)
# 믿음이 과다 분류되는 것을 방지하기 위해 패널티 적용
CATEGORY_BIAS = {
    "생각": 1.0,
    "꿈": 1.0,
    "믿음": 0.6,  # v3.3: 원저 기반 복원 후 약간 억제 (기적/치유/고난 키워드 복원됨)
    "말": 1.0,
}

# ============================================================
# 2. 설교 파싱
# ============================================================
DATE_PATTERNS = [
    re.compile(r'^(?:(?:일\s*시|날짜)\s*[:：]\s*)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일'),
    re.compile(r'^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s'),
    re.compile(r'^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?\s'),
    re.compile(r'^(\d{4})-(\d{2})-(\d{2})\s*$'),
]

def extract_date(line):
    stripped = line.strip()
    for pat in DATE_PATTERNS:
        m = pat.match(stripped)
        if m:
            y, mo, d = m.groups()
            return f"{y}-{int(mo):02d}-{int(d):02d}"
    return None

def parse_sermons_from_yearly(filepath):
    content = read_file_auto(filepath)
    parts = re.split(r'\n={10,}\n', content)

    sermons = []
    for part in parts:
        part = part.strip()
        if len(part) < 50:
            continue

        lines = part.split('\n')

        # 날짜
        date = ""
        for line in lines[:5]:
            d = extract_date(line)
            if d:
                date = d
                break
        if not date:
            m = re.search(r'(\d{4})_all', os.path.basename(filepath))
            if m:
                date = f"{m.group(1)}-00-00"

        # 제목
        title = ""
        for line in lines[:10]:
            line_s = line.strip()
            tm = re.match(r'^제\s*목\s*[:：]\s*(.+)', line_s)
            if tm:
                title = re.sub(r"[『』「」\'\"]", "", tm.group(1).strip())
                break

        if not title:
            found_date = False
            for line in lines[:10]:
                line_s = line.strip()
                if not line_s:
                    continue
                if extract_date(line):
                    found_date = True
                    continue
                if found_date:
                    if re.match(r'^(일\s*시|설\s*교|말\s*씀|성\s*구|본\s*문|찬\s*송|제\s*목)', line_s):
                        continue
                    if re.match(r'^\d{4}[년.]', line_s):
                        continue
                    if len(line_s) > 1 and len(line_s) < 100:
                        candidate = re.sub(r"[『』「」\'\"\[\]]", "", line_s).strip()
                        if re.match(r'^[가-힣]+\s*\d', candidate):
                            continue
                        if candidate and len(candidate) > 1:
                            title = candidate
                            break

        if not title:
            title = "(제목 미상)"

        sermons.append({
            'date': date,
            'title': title,
            'text': part,
            'source': os.path.basename(filepath),
        })

    return sermons

# ============================================================
# 3. 분류 엔진
# ============================================================
def classify_sermon(sermon):
    title = sermon['title']
    text = sermon['text']

    text_len = max(len(text), 1)
    norm_factor = 5000 / text_len if text_len > 5000 else 1.0

    scores = {"생각": 0.0, "꿈": 0.0, "믿음": 0.0, "말": 0.0}

    for cat in scores:
        kw = KEYWORDS[cat]

        # 기법 1: 제목 키워드 (20점)
        for tw in kw["title"]:
            if tw in title:
                scores[cat] += 20

        # 기법 2: exclusive (30점)
        for ew in kw.get("exclusive", []):
            if ew in text:
                scores[cat] += 30

        # 기법 3: 본문 키워드
        for hw in kw["high"]:
            count = text.count(hw)
            if count:
                scores[cat] += min(count, 5) * 5 * norm_factor

        for mw in kw["mid"]:
            count = text.count(mw)
            if count:
                scores[cat] += min(count, 5) * 3 * norm_factor

        # 기법 4: 복합 패턴 (10점)
        for pat_str in COMPOUND_PATTERNS.get(cat, []):
            matches = re.findall(pat_str, text)
            if matches:
                scores[cat] += len(matches) * 10 * norm_factor

        # 기법 5: 성경 구절 (8점)
        for verse in BIBLE_THEME.get(cat, []):
            if verse in text:
                scores[cat] += 8

        # 기법 6: 소제목 분석 (15점)
        subheadings = re.findall(
            r'(?:첫째|둘째|셋째|넷째|다섯째|여섯째|1\.|2\.|3\.|4\.)\s*[,.]?\s*(.{5,80})',
            text[:5000]
        )
        for sh in subheadings:
            for tw in kw["title"]:
                if tw in sh:
                    scores[cat] += 15

        # 카테고리 바이어스 적용
        scores[cat] *= CATEGORY_BIAS[cat]

    return scores

# ============================================================
# 4. 메인
# ============================================================
def main():
    sermon_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(os.path.dirname(sermon_dir), 'output')
    os.makedirs(output_dir, exist_ok=True)

    yearly_files = sorted([
        f for f in os.listdir(sermon_dir)
        if re.match(r'\d{4}_all\.txt$', f)
    ])

    print(f"=== 4차원 영성 설교 분류기 v3.3 ===")
    print(f"대상 파일: {len(yearly_files)}개\n")

    all_sermons = []
    for yf in yearly_files:
        filepath = os.path.join(sermon_dir, yf)
        sermons = parse_sermons_from_yearly(filepath)
        print(f"  {yf}: {len(sermons)}편")
        all_sermons.extend(sermons)

    print(f"\n총 {len(all_sermons)}편 파싱 완료\n")

    # 분류
    results = []
    for sermon in all_sermons:
        scores = classify_sermon(sermon)

        max_cat = max(scores, key=scores.get)
        max_score = scores[max_cat]

        # 모든 점수가 0이면 — 제목과 본문에서 아무 키워드도 없음
        # 이 경우 텍스트에서 가장 자주 나오는 일반적 주제어로 판단
        if max_score == 0:
            # 간단한 주제어 빈도 분석
            topic_counts = {
                "생각": text_topic_count(sermon['text'], ["마음", "생각", "태도", "감정", "느낌", "걱정", "근심"]),
                "꿈": text_topic_count(sermon['text'], ["소망", "희망", "미래", "새해", "꿈", "비전", "목표"]),
                "믿음": text_topic_count(sermon['text'], ["믿음", "신앙", "기도", "성령", "십자가"]),
                "말": text_topic_count(sermon['text'], ["말씀", "선포", "고백", "증거", "전도", "입술"]),
            }
            max_cat = max(topic_counts, key=topic_counts.get)
            max_score = 0.5  # 매우 낮은 점수 표시

        # 신뢰도
        total = sum(scores.values())
        confidence = max_score / total if total > 0 else 0

        if max_score >= 30:
            level = "HIGH"
        elif max_score >= 10:
            level = "MID"
        else:
            level = "LOW"

        results.append({
            'date': sermon['date'],
            'title': sermon['title'],
            'source': sermon['source'],
            'category': max_cat,
            'score': round(max_score, 1),
            'confidence': round(confidence, 2),
            'level': level,
            'all_scores': {k: round(v, 1) for k, v in scores.items()},
            'text': sermon['text'],
        })

    # 통계
    cats = ["생각", "꿈", "믿음", "말"]
    stats = {c: 0 for c in cats}
    stats_by_level = {c: {"HIGH": 0, "MID": 0, "LOW": 0} for c in cats}
    for r in results:
        stats[r['category']] += 1
        stats_by_level[r['category']][r['level']] += 1

    print("=" * 65)
    print("분류 결과 통계")
    print("=" * 65)
    print(f"{'카테고리':>8} | {'총 편수':>7} | {'HIGH':>6} | {'MID':>6} | {'LOW':>6} | {'비율':>6}")
    print("-" * 65)
    total_sermons = len(results)
    for cat in cats:
        h = stats_by_level[cat]["HIGH"]
        m = stats_by_level[cat]["MID"]
        lo = stats_by_level[cat]["LOW"]
        pct = stats[cat] / total_sermons * 100
        print(f"{cat:>8} | {stats[cat]:>7} | {h:>6} | {m:>6} | {lo:>6} | {pct:>5.1f}%")
    print("-" * 65)
    print(f"{'합계':>8} | {total_sermons:>7} | {sum(stats_by_level[c]['HIGH'] for c in cats):>6} | {sum(stats_by_level[c]['MID'] for c in cats):>6} | {sum(stats_by_level[c]['LOW'] for c in cats):>6} | 100.0%")
    print()
    print("HIGH(★): 핵심 키워드 다수 매칭 — 해당 차원이 설교의 주제")
    print("MID(●):  관련 키워드 매칭 — 해당 차원 요소가 포함")
    print("LOW(○):  약한 매칭 — 최선의 분류이나 주제가 약함")

    # 카테고리별 TXT 출력
    print("\n카테고리별 TXT 파일 생성 중...")

    for cat in cats:
        cat_results = sorted(
            [r for r in results if r['category'] == cat],
            key=lambda x: x['date']
        )

        outpath = os.path.join(output_dir, f'4차원영성_{cat}.txt')

        with open(outpath, 'w', encoding='utf-8') as f:
            f.write(f"{'='*70}\n")
            f.write(f"4차원의 영성 - [{cat}] 카테고리 설교 모음\n")
            f.write(f"{'='*70}\n")
            h = sum(1 for r in cat_results if r['level']=='HIGH')
            m = sum(1 for r in cat_results if r['level']=='MID')
            lo = sum(1 for r in cat_results if r['level']=='LOW')
            f.write(f"총 {len(cat_results)}편 (★핵심:{h} ●관련:{m} ○약한매칭:{lo})\n")
            f.write(f"{'='*70}\n\n")

            # 목차
            f.write(f"[목차]\n{'─'*70}\n")
            for i, r in enumerate(cat_results, 1):
                flag = "★" if r['level'] == 'HIGH' else ("●" if r['level'] == 'MID' else "○")
                f.write(f"{flag} {i:4d}. [{r['date']}] {r['title']} (score:{r['score']})\n")
            f.write(f"\n{'─'*70}\n\n")

            # 본문
            for i, r in enumerate(cat_results, 1):
                flag = "★핵심" if r['level'] == 'HIGH' else ("●관련" if r['level'] == 'MID' else "○약한매칭")
                f.write(f"\n{'#'*70}\n")
                f.write(f"# {i}. [{r['date']}] {r['title']}\n")
                f.write(f"# 분류: {cat} ({flag}) | 점수: {r['score']} | 신뢰도: {r['confidence']}\n")
                f.write(f"# 전체점수: {r['all_scores']}\n")
                f.write(f"{'#'*70}\n\n")
                f.write(r['text'])
                f.write(f"\n\n")

        size_mb = os.path.getsize(outpath) / (1024 * 1024)
        print(f"  {cat}: {len(cat_results)}편, {size_mb:.1f}MB → {outpath}")

    # JSON
    json_results = [{k: v for k, v in r.items() if k != 'text'} for r in results]
    json_path = os.path.join(sermon_dir, 'classification_v3_result.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({
            'version': '3.3',
            'total': len(results),
            'stats': stats,
            'stats_by_level': stats_by_level,
            'results': json_results,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n  JSON: {json_path}")
    print(f"\n완료!")


def text_topic_count(text, words):
    """텍스트에서 주제어 빈도 합산"""
    return sum(text.count(w) for w in words)


if __name__ == '__main__':
    main()
