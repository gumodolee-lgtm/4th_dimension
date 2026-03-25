#!/usr/bin/env python3
"""
LLM 기반 경계 사례 재분류 스크립트
==================================
키워드 분류기의 경계 사례(불일치/저점)를 Claude API로 재분류하여
classification_result.json에 오버라이드를 적용합니다.

사용법:
  set ANTHROPIC_API_KEY=sk-ant-...
  python llm_reclassify.py
"""

import os
import re
import json
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

# ============================================================
# 1. 설정
# ============================================================
SERMON_DIR = os.path.dirname(os.path.abspath(__file__))
BATCH_SIZE = 5  # 한 API 호출당 설교 수
MODEL = "claude-haiku-4-5-20251001"  # 비용 효율적

SYSTEM_PROMPT = """당신은 조용기 목사의 "4차원의 영성" 신학 전문가입니다.

4차원의 영성에는 4개 요소가 있습니다:
1. **생각** (Thought): 마음 다스림, 긍정적 사고, 자아상, 정체성, 마음의 변화, 의식 전환
2. **꿈** (Dream/Vision): 하나님의 비전, 꿈을 꾸라, 목표/푯대, 약속의 땅, 미래에 대한 소망과 계획
3. **믿음** (Faith): 믿음의 조건/단계/시련, 아브라함의 신앙, 확신, 말씀 위의 믿음
4. **말** (Word/Confession): 입술의 고백, 말의 능력, 선포/선언, 증인/증거, 귀신 쫓아냄

**중요 원칙:**
- 설교의 핵심 주제가 위 4가지 중 하나에 명확히 해당할 때만 해당 카테고리로 분류
- 단순히 키워드가 언급된 것이 아니라, 설교 전체의 메시지가 해당 주제를 중심으로 할 때 분류
- 일반 기독교 설교(구원, 성령, 사랑, 봉사, 회개 등)는 "기타"로 분류
- 확실하지 않으면 "기타"로 분류"""

USER_PROMPT_TEMPLATE = """다음 설교들의 제목과 본문 요약을 보고, 각각을 분류해주세요.

카테고리: 생각, 꿈, 믿음, 말, 기타

각 설교에 대해 반드시 아래 JSON 형식으로만 답하세요 (다른 텍스트 없이):
[
  {{"id": 0, "category": "카테고리명", "confidence": "high/medium/low", "reason": "한줄 이유"}},
  ...
]

---
{sermons_text}
"""


# ============================================================
# 2. 경계 사례 추출
# ============================================================
def extract_borderline_cases():
    """경계 사례 추출: 불일치 + 저점 분류 + 고점 기타"""
    with open(os.path.join(SERMON_DIR, 'classification_result.json'), 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Ground truth 로드
    gt = {}
    gt_path = os.path.join(SERMON_DIR, 'analyze_sermons.py')
    if os.path.exists(gt_path):
        with open(gt_path, 'r', encoding='utf-8') as f:
            content = f.read()
        entries = re.findall(
            r'\("([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\)',
            content
        )
        gt = {title.strip(): primary for _, title, _, primary, _ in entries}

    borderline = []
    seen_titles = set()

    for r in data['results']:
        title = r['title'].strip()
        if title in seen_titles:
            continue

        is_borderline = False
        reason = ""

        # 1) Ground truth 불일치
        if title in gt and gt[title] != r['primary']:
            is_borderline = True
            reason = f"GT불일치: 예상={gt[title]}, 실제={r['primary']}"

        # 2) 4차원 분류 중 저점 (30~45)
        elif r['primary'] != '기타':
            score = r['scores'][r['primary']]
            if score <= 45:
                is_borderline = True
                reason = f"저점: {r['primary']}={score:.1f}"

        # 3) 기타 중 고점 (23~30)
        elif r['primary'] == '기타':
            top_score = max(r['scores'].values())
            if top_score >= 23:
                is_borderline = True
                top_cat = max(r['scores'], key=r['scores'].get)
                reason = f"기타고점: {top_cat}={top_score:.1f}"

        if is_borderline:
            seen_titles.add(title)
            borderline.append({
                'title': title,
                'source': r['source'],
                'date': r['date'],
                'current_primary': r['primary'],
                'scores': r['scores'],
                'reason': reason,
                'body_preview': '',  # 나중에 채움
            })

    return borderline, data


def read_file_auto(filepath):
    """인코딩 자동 감지"""
    for enc in ['utf-8', 'utf-8-sig', 'cp949', 'euc-kr']:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                return f.read()
        except (UnicodeDecodeError, UnicodeError):
            continue
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        return f.read()


def fill_body_previews(cases):
    """각 경계 사례의 본문 요약(첫 800자)을 채움"""
    # 소스 파일별로 한번만 읽기
    file_cache = {}

    for case in cases:
        source = case['source']
        fp = os.path.join(SERMON_DIR, source)

        if source not in file_cache:
            if os.path.exists(fp):
                file_cache[source] = read_file_auto(fp)
            else:
                file_cache[source] = ""

        content = file_cache[source]
        title = case['title']

        # 제목 주변 본문 추출
        idx = content.find(title[:15])
        if idx >= 0:
            start = max(0, idx)
            body = content[start:start + 2000]
            # 첫 800자만 사용 (API 비용 절감)
            case['body_preview'] = body[:800]
        else:
            case['body_preview'] = f"[제목: {title}]"


# ============================================================
# 3. Claude API 호출
# ============================================================
def classify_batch(client, batch, batch_idx, total_batches):
    """한 배치의 설교를 Claude API로 분류"""
    sermons_text = ""
    for i, case in enumerate(batch):
        sermons_text += f"\n### 설교 {i}\n"
        sermons_text += f"제목: {case['title']}\n"
        sermons_text += f"날짜: {case['date']}\n"
        sermons_text += f"본문 발췌:\n{case['body_preview']}\n"

    prompt = USER_PROMPT_TEMPLATE.format(sermons_text=sermons_text)

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.text if hasattr(response, 'text') else response.content[0].text

        # JSON 파싱
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if json_match:
            results = json.loads(json_match.group())
            print(f"  배치 {batch_idx+1}/{total_batches}: {len(results)}편 분류 완료")
            return results
        else:
            print(f"  배치 {batch_idx+1}: JSON 파싱 실패, 원문: {text[:200]}")
            return []
    except Exception as e:
        print(f"  배치 {batch_idx+1} API 에러: {e}")
        return []


# ============================================================
# 4. 결과 병합 및 저장
# ============================================================
def merge_results(data, cases, llm_results):
    """LLM 결과를 기존 분류에 오버라이드"""
    # 제목 → LLM 결과 매핑
    overrides = {}
    for case, llm in zip(cases, llm_results):
        if llm and llm.get('category') in ['생각', '꿈', '믿음', '말', '기타']:
            if llm.get('confidence') in ['high', 'medium']:
                overrides[case['title']] = {
                    'category': llm['category'],
                    'confidence': llm.get('confidence', 'unknown'),
                    'reason': llm.get('reason', ''),
                }

    # 기존 결과에 오버라이드 적용
    changed = 0
    for r in data['results']:
        title = r['title'].strip()
        if title in overrides:
            old = r['primary']
            new = overrides[title]['category']
            if old != new:
                r['primary'] = new
                r['llm_override'] = {
                    'from': old,
                    'to': new,
                    'confidence': overrides[title]['confidence'],
                    'reason': overrides[title]['reason'],
                }
                changed += 1

    return data, changed


# ============================================================
# 5. 메인
# ============================================================
def main():
    # API 키 확인
    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY 환경변수를 설정해주세요.")
        print("  set ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    print("=" * 70)
    print("4차원의 영성 설교 분류 — LLM 경계 사례 재분류")
    print("=" * 70)

    # 경계 사례 추출
    print("\n[1/4] 경계 사례 추출 중...")
    cases, data = extract_borderline_cases()
    print(f"  경계 사례: {len(cases)}편")

    # 본문 미리보기 채우기
    print("\n[2/4] 본문 로드 중...")
    fill_body_previews(cases)
    print(f"  본문 로드 완료")

    # 배치별 API 호출
    print(f"\n[3/4] Claude API 분류 중 (모델: {MODEL}, 배치 크기: {BATCH_SIZE})...")
    all_llm_results = [None] * len(cases)
    total_batches = (len(cases) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(cases), BATCH_SIZE):
        batch = cases[i:i + BATCH_SIZE]
        batch_idx = i // BATCH_SIZE
        results = classify_batch(client, batch, batch_idx, total_batches)

        for j, res in enumerate(results):
            if i + res.get('id', j) < len(all_llm_results):
                all_llm_results[i + res.get('id', j)] = res

        # Rate limit 대응
        if batch_idx < total_batches - 1:
            time.sleep(0.5)

    classified = sum(1 for r in all_llm_results if r is not None)
    print(f"  총 {classified}/{len(cases)}편 LLM 분류 완료")

    # 결과 병합
    print("\n[4/4] 결과 병합 중...")
    data, changed = merge_results(data, cases, all_llm_results)
    print(f"  변경: {changed}편")

    # 통계 재계산
    stats = {"생각": 0, "꿈": 0, "믿음": 0, "말": 0, "기타": 0}
    for r in data['results']:
        stats[r['primary']] = stats.get(r['primary'], 0) + 1
    total = len(data['results'])
    dim4 = total - stats.get('기타', 0)

    print(f"\n{'='*70}")
    print(f"【LLM 재분류 후 최종 통계】")
    print(f"{'='*70}")
    print(f"  전체: {total}편 | 4차원: {dim4}편 ({dim4/total*100:.1f}%) | 기타: {stats['기타']}편 ({stats['기타']/total*100:.1f}%)")
    print(f"\n  {'카테고리':>8} | {'편수':>6} | {'비율':>6}")
    print(f"  {'-'*8} | {'-'*6} | {'-'*6}")
    for cat in ["생각", "꿈", "믿음", "말", "기타"]:
        pct = stats[cat] / total * 100
        print(f"  {cat:>8} | {stats[cat]:>5}편 | {pct:>5.1f}%")

    # 변경 상세
    overridden = [r for r in data['results'] if 'llm_override' in r]
    if overridden:
        print(f"\n{'='*70}")
        print(f"【LLM 오버라이드 상세】 {len(overridden)}건")
        print(f"{'='*70}")
        for r in overridden:
            ov = r['llm_override']
            print(f"  [{ov['from']}→{ov['to']}] {r['title'][:45]}")
            print(f"    사유: {ov['reason']} (확신도: {ov['confidence']})")

    # 저장
    data['version'] = '2.1-llm'
    data['stats'] = stats
    data['llm_overrides_count'] = changed

    output_path = os.path.join(SERMON_DIR, 'classification_result.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n결과 저장: {output_path}")

    # 검증
    gt_path = os.path.join(SERMON_DIR, 'analyze_sermons.py')
    if os.path.exists(gt_path):
        with open(gt_path, 'r', encoding='utf-8') as f:
            content = f.read()
        entries = re.findall(
            r'\("([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\)',
            content
        )
        gt = {title.strip(): primary for _, title, _, primary, _ in entries}

        matched = total_checked = 0
        for r in data['results']:
            title = r['title'].strip()
            if title in gt:
                total_checked += 1
                if gt[title] == r['primary']:
                    matched += 1
        accuracy = matched / total_checked * 100 if total_checked else 0
        print(f"\n【최종 검증】 {total_checked}편 중 {matched}편 일치 = 정확도 {accuracy:.1f}%")


if __name__ == "__main__":
    main()
