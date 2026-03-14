#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const OUTPUT = resolve(ROOT, 'public/youtube-videos.json');
const TOP_N = 50;

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) { console.error('YOUTUBE_API_KEY not set'); process.exit(1); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

import { TOOLS_DATA } from '../src/data/tools.js';

async function searchYouTube(query, { lang = true } = {}) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: lang ? `${query} 사용법` : `${query} tutorial`,
    type: 'video',
    order: 'viewCount',
    maxResults: 5,
    key: YOUTUBE_API_KEY,
  });
  if (lang) {
    params.set('relevanceLanguage', 'ko');
    params.set('regionCode', 'KR');
  }
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) {
    const err = await res.text();
    console.error(`YouTube API error (${res.status}): ${err}`);
    return [];
  }
  const json = await res.json();
  return (json.items || [])
    .filter(item => item.id?.videoId)
    .slice(0, 3)
    .map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
    }));
}

async function main() {
  // scores.json 기준 실시간 점수로 정렬
  let scores = {};
  const scoresPath = resolve(ROOT, 'public/scores.json');
  if (existsSync(scoresPath)) {
    try { scores = JSON.parse(readFileSync(scoresPath, 'utf8')).tools || {}; } catch {}
  }

  const sortedTools = [...TOOLS_DATA]
    .map(t => ({ ...t, liveScore: scores[String(t.id)]?.score ?? t.score }))
    .sort((a, b) => b.liveScore - a.liveScore)
    .slice(0, TOP_N);

  console.log(`YouTube 영상 수집 시작 (상위 ${TOP_N}개 도구)...`);

  // 기존 데이터 로드
  let existing = { updated: '', topN: TOP_N, videos: {}, fetchedAt: {} };
  if (existsSync(OUTPUT)) {
    try { existing = JSON.parse(readFileSync(OUTPUT, 'utf8')); } catch {}
  }

  const videos = { ...existing.videos };
  const fetchedAt = { ...existing.fetchedAt }; // 각 툴별 마지막 갱신 시간
  const REFRESH_DAYS = 30; // 30일마다 재갱신
  const now = Date.now();

  for (const tool of sortedTools) {
    const query = tool.yt || tool.name;
    const queryKo = tool.ytKo || tool.nameKo || tool.name;
    const existing_id = String(tool.id);

    // 데이터 있고 30일 이내면 스킵 (쿼터 절약)
    const lastFetch = fetchedAt[existing_id] ? new Date(fetchedAt[existing_id]).getTime() : 0;
    const daysSinceFetch = (now - lastFetch) / (1000 * 60 * 60 * 24);
    if (videos[existing_id] && videos[existing_id].length > 0 && daysSinceFetch < REFRESH_DAYS) {
      console.log(`  [${tool.id}] ${tool.name} → 유지 (${Math.floor(daysSinceFetch)}일 전 수집)`);
      continue;
    }

    console.log(`  [${tool.id}] ${tool.name} 수집 시도...`);
    try {
      // 1차: 한국어 검색
      let results = await searchYouTube(query);
      await sleep(300);

      // 2차: 한국어 이름으로 재시도
      if (results.length === 0 && queryKo !== query) {
        console.log(`      결과 없음 → 한국어 이름 "${queryKo}"로 재시도`);
        results = await searchYouTube(queryKo);
        await sleep(300);
      }

      // 3차: 언어 제한 없이 영어 tutorial 검색 (폴백)
      if (results.length === 0) {
        console.log(`      결과 없음 → 언어 제한 없이 영어 검색 폴백`);
        results = await searchYouTube(query, { lang: false });
        await sleep(300);
      }

      if (results.length > 0) {
        videos[existing_id] = results;
        fetchedAt[existing_id] = new Date().toISOString();
        console.log(`      ✅ ${results.length}개 수집 성공`);
      } else {
        // 결과 없으면 기존 데이터 유지 (덮어쓰지 않음)
        console.log(`      ⚠️ 최종 결과 없음 — 기존 데이터 유지`);
      }
    } catch (err) {
      console.error(`      ❌ 실패: ${err.message}`);
      // 실패해도 기존 데이터 보존
    }
    await sleep(500);
  }

  writeFileSync(OUTPUT, JSON.stringify({ updated: new Date().toISOString(), topN: TOP_N, videos, fetchedAt }, null, 2));
  console.log(`\n완료! youtube-videos.json 저장 (${TOP_N}개 도구)`);
}

main().catch(console.error);
