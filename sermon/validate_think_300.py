#!/usr/bin/env python3
"""Validate the top 300 sermons classified under the thought category."""

from __future__ import annotations

import json
from pathlib import Path
from statistics import mean


ROOT = Path(__file__).resolve().parents[1]
CLASSIFICATION_PATH = ROOT / "sermon" / "classification_v3_result.json"
OUTPUT_JSON = ROOT / "output" / "think_300_validation.json"
OUTPUT_MD = ROOT / "output" / "think_300_validation.md"

THOUGHT = "생각"

# Hard excludes: category/all_scores inconsistency plus direct content review.
HARD_EXCLUDES = {
    "2016-01-17": {
        "reason": "전체점수 최고값이 '꿈'이며, 본문도 갈렙의 비전/정탐 보고에 무게가 더 큼.",
        "action": "제외 권고",
    },
    "2014-02-23": {
        "reason": "전체점수 최고값이 '믿음'이며, 본문 핵심이 고난 중 하나님께 맡기는 신앙에 가까움.",
        "action": "제외 권고",
    },
    "2018-06-24": {
        "reason": "제목과 본문 구조가 모두 '믿음' 중심이며, 전체점수 최고값도 '믿음'임.",
        "action": "제외 권고",
    },
    "2008-04-27": {
        "reason": "생각 요소가 강하지만 전체점수 최고값이 '꿈'이며, 설교 구조가 생각→꿈 전개로 이어짐.",
        "action": "제외 권고",
    },
}

# Review excludes: automatic result says thought, but manual read suggests another center.
REVIEW_EXCLUDES = {
    "2019-09-22": {
        "reason": "광풍과 평안, 예수 신뢰가 중심이고 '생각'은 보조축에 가까움.",
        "action": "재검토 후 제외 우선",
    },
    "2012-10-07": {
        "reason": "영적 전쟁, 믿음, 입술의 시인이 강하게 섞여 있고 thought/word tie 사례임.",
        "action": "재검토 후 제외 우선",
    },
    "2014-07-20": {
        "reason": "제목과 본문 중심축이 '믿음의 기도'이며 생각 요소는 보조적임.",
        "action": "재검토 후 제외 우선",
    },
    "2012-07-29": {
        "reason": "기쁨/기도/감사 설교로 읽히며 thought-only 설교로 보기에는 중심성이 약함.",
        "action": "재검토 후 제외 우선",
    },
}

# Reserve candidates: not auto-inserted, but recommended for swap-in review.
RESERVE_CANDIDATES = {
    "1998-02-01": {
        "reason": "제목 자체가 '마음을 새롭게 함으로 변화를 받으라'로 생각 요소가 매우 직접적임.",
    },
    "2010-03-21": {
        "reason": "삶의 목적과 마음의 방향, 마음의 광야를 다루는 설교로 thought 축이 뚜렷함.",
    },
    "1992-05-24": {
        "reason": "바벨탑의 교만, 인본주의, 잘못된 마음가짐을 중심으로 전개되어 생각 검토 가치가 높음.",
    },
    "2003-01-05": {
        "reason": "삶의 우선순위와 마음의 정리정돈을 직접적으로 다루는 설교임.",
    },
    "1990-01-14": {
        "reason": "미혹과 진리 사이의 선택, 올바른 판단과 사고 전환을 강조함.",
    },
    "1990-04-22": {
        "reason": "수고와 무거운 짐 가운데 마음의 평안과 기쁨을 다루는 thought 후보임.",
    },
    "1992-02-02": {
        "reason": "복 있는 사람의 태도와 마음가짐 쪽으로 검토할 가치가 있음.",
    },
    "1988-09-04": {
        "reason": "분류 데이터상 thought 점수가 높고, 긍정적 시각과 소망 메시지 축으로 재검토 가치가 있음.",
    },
}


def load_results() -> list[dict]:
    with CLASSIFICATION_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload["results"]


def thought_top300(results: list[dict]) -> list[dict]:
    rows = [row for row in results if row["category"] == THOUGHT]
    rows.sort(key=lambda row: row["score"], reverse=True)
    return rows[:300]


def second_best_gap(all_scores: dict[str, float]) -> float:
    values = sorted(all_scores.values(), reverse=True)
    return round(values[0] - values[1], 1)


def top_score_category(all_scores: dict[str, float]) -> str:
    return max(all_scores, key=all_scores.get)


def make_status(row: dict) -> tuple[str, str]:
    date = row["date"]
    if date in HARD_EXCLUDES:
        return "hard_exclude", HARD_EXCLUDES[date]["reason"]
    if date in REVIEW_EXCLUDES:
        return "review_exclude", REVIEW_EXCLUDES[date]["reason"]
    return "validated_keep", ""


def reserve_entries(results: list[dict]) -> list[dict]:
    indexed = {row["date"]: row for row in results}
    entries = []
    for date, note in RESERVE_CANDIDATES.items():
        row = indexed.get(date)
        if not row:
            continue
        entries.append(
            {
                "date": date,
                "title": row["title"],
                "category": row["category"],
                "score": row["score"],
                "confidence": row["confidence"],
                "all_scores": row["all_scores"],
                "top_score_category": top_score_category(row["all_scores"]),
                "margin_to_second": second_best_gap(row["all_scores"]),
                "reason": note["reason"],
            }
        )
    return entries


def build_validation_rows(top300: list[dict]) -> list[dict]:
    rows = []
    for rank, row in enumerate(top300, start=1):
        status, note = make_status(row)
        rows.append(
            {
                "rank": rank,
                "date": row["date"],
                "title": row["title"],
                "score": row["score"],
                "confidence": row["confidence"],
                "level": row["level"],
                "status": status,
                "status_note": note,
                "all_scores": row["all_scores"],
                "top_score_category": top_score_category(row["all_scores"]),
                "margin_to_second": second_best_gap(row["all_scores"]),
            }
        )
    return rows


def build_summary(rows: list[dict]) -> dict:
    margins = [row["margin_to_second"] for row in rows]
    confidences = [row["confidence"] for row in rows]
    status_counts: dict[str, int] = {}
    for row in rows:
        status_counts[row["status"]] = status_counts.get(row["status"], 0) + 1

    return {
        "top300_count": len(rows),
        "validated_keep_count": status_counts.get("validated_keep", 0),
        "hard_exclude_count": status_counts.get("hard_exclude", 0),
        "review_exclude_count": status_counts.get("review_exclude", 0),
        "mean_confidence": round(mean(confidences), 3),
        "min_confidence": min(confidences),
        "max_confidence": max(confidences),
        "mean_margin_to_second": round(mean(margins), 2),
        "margin_lt_5": sum(1 for value in margins if value < 5),
        "margin_lt_10": sum(1 for value in margins if value < 10),
        "confidence_le_030": sum(1 for value in confidences if value <= 0.30),
        "confidence_le_040": sum(1 for value in confidences if value <= 0.40),
        "mismatch_count_in_top300": sum(
            1 for row in rows if row["top_score_category"] != THOUGHT
        ),
    }


def write_json(summary: dict, rows: list[dict], reserve: list[dict]) -> None:
    flagged = [
        row
        for row in rows
        if row["status"] in {"hard_exclude", "review_exclude"}
    ]
    replacement_plan = []
    for flagged_row, reserve_row in zip(flagged, reserve):
        replacement_plan.append(
            {
                "remove": {
                    "rank": flagged_row["rank"],
                    "date": flagged_row["date"],
                    "title": flagged_row["title"],
                    "status": flagged_row["status"],
                    "reason": flagged_row["status_note"],
                },
                "add": reserve_row,
            }
        )

    payload = {
        "summary": summary,
        "rows": rows,
        "hard_excludes": [
            row for row in rows if row["status"] == "hard_exclude"
        ],
        "review_excludes": [
            row for row in rows if row["status"] == "review_exclude"
        ],
        "reserve_candidates": reserve,
        "replacement_plan": replacement_plan,
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def markdown_row(row: dict) -> str:
    return (
        f"| {row['rank']} | {row['date']} | {row['title']} | "
        f"{row['score']} | {row['confidence']} | {row['margin_to_second']} | "
        f"{row['top_score_category']} | {row['status_note']} |"
    )


def write_markdown(summary: dict, rows: list[dict], reserve: list[dict]) -> None:
    hard_excludes = [row for row in rows if row["status"] == "hard_exclude"]
    review_excludes = [row for row in rows if row["status"] == "review_exclude"]
    flagged = hard_excludes + review_excludes

    lines = [
        "# 생각 300선 검증 보고서",
        "",
        "## 요약",
        "",
        f"- 원본 상위 300편: {summary['top300_count']}편",
        f"- 검증 통과: {summary['validated_keep_count']}편",
        f"- 강제 제외 권고: {summary['hard_exclude_count']}편",
        f"- 재검토 후 제외 우선: {summary['review_exclude_count']}편",
        f"- 평균 신뢰도: {summary['mean_confidence']}",
        f"- 평균 1위/2위 점수차: {summary['mean_margin_to_second']}",
        f"- 1위/2위 점수차 5 미만: {summary['margin_lt_5']}편",
        f"- 1위/2위 점수차 10 미만: {summary['margin_lt_10']}편",
        f"- 신뢰도 0.30 이하: {summary['confidence_le_030']}편",
        f"- 신뢰도 0.40 이하: {summary['confidence_le_040']}편",
        f"- 상위 300 안에서 전체점수 최고 카테고리 불일치: {summary['mismatch_count_in_top300']}편",
        "",
        "## 강제 제외 권고",
        "",
        "| 순위 | 날짜 | 제목 | 생각점수 | 신뢰도 | 1위-2위차 | 전체점수 최고 | 사유 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    lines.extend(markdown_row(row) for row in hard_excludes)
    lines.extend(
        [
            "",
            "## 재검토 후 제외 우선",
            "",
            "| 순위 | 날짜 | 제목 | 생각점수 | 신뢰도 | 1위-2위차 | 전체점수 최고 | 사유 |",
            "| --- | --- | --- | --- | --- | --- | --- | --- |",
        ]
    )
    lines.extend(markdown_row(row) for row in review_excludes)
    lines.extend(
        [
            "",
            "## 대체 검토 후보",
            "",
            "| 날짜 | 제목 | 분류카테고리 | 생각점수 | 신뢰도 | 1위-2위차 | 전체점수 최고 | 사유 |",
            "| --- | --- | --- | --- | --- | --- | --- | --- |",
        ]
    )
    for row in reserve:
        lines.append(
            f"| {row['date']} | {row['title']} | {row['category']} | "
            f"{row['all_scores'][THOUGHT]} | {row['confidence']} | "
            f"{row['margin_to_second']} | {row['top_score_category']} | {row['reason']} |"
        )

    lines.extend(
        [
            "",
            "## 추천 교체안",
            "",
            "| 제외 순위 | 제외 제목 | 교체 후보 날짜 | 교체 후보 제목 |",
            "| --- | --- | --- | --- |",
        ]
    )
    for flagged_row, reserve_row in zip(flagged, reserve):
        lines.append(
            f"| {flagged_row['rank']} | {flagged_row['title']} | "
            f"{reserve_row['date']} | {reserve_row['title']} |"
        )

    lines.extend(
        [
            "",
            "## 판정 기준",
            "",
            "- `hard_exclude`: 자동 분류 결과와 전체점수 최고 카테고리가 충돌하고, 본문 재검토까지 타 요소 중심으로 읽히는 경우",
            "- `review_exclude`: 자동 분류상 생각이 1위지만, 제목/본문 중심축이 믿음·기도·말·꿈으로 읽히는 혼합형 설교",
            "- `reserve_candidates`: 점수는 낮지만 제목과 본문 중심성이 생각 요소에 더 직접적으로 닿는 교체 검토 후보",
        ]
    )

    OUTPUT_MD.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_MD.open("w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")


def main() -> None:
    results = load_results()
    rows = build_validation_rows(thought_top300(results))
    reserve = reserve_entries(results)
    summary = build_summary(rows)
    write_json(summary, rows, reserve)
    write_markdown(summary, rows, reserve)

    print(f"saved: {OUTPUT_JSON}")
    print(f"saved: {OUTPUT_MD}")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
