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
async function fetchNaverNews(query, sort = 'date') {
  if (!NAVER_ID || !NAVER_SECRET) {
    console.warn('⚠️  NAVER API 키 없음 - 더미 데이터 사용');
    return [];
  }

  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=15&sort=${sort}`;
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

  const hotItems = [];
  const recentItems = [];

  for (const query of QUERIES) {
    // 1. 유사도(인기)순 수집 (HOT용)
    const simItems = await fetchNaverNews(query, 'sim');
    for (const item of simItems) {
      const link = item.originallink || item.link;
      if (!link || seen.has(link)) continue;
      seen.add(link);
      hotItems.push({
        title: cleanHtml(item.title),
        link,
        description: cleanHtml(item.description),
        pubDate: item.pubDate,
        relativeTime: relativeTime(item.pubDate),
        hot: true
      });
    }
    
    // 2. 최신순 수집 (Latest용)
    const dateItems = await fetchNaverNews(query, 'date');
    for (const item of dateItems) {
      const link = item.originallink || item.link;
      if (!link || seen.has(link)) continue;
      seen.add(link);
      recentItems.push({
        title: cleanHtml(item.title),
        link,
        description: cleanHtml(item.description),
        pubDate: item.pubDate,
        relativeTime: relativeTime(item.pubDate),
        hot: false
      });
    }
    await sleep(300); // API 레이트 리밋 방지
  }

  // 상위 인기도 뉴스 5개 + 나머지 최신순 뉴스 60개 조합
  const finalHot = hotItems.slice(0, 5);
  const finalRecent = recentItems.slice(0, 60);
  
  const merged = [...finalHot, ...finalRecent];
  
  // 전체를 다시 날짜순으로 정렬하되, HOT 태그는 유지 (이미 위에서 붙임)
  // 단, 출력 시엔 HOT이 상단에 와야 함
  const newsItems = [
    ...merged.filter(i => i.hot).sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)),
    ...merged.filter(i => !i.hot).sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
  ];

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
