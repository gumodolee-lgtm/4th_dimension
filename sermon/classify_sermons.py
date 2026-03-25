#!/usr/bin/env python3
"""
4차원의 영성 설교 분류기 v2.1 (키워드 가중치 스코어링)
=====================================================
조용기 목사 설교를 생각/꿈/믿음/말 카테고리로 자동 분류

v2.1 개선:
- 인코딩 자동 감지 (utf-8, utf-8-sig, cp949, euc-kr)
- 꿈 카테고리 과다분류 개선 (제목 키워드 축소)
v2.0:
- 합본 파일 파싱 개선 (일시/일 시 형식 지원)
- 과잉분류 방지: 기독교 일반 용어 제외
- 본문 길이 정규화 (긴 설교에 유리하지 않도록)
- 기존 398편 검증 결과 반영한 키워드 튜닝
"""

import re
import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')


def read_file_auto_encoding(filepath):
    """파일 인코딩 자동 감지 - utf-8, cp949, euc-kr, utf-8-sig 순서로 시도"""
    encodings = ['utf-8', 'utf-8-sig', 'cp949', 'euc-kr']
    for enc in encodings:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                content = f.read()
            # 깨진 문자 비율 체크 (대체 문자 '�' 또는 '?' 과다)
            bad_chars = content.count('\ufffd') + content.count('?')
            if bad_chars > len(content) * 0.1:
                continue  # 이 인코딩은 맞지 않음
            return content
        except (UnicodeDecodeError, UnicodeError):
            continue
    # 모든 인코딩 실패 시 utf-8 + replace
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()

# ============================================================
# 1. 키워드 사전
# ============================================================
# 원칙: 4차원 영성에 특화된 키워드만 사용
# 기독교 일반 용어(기도, 은혜, 축복 등)는 제외

KEYWORDS = {
    "생각": {
        "high": [  # 가중치 5 — 4차원 생각에 특화된 표현
            "마음을 지키", "마음의 밭", "마음의 눈", "마음의 문",
            "자화상", "정체성", "자아상",
            "긍정적 사고", "부정적 사고", "긍정적인 사고", "부정적인 사고",
            "긍정적 생각", "부정적 생각",
            "의식의 전환", "생각의 씨앗",
            "마음의 변화", "마음의 평강", "마음의 청소",
            "마음을 다스리", "마음을 변화", "마음을 새롭",
        ],
        "mid": [  # 가중치 3
            "플러스 인생", "마이너스 인생",
            "속사람", "겉사람",
            "자존감", "열등감", "자기개발",
            "생각을 바꾸", "생각이 바뀌", "생각의 전환",
            "마음 청소", "쓰레기 청소",
            "시각차", "관점의",
        ],
        "low": [],  # 단일 키워드는 너무 일반적이므로 제거
        "title": [  # 제목 매칭 (가중치 20)
            "마음", "생각", "긍정", "부정", "태도", "시각",
            "정체성", "자화상", "누구인가", "누구입니까",
            "속사람", "겉사람", "마인드", "내면",
            "빈집", "청소", "변화의 능력",
        ],
    },
    "꿈": {
        "high": [
            "꿈을 꾸", "꿈을 가지", "꿈을 품",
            "비전을 가지", "비전을 품", "비전을 세우",
            "푯대를 향하",
            "동서남북을 바라보",
            # 주기도문 관련 ("나라이 임하", "이루어지이다" 등)은
            # 모든 설교에 등장 가능하므로 title에서만 매칭
        ],
        "mid": [
            "꿈꾸는 자",
            "가나안 땅", "예정과 예비",
        ],
        "low": [],
        "title": [
            "꿈", "꿈꾸는", "푯대",
            "나라이", "나라가", "임하옵",
            "동서남북", "쳐다보", "가나안",
            "예정과 예비", "예비된 안식",
            "이루어지",
        ],
    },
    "믿음": {
        "high": [
            "믿음의 조건", "믿음의 단계", "믿음의 시련",
            "믿음으로 살", "믿음으로 행하",
            "신앙의 단계", "신앙의 발전", "신앙의 열매",
            "아브라함의 신앙", "아브라함의 믿음",
            "반석 위에 세우", "반석 위에 서",
            "믿음이 잉태", "4차원의 믿음",
        ],
        "mid": [
            "하나님을 믿으라", "주님을 믿으라",
            "믿음의 빛", "믿음의 눈", "믿음의 사람",
        ],
        "low": [],
        "title": [
            "믿음", "신앙", "확신", "믿으라", "믿는",
            "아브라함", "시련", "시험",
            "극복", "인내", "반석",
            "패배자", "승리",
        ],
    },
    "말": {
        "high": [
            "말의 능력", "말의 힘", "말의 권능",
            "입술의 고백", "입으로 고백", "입으로 선포",
            "귀신을 쫓아내", "귀신이 나갔",
            "4차원의 말",
        ],
        "mid": [
            "고백의 능력", "선포의 능력", "선언의 능력",
            "예수의 이름으로", "주의 이름으로",
            "담대히 말씀을 전",
        ],
        "low": [],
        "title": [
            "고백", "선포", "선언", "증인", "증거",
            "간증", "메신저", "전파", "풀어놓", "쫓아내",
            "소식의", "이름으로", "말씀으로만",
            "입술", "혀", "회심",
        ],
    },
}

# 복합 패턴 — 4차원 영성 주제에 매우 특화된 표현만 (가중치 10)
COMPOUND_PATTERNS = {
    "생각": [
        r"생각[을의]?\s*(바꾸|변화시키|전환)",
        r"마음[을의]?\s*(지키라|다스려|새롭게)",
        r"긍정적[인으]?\s*(생각|사고|태도)",
        r"부정적[인으]?\s*(생각|사고|태도)",
        r"4차원[의으]?\s*생각",
        r"마음[의에]\s*(눈|밭|씨앗)",
    ],
    "꿈": [
        r"꿈[을의]?\s*(꾸|가지|품|그리)",
        r"비전[을의]?\s*(가지|품|세우)",
        r"4차원[의으]?\s*꿈",
        r"(목표|푯대)[를을]\s*(향하|세우)",
    ],
    "믿음": [
        r"4차원[의으]?\s*믿음",
        r"아브라함[의이]?\s*(믿음|신앙)",
        r"믿음[의이]\s*(시련|시험|조건|단계)",
    ],
    "말": [
        r"입[술으]?[로의]?\s*(고백|선포|선언)",
        r"(말|말씀)[의에]?\s*(능력|힘|권능)",
        r"4차원[의으]?\s*말",
    ],
}

# ============================================================
# 2. 설교 파싱 함수
# ============================================================

def parse_combined_file(filepath):
    """합본 파일 파싱 - 여러 형식 지원"""
    content = read_file_auto_encoding(filepath)

    filename = os.path.basename(filepath)
    sermons = []

    # 분리 패턴들 (우선순위대로 시도)
    split_patterns = [
        # "일 시 : YYYY년" 또는 "일시 : YYYY년" (2001-2010 형식)
        r'\n(?=일\s*시\s*[:：]\s*\d{4}년)',
        # "YYYY년 M월 D일" 직접 시작 (1981-2000 형식)
        r'\n(?=\d{4}년\s*\d{1,2}월\s*\d{1,2}일)',
        # "YYYY. M. D." 형식
        r'\n(?=\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.)',
        # "제목" 또는 "제 목" 기반
        r'\n(?=제\s*목\s*[:：])',
    ]

    best_parts = [content]  # fallback: 전체가 하나
    for pat in split_patterns:
        parts = re.split(pat, content)
        if len(parts) > len(best_parts):
            best_parts = parts

    for part in best_parts:
        part = part.strip()
        if len(part) < 100:
            continue

        # 날짜 추출
        date = ""
        date_match = re.search(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일', part)
        if not date_match:
            date_match = re.search(r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.', part)
        if date_match:
            y, m, d = date_match.groups()
            date = f"{y}-{int(m):02d}-{int(d):02d}"

        # 제목 추출 (다양한 형식)
        title = "제목 없음"
        title_match = re.search(r'제\s*목\s*[:：]\s*(.+?)(?:\n|$)', part)
        if title_match:
            title = title_match.group(1).strip()
        else:
            # 첫 줄에서 날짜 뒤 텍스트
            lines = part.split('\n')
            for line in lines[:5]:
                line = line.strip()
                # 날짜/메타정보 줄 스킵
                if re.match(r'^(일\s*시|설\s*교|말\s*씀|성\s*구|본\s*문|찬\s*송)', line):
                    continue
                if re.match(r'^\d{4}년', line):
                    after = re.sub(r'\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*', '', line).strip()
                    # "주일설교", "주일2부" 등 부가정보 제거
                    after = re.sub(r'주일\d?부?\s*설교\s*', '', after).strip()
                    if after and len(after) > 2:
                        title = after[:80]
                        break
                elif len(line) > 3 and not re.match(r'^\d{4}', line):
                    title = line[:80]
                    break

        sermons.append({
            "date": date,
            "title": title,
            "body": part,
            "source": filename,
        })

    return sermons


def parse_individual_file(filepath):
    """개별 날짜 파일(YYYY-MM-DD.txt) 파싱"""
    content = read_file_auto_encoding(filepath)

    # 인코딩 깨진 파일 체크 (여전히 깨진 경우)
    if content.count('\ufffd') > len(content) * 0.1:
        return []  # 깨진 파일 스킵

    filename = os.path.basename(filepath)
    date_match = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
    date = date_match.group(1) if date_match else ""

    # 제목 추출
    title = "제목 없음"
    title_match = re.search(r'제\s*목\s*[:：]\s*(.+?)(?:\n|$)', content)
    if title_match:
        title = title_match.group(1).strip()
    else:
        lines = content.split('\n')
        for line in lines[:10]:
            line = line.strip()
            if len(line) > 5 and not re.match(r'^\d{4}', line) and \
               not re.match(r'^(성구|본문|찬송|설교|\[|말씀|일시)', line):
                title = line[:80]
                break

    return [{
        "date": date,
        "title": title,
        "body": content,
        "source": filename,
    }]


def parse_dated_combined(filepath):
    """2011_all.txt, 2012_01_06.txt 파싱 - YYYY. M. D. 형식"""
    content = read_file_auto_encoding(filepath)

    sermons = []
    filename = os.path.basename(filepath)
    parts = re.split(r'\n(?=\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.)', content)

    for part in parts:
        part = part.strip()
        if len(part) < 100:
            continue

        date = ""
        date_match = re.search(r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.', part)
        if date_match:
            y, m, d = date_match.groups()
            date = f"{y}-{int(m):02d}-{int(d):02d}"

        title = "제목 없음"
        lines = part.split('\n')
        for i, line in enumerate(lines[:5]):
            line = line.strip()
            if i == 0:
                # 날짜+설교유형 제거 후 남은 텍스트
                after = re.sub(r'\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.\s*\S*설교\s*', '', line).strip()
                if after and len(after) > 2:
                    title = after[:80]
                    break
            elif len(line) > 2 and not re.match(r'^["\'"]', line) and not re.match(r'^\(', line):
                title = line[:80]
                break

        sermons.append({
            "date": date,
            "title": title,
            "body": part,
            "source": filename,
        })

    return sermons


# ============================================================
# 3. 스코어링 엔진
# ============================================================

def score_sermon(sermon):
    """설교를 4개 카테고리로 스코어링 (길이 정규화 포함)"""
    title = sermon["title"]
    body = sermon["body"]
    body_len = max(len(body), 1)

    # 정규화 기준: 10,000자 기준 (평균 설교 길이)
    norm_factor = 10000 / body_len

    scores = {"생각": 0.0, "꿈": 0.0, "믿음": 0.0, "말": 0.0}

    for cat, kw_dict in KEYWORDS.items():
        # 제목 키워드 (가중치 30, 정규화 안 함 — 제목이 최강 신호)
        for kw in kw_dict.get("title", []):
            if kw in title:
                scores[cat] += 30

        # 본문 키워드 (정규화 적용)
        for kw in kw_dict["high"]:
            count = len(re.findall(re.escape(kw), body))
            scores[cat] += count * 5 * norm_factor

        for kw in kw_dict["mid"]:
            count = len(re.findall(re.escape(kw), body))
            scores[cat] += count * 3 * norm_factor

        for kw in kw_dict["low"]:
            count = len(re.findall(re.escape(kw), body))
            scores[cat] += count * 1 * norm_factor

    # 복합 패턴 (가중치 8, 정규화 적용)
    for cat, patterns in COMPOUND_PATTERNS.items():
        for pat in patterns:
            count = len(re.findall(pat, body))
            scores[cat] += count * 8 * norm_factor

    # 소수점 정리
    scores = {k: round(v, 1) for k, v in scores.items()}
    return scores


def classify(scores, min_primary=30, secondary_ratio=0.6, min_secondary=20):
    """
    스코어 기반 주요/보조 분류

    - min_primary: 주요 카테고리 최소 점수 (높게 설정 → 기타 비율 확보)
    - secondary_ratio: 보조는 주요의 이 비율 이상이어야
    - min_secondary: 보조 카테고리 최소 점수
    """
    sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_cat, top_score = sorted_cats[0]
    second_cat, second_score = sorted_cats[1]

    if top_score < min_primary:
        return "기타", "", scores

    primary = top_cat
    secondary = ""
    if second_score >= top_score * secondary_ratio and second_score >= min_secondary:
        secondary = second_cat

    return primary, secondary, scores


# ============================================================
# 4. 검증 함수 (기존 398편과 비교)
# ============================================================

def load_ground_truth(py_path):
    """analyze_sermons.py에서 기존 분류 데이터 로드"""
    content = read_file_auto_encoding(py_path)

    entries = re.findall(
        r'\("([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\)',
        content
    )
    gt = {}
    for date, title, scripture, primary, secondary in entries:
        gt[title.strip()] = {"primary": primary, "secondary": secondary}
    return gt


def validate(results, gt):
    """기존 분류와 비교하여 정확도 측정"""
    matched = 0
    total_checked = 0
    mismatches = []

    for r in results:
        title = r["title"].strip()
        if title in gt:
            total_checked += 1
            expected = gt[title]["primary"]
            actual = r["primary"]
            if expected == actual:
                matched += 1
            else:
                mismatches.append({
                    "title": title,
                    "expected": expected,
                    "actual": actual,
                    "scores": r["scores"],
                })

    accuracy = matched / total_checked * 100 if total_checked > 0 else 0
    return accuracy, total_checked, matched, mismatches


# ============================================================
# 5. 메인 실행
# ============================================================

def main():
    sermon_dir = os.path.dirname(os.path.abspath(__file__))
    all_sermons = []

    print("=" * 80)
    print("4차원의 영성 설교 분류기 v2.1")
    print("=" * 80)

    # --- 합본 파일 ---
    combined_files = [
        "1981_1985_sermon.txt",
        "1986_1990_sermon.txt",
        "1991_1995_sermon.txt",
        "1996_2000_sermon.txt",
        "2001_2005_sermon.txt",
        "2006_2010_sermon.txt",
    ]
    for cf in combined_files:
        fp = os.path.join(sermon_dir, cf)
        if os.path.exists(fp):
            sermons = parse_combined_file(fp)
            all_sermons.extend(sermons)
            print(f"  [파싱] {cf}: {len(sermons)}편")

    # --- 2011, 2012 상반기 ---
    for cf in ["2011_all.txt", "2012_01_06.txt"]:
        fp = os.path.join(sermon_dir, cf)
        if os.path.exists(fp):
            sermons = parse_dated_combined(fp)
            all_sermons.extend(sermons)
            print(f"  [파싱] {cf}: {len(sermons)}편")

    # --- 개별 파일 (중복 제외) ---
    existing_dates = {s["date"] for s in all_sermons if s["date"]}
    individual_count = 0
    for fname in sorted(os.listdir(sermon_dir)):
        if re.match(r'\d{4}-\d{2}-\d{2}\.txt$', fname):
            date_str = fname.replace('.txt', '')
            if date_str in existing_dates:
                continue
            fp = os.path.join(sermon_dir, fname)
            parsed = parse_individual_file(fp)
            if parsed:
                all_sermons.extend(parsed)
                individual_count += 1
    print(f"  [파싱] 개별 파일: {individual_count}편 (중복 제외)")
    print(f"\n  ★ 총 파싱: {len(all_sermons)}편")
    print("=" * 80)

    # --- 분류 ---
    print("\n분류 중...")
    results = []
    for sermon in all_sermons:
        scores = score_sermon(sermon)
        primary, secondary, _ = classify(scores)
        results.append({
            "date": sermon["date"],
            "title": sermon["title"],
            "source": sermon["source"],
            "primary": primary,
            "secondary": secondary,
            "scores": scores,
        })

    # --- 검증 (기존 398편) ---
    gt_path = os.path.join(sermon_dir, "analyze_sermons.py")
    if os.path.exists(gt_path):
        gt = load_ground_truth(gt_path)
        accuracy, checked, matched, mismatches = validate(results, gt)
        print(f"\n【검증 결과】 기존 분류 대비")
        print(f"  비교 대상: {checked}편 / 일치: {matched}편 / 정확도: {accuracy:.1f}%")
        if mismatches:
            print(f"  불일치 {len(mismatches)}건 (상위 10건):")
            for mm in mismatches[:10]:
                print(f"    [{mm['expected']}→{mm['actual']}] {mm['title']}")
                print(f"      점수: {mm['scores']}")

    # --- 통계 ---
    stats = {"생각": 0, "꿈": 0, "믿음": 0, "말": 0, "기타": 0}
    stats_sec = {"생각": 0, "꿈": 0, "믿음": 0, "말": 0}
    for r in results:
        stats[r["primary"]] = stats.get(r["primary"], 0) + 1
        if r["secondary"]:
            stats_sec[r["secondary"]] = stats_sec.get(r["secondary"], 0) + 1

    total = len(results)
    dim4 = total - stats.get("기타", 0)

    print("\n" + "=" * 80)
    print("【분류 결과 종합 통계】")
    print("=" * 80)
    print(f"  전체: {total}편 | 4차원 분류: {dim4}편 ({dim4/total*100:.1f}%) | 기타: {stats.get('기타',0)}편 ({stats.get('기타',0)/total*100:.1f}%)")
    print()
    print(f"  {'카테고리':>8} | {'주요':>6} | {'보조':>6} | {'비율':>6}")
    print(f"  {'-'*8} | {'-'*6} | {'-'*6} | {'-'*6}")
    for cat in ["생각", "꿈", "믿음", "말"]:
        pct = stats[cat] / total * 100
        print(f"  {cat:>8} | {stats[cat]:>5}편 | {stats_sec.get(cat,0):>5}편 | {pct:>5.1f}%")
    pct_etc = stats.get("기타", 0) / total * 100
    print(f"  {'기타':>8} | {stats.get('기타',0):>5}편 |     - | {pct_etc:>5.1f}%")
    print(f"  {'합계':>8} | {total:>5}편 |       | 100.0%")

    # --- 카테고리별 목록 ---
    for cat in ["생각", "꿈", "믿음", "말"]:
        cat_results = [r for r in results if r["primary"] == cat]
        cat_results.sort(key=lambda x: x["scores"][cat], reverse=True)
        print(f"\n{'='*80}")
        print(f"【{cat}】 {len(cat_results)}편")
        print(f"{'='*80}")
        print(f"  {'날짜':<14} | {'제목':<44} | {'보조':>4} | {'점수':>6} | {'소스'}")
        print(f"  {'-'*14} | {'-'*44} | {'-'*4} | {'-'*6} | {'-'*20}")
        for r in cat_results:
            t = r["title"][:41] + "..." if len(r["title"]) > 44 else r["title"]
            sec = r["secondary"] if r["secondary"] else ""
            score = r["scores"][cat]
            d = r["date"] if r["date"] else "N/A"
            print(f"  {d:<14} | {t:<44} | {sec:>4} | {score:>6} | {r['source']}")

    # --- 기타 상위 (낮은 점수로 기타된 설교 확인용) ---
    etc_results = [r for r in results if r["primary"] == "기타"]
    if etc_results:
        print(f"\n{'='*80}")
        print(f"【기타 (미분류)】 {len(etc_results)}편 — 상위 20편")
        print(f"{'='*80}")
        # 전체 최고점수 기준 정렬
        etc_results.sort(key=lambda x: max(x["scores"].values()), reverse=True)
        for r in etc_results[:20]:
            t = r["title"][:44]
            d = r["date"] if r["date"] else "N/A"
            print(f"  {d:<14} | {t:<44} | {r['scores']}")

    # --- JSON 저장 ---
    output_path = os.path.join(sermon_dir, "classification_result.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "version": "2.0",
            "total": total,
            "stats": stats,
            "stats_secondary": stats_sec,
            "results": results,
        }, f, ensure_ascii=False, indent=2)
    print(f"\n\n결과 저장: {output_path}")


if __name__ == "__main__":
    main()
