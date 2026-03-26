#!/usr/bin/env python3
"""Split 5-year sermon files into individual year files.

Handles mixed encodings (UTF-8, EUC-KR/CP949, UTF-8 BOM) automatically.
All output is written as UTF-8.
"""

import re
import os
import sys
from collections import defaultdict

# Try these encodings in order when reading files
ENCODINGS = ['utf-8-sig', 'utf-8', 'cp949', 'euc-kr', 'latin-1']

# Date patterns that mark the start of a new sermon
KOREAN_DATE_RE = re.compile(
    r'^(?:(?:일\s*시|날짜)\s*[:：]\s*)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일'
)
DOT_DATE_RE = re.compile(
    r'^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s'
)
DOT_DATE_NOSPACE_RE = re.compile(
    r'^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?\s'
)


def read_file_auto_encoding(filepath):
    """Read a file trying multiple encodings. Returns (text, encoding_used)."""
    with open(filepath, 'rb') as f:
        raw = f.read()

    # Try chardet first if available
    try:
        import chardet
        detected = chardet.detect(raw)
        if detected['encoding'] and detected['confidence'] > 0.7:
            try:
                text = raw.decode(detected['encoding'])
                # Verify Korean characters are present and not mojibake
                if _has_valid_korean(text):
                    return text, detected['encoding']
            except (UnicodeDecodeError, LookupError):
                pass
    except ImportError:
        pass

    # Fallback: try encodings in order
    for enc in ENCODINGS:
        try:
            text = raw.decode(enc)
            if _has_valid_korean(text):
                return text, enc
        except (UnicodeDecodeError, LookupError):
            continue

    # Last resort: utf-8 with replacement
    text = raw.decode('utf-8', errors='replace')
    return text, 'utf-8 (with replacements)'


def _has_valid_korean(text):
    """Check if text contains valid Korean Hangul characters (not mojibake)."""
    # Look for common Korean Hangul syllables (가-힣 range)
    korean_count = sum(1 for c in text[:5000] if '\uAC00' <= c <= '\uD7A3')
    # Also count replacement characters and CJK oddities that signal mojibake
    replacement_count = text[:5000].count('\ufffd')
    # If we have Korean and few replacements, it's good
    if korean_count > 10 and replacement_count < korean_count * 0.1:
        return True
    # If no Korean at all in first 5000 chars, something is wrong
    if korean_count == 0 and len(text) > 100:
        return False
    return korean_count > 0


def extract_year_from_line(line):
    """Extract year if this line looks like a sermon date header."""
    stripped = line.strip()
    for pattern in [KOREAN_DATE_RE, DOT_DATE_RE, DOT_DATE_NOSPACE_RE]:
        m = pattern.match(stripped)
        if m:
            return int(m.group(1))
    return None


def split_file_by_year(filepath, expected_years):
    """Split a multi-year sermon file into per-year chunks."""
    text, enc_used = read_file_auto_encoding(filepath)
    print(f"  encoding: {enc_used}")
    lines = text.splitlines(keepends=True)

    # Find all sermon start positions with their years
    sermon_starts = []
    for i, line in enumerate(lines):
        year = extract_year_from_line(line)
        if year and year in expected_years:
            sermon_starts.append((i, year))

    if not sermon_starts:
        print(f"  WARNING: No sermon dates found in {filepath}")
        return {}

    # Group lines by year
    year_lines = defaultdict(list)

    for idx, (start_line, year) in enumerate(sermon_starts):
        if idx + 1 < len(sermon_starts):
            end_line = sermon_starts[idx + 1][0]
        else:
            end_line = len(lines)

        chunk = lines[start_line:end_line]

        if year_lines[year]:
            year_lines[year].append('\n\n========================================\n\n')
        year_lines[year].extend(chunk)

    return year_lines


def count_sermons(lines, year):
    """Count sermon headers for a specific year."""
    count = 0
    for l in lines:
        if isinstance(l, str):
            y = extract_year_from_line(l)
            if y == year:
                count += 1
    return count


def main():
    sermon_dir = os.path.dirname(os.path.abspath(__file__))

    source_files = {
        '1981_1985_sermon.txt': range(1981, 1986),
        '1986_1990_sermon.txt': range(1986, 1991),
        '1991_1995_sermon.txt': range(1991, 1996),
        '1996_2000_sermon.txt': range(1996, 2001),
        '2001_2005_sermon.txt': range(2001, 2006),
        '2006_2010_sermon.txt': range(2006, 2011),
    }

    all_year_lines = defaultdict(list)

    for filename, expected_years in source_files.items():
        filepath = os.path.join(sermon_dir, filename)
        if not os.path.exists(filepath):
            print(f"  SKIP: {filename} not found")
            continue

        print(f"Processing {filename}...")
        year_lines = split_file_by_year(filepath, set(expected_years))

        for year, lines in year_lines.items():
            if all_year_lines[year]:
                all_year_lines[year].append('\n\n========================================\n\n')
            all_year_lines[year].extend(lines)

        for year in sorted(year_lines.keys()):
            sc = count_sermons(year_lines[year], year)
            print(f"  {year}: {sc} sermons")

    # Also merge individual date files (2012-2020)
    print("\nMerging individual date files (2012-2020)...")
    for year in range(2012, 2021):
        year_files = []
        # Collect YYYY-MM-DD.txt files
        for f in sorted(os.listdir(sermon_dir)):
            if f.startswith(f'{year}-') and f.endswith('.txt') and 'all' not in f:
                year_files.append(f)
        # Also check YYYY_MM_DD.txt format
        for f in sorted(os.listdir(sermon_dir)):
            if f.startswith(f'{year}_') and f.endswith('.txt') and 'all' not in f and 'sermon' not in f:
                year_files.append(f)

        if not year_files:
            continue

        year_content = []
        for f in year_files:
            filepath = os.path.join(sermon_dir, f)
            text, enc = read_file_auto_encoding(filepath)
            if year_content:
                year_content.append('\n\n========================================\n\n')
            year_content.append(text)

        if year_content:
            all_year_lines[year] = list(''.join(year_content))
            # Store as single string wrapped in list for writing
            all_year_lines[year] = year_content
            print(f"  {year}: {len(year_files)} files merged")

    # Write per-year files (all as UTF-8)
    print("\nWriting year files (UTF-8)...")
    for year in sorted(all_year_lines.keys()):
        outfile = os.path.join(sermon_dir, f'{year}_all.txt')
        content = ''.join(all_year_lines[year])
        content = content.strip() + '\n'

        with open(outfile, 'w', encoding='utf-8') as f:
            f.write(content)

        # Verify output
        korean_count = sum(1 for c in content[:5000] if '\uAC00' <= c <= '\uD7A3')
        size_kb = len(content.encode('utf-8')) / 1024

        if year >= 2012:
            # For merged individual files, count by file count
            file_count = sum(1 for item in all_year_lines[year] if '========' not in item and len(item) > 100)
            print(f"  {year}_all.txt: {file_count} sermons, {size_kb:.0f}KB, korean_chars={korean_count}")
        else:
            sc = count_sermons(all_year_lines[year], year)
            print(f"  {year}_all.txt: {sc} sermons, {size_kb:.0f}KB, korean_chars={korean_count}")


if __name__ == '__main__':
    main()
