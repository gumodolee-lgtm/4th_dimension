#!/usr/bin/env python3
"""Create a corrected folder for the validated thought top-300 sermons."""

from __future__ import annotations

import json
import re
from pathlib import Path
from shutil import copy2


ROOT = Path(__file__).resolve().parents[1]
CLASSIFICATION_PATH = ROOT / "sermon" / "classification_v3_result.json"
VALIDATION_PATH = ROOT / "output" / "think_300_validation.json"
ORIGINAL_DIR = ROOT / "output" / "\uc0dd\uac01_\uac1c\ubcc4"
CORRECTED_DIR = ROOT / "output" / "\uc0dd\uac01_\uac1c\ubcc4_\uc815\uc815"
MANIFEST_PATH = CORRECTED_DIR / "_\uad50\uccb4\ub0b4\uc5ed.md"


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sanitize_filename(title: str) -> str:
    cleaned = re.sub(r"\s*\[\d+\]\s*", " ", title)
    cleaned = re.sub(r'[<>:"/\\|?*]', "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) > 40:
        cleaned = cleaned[:40].rstrip()
    return cleaned or "untitled"


def read_text_auto(path: Path) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp949", "euc-kr"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="replace")


def find_original_file(rank: int) -> Path:
    matches = list(ORIGINAL_DIR.glob(f"{rank:03d}_*.txt"))
    if len(matches) != 1:
        raise FileNotFoundError(f"Expected one file for rank {rank}, found {len(matches)}")
    return matches[0]


def date_patterns(date_str: str) -> list[str]:
    year, month, day = [int(part) for part in date_str.split("-")]
    return [
        rf"^{re.escape(date_str)}\s*$",
        rf"^{re.escape(date_str)}\t",
        rf"^{year}\.\s*{month}\.\s*{day}\.",
        rf"^{year}\.\s*{month:02d}\.\s*{day:02d}\.",
        rf"^{year}년\s*0?{month}월\s*0?{day}일(?:\s|$)",
        rf"^(?:날짜|일시)\s*:\s*{year}년\s*0?{month}월\s*0?{day}일(?:\s|$)",
    ]


NEXT_START_RE = re.compile(
    r"(?m)^(?:"
    r"\d{4}-\d{2}-\d{2}\s*$|"
    r"\d{4}-\d{2}-\d{2}\t|"
    r"\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.|"
    r"(?:날짜|일시)\s*:\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일(?:\s|$)|"
    r"\d{4}년\s*\d{1,2}월\s*\d{1,2}일(?:\s|$)"
    r")"
)


def extract_sermon_text(full_text: str, date_str: str, title: str) -> str:
    start_pos = None
    for pattern in date_patterns(date_str):
        match = re.search(pattern, full_text, re.MULTILINE)
        if match:
            start_pos = match.start()
            break

    if start_pos is None:
        title_hint = re.escape(title.split("[")[0].strip()[:20])
        match = re.search(title_hint, full_text)
        if match:
            before = full_text[: match.start()]
            starts = list(NEXT_START_RE.finditer(before))
            if starts:
                start_pos = starts[-1].start()

    if start_pos is None:
        raise ValueError(f"Could not locate sermon start for {date_str} {title}")

    remaining = full_text[start_pos + 1 :]
    end_match = NEXT_START_RE.search(remaining)
    if end_match:
        return full_text[start_pos : start_pos + 1 + end_match.start()].strip()
    return full_text[start_pos:].strip()


def create_replacement_content(rank: int, row: dict, sermon_text: str) -> str:
    lines = [
        "=" * 60,
        f"4\ucc28\uc6d0\uc601\uc131 - \uc0dd\uac01 | \uc21c\uc704: {rank}/300",
        "=" * 60,
        f"\ub0a0\uc9dc: {row['date']}",
        f"\uc81c\ubaa9: {row['title']}",
        f"\uad00\ub828\ub3c4 \uc810\uc218: {row['score']}",
        f"\uc2e0\ub8b0\ub3c4: {row['confidence']}",
        f"\uc218\uc900: {row['level']}",
        "",
        "[\uc804\uccb4 \uce74\ud14c\uace0\ub9ac \uc810\uc218]",
    ]
    for category, score in row["all_scores"].items():
        marker = " \u25c0" if category == "\uc0dd\uac01" else ""
        lines.append(f"  {category}: {score}{marker}")
    lines.extend(
        [
            "=" * 60,
            "",
            sermon_text,
        ]
    )
    return "\n".join(lines)


def write_manifest(replacement_plan: list[dict]) -> None:
    lines = [
        "# \uc0dd\uac01 \uac1c\ubcc4 \uc815\uc815 \uad50\uccb4\ub0b4\uc5ed",
        "",
        "| \uc81c\uc678 \uc21c\uc704 | \uc81c\uc678 \uc124\uad50 | \uad50\uccb4 \uc124\uad50 \ub0a0\uc9dc | \uad50\uccb4 \uc124\uad50 \uc81c\ubaa9 |",
        "| --- | --- | --- | --- |",
    ]
    for item in replacement_plan:
        lines.append(
            f"| {item['remove']['rank']} | {item['remove']['title']} | "
            f"{item['add']['date']} | {item['add']['title']} |"
        )
    MANIFEST_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    if CORRECTED_DIR.exists():
        raise FileExistsError(f"Target directory already exists: {CORRECTED_DIR}")

    validation = load_json(VALIDATION_PATH)
    classification = load_json(CLASSIFICATION_PATH)
    by_date = {row["date"]: row for row in classification["results"]}
    replacement_by_rank = {
        item["remove"]["rank"]: item["add"]["date"]
        for item in validation["replacement_plan"]
    }

    rows = validation["rows"]
    CORRECTED_DIR.mkdir(parents=True, exist_ok=False)

    copied = 0
    created = 0

    for row in rows:
        rank = row["rank"]
        replacement_date = replacement_by_rank.get(rank)

        if replacement_date is None:
            source_path = find_original_file(rank)
            destination = CORRECTED_DIR / source_path.name
            copy2(source_path, destination)
            copied += 1
            continue

        replacement_row = by_date[replacement_date]
        source_file = ROOT / "sermon" / replacement_row["source"]
        full_text = read_text_auto(source_file)
        sermon_text = extract_sermon_text(
            full_text,
            replacement_row["date"],
            replacement_row["title"],
        )
        title = sanitize_filename(replacement_row["title"])
        filename = f"{rank:03d}_{replacement_row['date']}_{title}.txt"
        destination = CORRECTED_DIR / filename
        content = create_replacement_content(rank, replacement_row, sermon_text)
        destination.write_text(content, encoding="utf-8")
        created += 1

    write_manifest(validation["replacement_plan"])

    txt_count = len(list(CORRECTED_DIR.glob("*.txt")))
    if txt_count != 300:
        raise RuntimeError(f"Expected 300 txt files, found {txt_count}")

    print(f"created: {CORRECTED_DIR}")
    print(f"copied existing files: {copied}")
    print(f"created replacement files: {created}")
    print(f"text files: {txt_count}")
    print(f"manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
