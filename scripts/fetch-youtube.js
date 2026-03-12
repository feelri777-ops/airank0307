#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const OUTPUT = resolve(ROOT, 'public/youtube-videos.json');
const TOP_N = 30;

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) { console.error('YOUTUBE_API_KEY not set'); process.exit(1); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

import { TOOLS_DATA } from '../src/data/tools.js';

async function searchYouTube(query) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: `${query} 사용법`,
    type: 'video',
    order: 'viewCount',
    maxResults: 5,
    relevanceLanguage: 'ko',
    regionCode: 'KR',
    key: YOUTUBE_API_KEY,
  });
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

  // 기존 데이터 유지 (없는 도구는 보존)
  let existing = { updated: '', topN: TOP_N, videos: {} };
  if (existsSync(OUTPUT)) {
    try { existing = JSON.parse(readFileSync(OUTPUT, 'utf8')); } catch {}
  }

  const videos = { ...existing.videos };

  for (const tool of sortedTools) {
    const query = tool.yt || tool.name;
    const queryKo = tool.ytKo || tool.nameKo || tool.name;
    
    console.log(`  [${tool.id}] ${tool.name} 수집 시도...`);
    try {
      let results = await searchYouTube(query);
      
      // 1차 검색 결과가 없으면 한국어 이름으로 재시도
      if (results.length === 0 && queryKo !== query) {
        console.log(`      검색어 "${query}" 결과 없음 → "${queryKo}"로 재시도`);
        results = await searchYouTube(queryKo);
      }
      
      videos[String(tool.id)] = results;
      console.log(`      ✅ ${results.length}개 수집 성공`);
    } catch (err) {
      console.error(`      ❌ 실패: ${err.message}`);
      // 실패해도 기존 데이터가 있다면 유지하거나 빈 배열
      if (!videos[String(tool.id)]) videos[String(tool.id)] = [];
    }
    await sleep(500); // 간격 약간 늘림
  }

  writeFileSync(OUTPUT, JSON.stringify({ updated: new Date().toISOString(), topN: TOP_N, videos }, null, 2));
  console.log(`\n완료! youtube-videos.json 저장 (${TOP_N}개 도구)`);
}

main().catch(console.error);
