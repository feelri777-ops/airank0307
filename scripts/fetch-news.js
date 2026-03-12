#!/usr/bin/env node
import 'dotenv/config';

/**
 * scripts/fetch-news.js
 * 네이버 뉴스 검색 API로 AI 관련 최신 뉴스를 수집하고 public/news.json 생성
 *
 * 환경 변수:
 *   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 *
 * 실행: node scripts/fetch-news.js
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const OUTPUT = resolve(ROOT, 'public/news.json');

const NAVER_ID = process.env.NAVER_NEWS_CLIENT_ID || process.env.NAVER_CLIENT_ID;
const NAVER_SECRET = process.env.NAVER_NEWS_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET;

// AI 관련 검색 키워드 (다양하게 수집)
const QUERIES = [
  '인공지능 AI',
  'ChatGPT',
  'Claude AI',
  '생성형 AI',
  'AI 도구',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 네이버 뉴스 검색 API 호출 */
async function fetchNaverNews(query) {
  if (!NAVER_ID || !NAVER_SECRET) {
    console.warn('⚠️  NAVER API 키 없음 - 더미 데이터 사용');
    return [];
  }

  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=10&sort=date`; // display=10으로 늘려 더 많은 결과 확인
  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_ID,
        'X-Naver-Client-Secret': NAVER_SECRET,
      },
    });
    if (!res.ok) {
      console.error(`네이버 뉴스 오류 [${query}]: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error(`네이버 뉴스 fetch 실패 [${query}]:`, e.message);
    return [];
  }
}

/** HTML 태그 + 특수문자 제거 */
function cleanHtml(str) {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .trim();
}

/** pubDate 문자열 → "N시간 전" 포맷 */
function relativeTime(pubDate) {
  const diff = Date.now() - new Date(pubDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

async function main() {
  console.log('📰 네이버 뉴스 수집 시작...');

  const seen = new Set();
  const allItems = [];

  for (const query of QUERIES) {
    const items = await fetchNaverNews(query);
    for (const item of items) {
      const link = item.originallink || item.link;
      if (!link) continue;

      if (seen.has(link)) continue;
      seen.add(link);

      allItems.push({
        title: cleanHtml(item.title),
        link, // originallink만 사용
        description: cleanHtml(item.description),
        pubDate: item.pubDate,
        relativeTime: relativeTime(item.pubDate),
      });
    }
    await sleep(200); // API 레이트 리밋 방지
  }

  // 날짜 최신순 정렬 후 상위 15개
  allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const newTop15 = allItems.slice(0, 15);

  // 기존 news.json 불러오기
  let existingItems = [];
  if (existsSync(OUTPUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUTPUT, 'utf-8'));
      existingItems = prev.items || [];
    } catch {}
  }

  // 새 항목 링크 Set
  const newLinks = new Set(newTop15.map(i => i.link));

  // 기존 항목 중 새 항목과 중복되지 않는 것만 유지, relativeTime 갱신
  const oldItems = existingItems
    .filter(i => !newLinks.has(i.link))
    .map(i => ({ ...i, relativeTime: relativeTime(i.pubDate) }));

  // 새 항목(위) + 기존 항목(아래)
  const merged = [...newTop15, ...oldItems];

  // 상위 3개는 HOT 표시
  const newsItems = merged.map((item, i) => ({ ...item, hot: i < 3 }));

  const output = {
    lastUpdated: new Date().toISOString(),
    items: newsItems,
  };

  writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ news.json 저장 완료 (${newsItems.length}개)`);
  newsItems.slice(0, 5).forEach((n) => console.log(`  · ${n.title}`));
}

main().catch((e) => {
  console.error('❌ fetch-news 실패:', e);
  process.exit(1);
});
