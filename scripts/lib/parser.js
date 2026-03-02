import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

/**
 * 설교 파일 파싱
 * 형식: 날짜\t\n제목 [시리즈번호]\n성경본문\n\n"인용구절"\n구절참조\n\n요약키워드\n\n본문내용...
 */
export function parseSermonFile(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');

  // Line 0: 날짜 (탭 문자 포함될 수 있음)
  const date = lines[0]?.trim().replace(/\t.*$/, '').trim() || '';

  // Line 1: 제목 [시리즈번호]
  const titleLine = lines[1]?.trim() || '';
  const seriesMatch = titleLine.match(/^(.+?)\s*\[(\d+)\]\s*$/);
  const title = seriesMatch ? seriesMatch[1].trim() : titleLine;
  const seriesNumber = seriesMatch ? parseInt(seriesMatch[2]) : null;

  // Line 2: 성경 본문 참조
  const scriptureRef = lines[2]?.trim() || '';

  // 본문 내용: 헤더 5줄 이후 전체
  const content = lines.slice(5).join('\n').trim();

  // 파일명에서 ID 생성 (Windows 금지 문자 제거)
  const fileName = basename(filePath, '.txt');
  const titleSlug = title.replace(/\s+/g, '').replace(/[<>:"/\\|?*]/g, '').substring(0, 10);
  const id = `${fileName}_${titleSlug}`;

  return {
    id,
    date,
    title,
    seriesNumber,
    scriptureRef,
    content,
    sourceFile: basename(filePath),
  };
}

/**
 * sermon/ 디렉토리에서 UTF-8 개별 설교 파일 목록 반환
 * 날짜 형식 파일만 (YYYY-MM-DD.txt), 배치 파일 제외
 */
export function getSermonFiles(sermonDir) {
  const files = readdirSync(sermonDir);
  return files
    .filter(f => /^\d{4}-\d{2}-\d{2}\.txt$/.test(f))
    .sort()
    .map(f => join(sermonDir, f));
}
