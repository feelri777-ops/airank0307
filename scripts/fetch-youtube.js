#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const OUTPUT = resolve(ROOT, 'public/youtube-videos.json');
const TOP_N = 30;

const YOUTUBE_API_KEYS = [
  process.env.YOUTUBE_API_KEY,
  process.env.YOUTUBE_API_KEY_2,
].filter(Boolean);
if (YOUTUBE_API_KEYS.length === 0) { console.error('YOUTUBE_API_KEY not set'); process.exit(1); }
console.log(`YouTube API 키 ${YOUTUBE_API_KEYS.length}개 사용`);

let currentKeyIndex = 0;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Firestore Admin 초기화
function initAdmin() {
  if (admin.apps.length > 0) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    const keyPath = resolve(ROOT, 'serviceAccountKey.json');
    if (!existsSync(keyPath)) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT 또는 serviceAccountKey.json 필요');
      process.exit(1);
    }
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
  }
}

// Firestore에서 툴 목록 로드
async function loadToolsFromFirestore() {
  initAdmin();
  const db = admin.firestore();
  const snap = await db.collection('tools').where('hidden', '!=', true).get();
  return snap.docs.map(d => ({ ...d.data(), id: Number(d.id) }));
}

// HTML 엔티티 디코딩 (&#39;, &quot;, &amp;, &#61;, &#x3D; 등 모든 형태 처리)
function decodeHtmlEntities(text) {
  if (!text) return "";
  const entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&nbsp;": " ",
    "&#39;": "'",
    "&apos;": "'"
  };
  return text.replace(/&(#?[xX]?\w+);/g, (match, p1) => {
    if (entities[match]) return entities[match];
    if (p1.startsWith("#")) {
      const isHex = p1.charAt(1).toLowerCase() === "x";
      const code = parseInt(p1.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return !isNaN(code) ? String.fromCharCode(code) : match;
    }
    return match;
  });
}

// ISO 8601 duration을 초 단위로 변환
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

// 영상 상세 정보 가져오기 (길이 확인용)
async function getVideoDetails(videoIds) {
  if (videoIds.length === 0) return [];

  const key = YOUTUBE_API_KEYS[currentKeyIndex];
  const params = new URLSearchParams({
    part: 'contentDetails',
    id: videoIds.join(','),
    key,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  if (!res.ok) {
    console.error(`Video details API error (${res.status})`);
    return [];
  }

  const json = await res.json();
  return (json.items || []).map(item => ({
    videoId: item.id,
    duration: parseDuration(item.contentDetails.duration),
  }));
}

async function searchYouTube(query, { lang = true } = {}) {
  // 사용 가능한 키가 없으면 포기
  if (currentKeyIndex >= YOUTUBE_API_KEYS.length) return [];

  const key = YOUTUBE_API_KEYS[currentKeyIndex];
  const params = new URLSearchParams({
    part: 'snippet',
    q: lang ? `${query} 사용법` : `${query} tutorial`,
    type: 'video',
    order: 'viewCount',
    maxResults: 5,
    key,
  });
  if (lang) {
    params.set('relevanceLanguage', 'ko');
    params.set('regionCode', 'KR');
  }
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) {
    const errText = await res.text();
    let errJson;
    try { errJson = JSON.parse(errText); } catch {}
    const reason = errJson?.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' && currentKeyIndex < YOUTUBE_API_KEYS.length - 1) {
      // 쿼터 초과 → 다음 키로 영구 전환 후 재시도
      currentKeyIndex++;
      console.log(`  ⚠️ 키 ${currentKeyIndex} 쿼터 초과 → 키 ${currentKeyIndex + 1}로 전환`);
      return searchYouTube(query, { lang });
    }
    console.error(`YouTube API error (${res.status}): ${errText}`);
    return [];
  }
  const json = await res.json();
  const candidates = (json.items || [])
    .filter(item => item.id?.videoId)
    .map(item => ({
      videoId: item.id.videoId,
      title: decodeHtmlEntities(item.snippet.title),
      channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
    }));

  if (candidates.length === 0) return [];

  // 영상 길이 확인하여 Shorts(60초 이하) 필터링
  const videoIds = candidates.map(v => v.videoId);
  const details = await getVideoDetails(videoIds);
  const durationMap = Object.fromEntries(details.map(d => [d.videoId, d.duration]));

  return candidates
    .filter(video => {
      const duration = durationMap[video.videoId];
      if (!duration) return true; // 길이 정보 없으면 일단 포함
      return duration > 60; // 60초 초과만 포함 (Shorts 제외)
    })
    .slice(0, 3);
}

async function main() {
  // 강제 재갱신 옵션 (환경 변수 또는 명령행 인자)
  const forceRefresh = process.env.FORCE_REFRESH === 'true' || process.argv.includes('--force');
  if (forceRefresh) {
    console.log('🔄 강제 재갱신 모드 활성화');
  }

  // scores.json 기준 실시간 점수로 정렬
  let scores = {};
  const scoresPath = resolve(ROOT, 'public/scores.json');
  if (existsSync(scoresPath)) {
    try { scores = JSON.parse(readFileSync(scoresPath, 'utf8')).tools || {}; } catch {}
  }

  const TOOLS_DATA = await loadToolsFromFirestore();
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

    // 데이터 있으면 스킵 (fetchedAt 없어도 기존 데이터 보존 — 쿼터 절약)
    const lastFetch = fetchedAt[existing_id] ? new Date(fetchedAt[existing_id]).getTime() : null;
    const daysSinceFetch = lastFetch ? (now - lastFetch) / (1000 * 60 * 60 * 24) : 999;
    if (videos[existing_id] && videos[existing_id].length > 0 && !forceRefresh) {
      if (daysSinceFetch < REFRESH_DAYS) {
        console.log(`  [${tool.id}] ${tool.name} → 유지 (${Math.floor(daysSinceFetch)}일 전 수집)`);
      } else {
        console.log(`  [${tool.id}] ${tool.name} → 유지 (fetchedAt 없음, 기존 데이터 보존)`);
      }
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
