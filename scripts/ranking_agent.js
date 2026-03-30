import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  CHUNK_SIZE, TOTAL_TOOLS, RETRY_LIMIT, RETRY_DELAY_MS, CHUNK_DELAY_MS,
  GEMINI_MODEL, GEMINI_CONFIG,
  SCORE_CRITERIA, COLLECTION_RULES, OUTPUT_FORMAT,
  FALLBACK_POOL
} from './ranking_config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// 환경 변수 로드
// ========================================
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

// ========================================
// Firebase Admin 초기화
// ========================================
function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  }

  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')))
    });
  }

  throw new Error("⚠️ Firebase 인증 정보를 찾을 수 없습니다.");
}

const db = initializeFirebase().firestore();

// ========================================
// Google Gemini API 초기화
// ========================================
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ [치명적 오류]: GEMINI_API_KEY가 설정되지 않았습니다.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);


// ========================================
// 날짜 헬퍼
// ========================================
function getWeekLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const week = Math.ceil(now.getDate() / 7);
  return `${year}년 ${month}월 ${week}주차`;
}

function getSearchDateRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - day);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `${fmt(lastMonday)} ~ ${fmt(lastSunday)}`;
}

// ========================================
// Firestore에서 현재 1~100위 랭킹 데이터 가져오기
// ========================================
async function getCurrentRanking() {
  try {
    const snapshot = await db.collection("tools")
      .orderBy("rank", "asc")
      .limit(100)
      .get();

    if (snapshot.empty) return "현재 등록된 툴이 없습니다.";

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return `#${data.rank} ${data.name}`;
    }).join(", ");
  } catch (error) {
    return "현재 등록된 툴이 없습니다.";
  }
}

// ========================================
// JSON 추출 및 클렌징
// ========================================
function extractJsonArray(text) {
  try {
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) throw new Error("JSON 배열을 찾을 수 없습니다.");
    // 마크다운 볼드/이탤릭 제거 (***text***, **text**, *text*)
    const sanitized = jsonMatch[0].replace(/\*{1,3}(.*?)\*{1,3}/g, '$1');
    return JSON.parse(sanitized);
  } catch (error) {
    console.error("❌ JSON 파싱 실패:", error.message);
    throw error;
  }
}

// FALLBACK_POOL, SCORE_CRITERIA, COLLECTION_RULES, OUTPUT_FORMAT → ranking_config.js 참조

// ========================================
// 중복 판별
// ========================================
function isSameProductFast(name1, name2) {
  const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean1 === clean2) return true;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
  return false;
}

// ========================================
// Gemini API 호출
// ========================================
async function askGemini(prompt, retryCount = 0) {
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: GEMINI_CONFIG
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }]
    });

    const text = result.response.text();
    if (!text || text.trim().length === 0) throw new Error("빈 응답");
    return text;
  } catch (error) {
    if (retryCount < 2) {
      await new Promise(r => setTimeout(r, 3000));
      return askGemini(prompt, retryCount + 1);
    }
    throw error;
  }
}

// ========================================
// 고정 구간 랭킹 청크 수집 (10개씩)
// ========================================
async function fetchRankingChunk(startRank, endRank, weekLabel, dateRange, excludeList, retryCount = 0) {
  const rangeLabel = `${startRank}위부터 ${endRank}위`;
  const count = endRank - startRank + 1;
  console.log(`🤖 [Ranking Agent] ${rangeLabel} 분석 중 (Gemini 3 Flash Preview + Google Search)...`);

  if (retryCount > 0) {
    console.log(`   ⚠️ [재시도 ${retryCount}/3] ${rangeLabel} 구간 데이터 수집 중...`);
  }

  const prompt = `당신은 AI 도구 시장 분석 전문가입니다. Google Search를 기반으로 글로벌 AI 툴 랭킹을 생성하세요.

[작업 지침]
- 목표: ${weekLabel} 기준 글로벌 AI 툴 랭킹 ${rangeLabel} 선정
- 조사 기간: ${dateRange}
- 선정 개수: 정확히 ${count}개 (${startRank}위 ~ ${endRank}위)

[이미 선정된 툴 - 절대 중복 금지]
${excludeList || "없음"}

${COLLECTION_RULES}

${SCORE_CRITERIA}

${OUTPUT_FORMAT}

[
  {
    "Rank": ${startRank},
    "Change": "0",
    "Name": "툴이름",
    "URL": "https://...",
    "Category": "text",
    "Tags": ["태그1", "태그2"],
    "Description": "한국어 설명",
    "One_Line_Review": "한 줄 리뷰",
    "USP": "핵심 차별점",
    "Pros_Cons": { "pros": ["장점1", "장점2"], "cons": ["단점1"] },
    "Usage_Score": 85.0,
    "Tech_Score": 80.0,
    "Buzz_Score": 75.0,
    "Utility_Score": 90.0,
    "Growth_Score": 70.0,
    "Total_Score": 82.5,
    "Pricing": "Free",
    "Korean_Support": "Y",
    "Platform": ["Web"]
  }
]`;

  try {
    const text = await askGemini(prompt);
    const rawChunk = extractJsonArray(text);

    const seenNames = new Set();
    const chunk = rawChunk.map(item => ({
      Rank: parseInt(item.Rank || item.rank) || 0,
      Change: String(item.Change || item.change || "0"),
      Name: String(item.Name || item.name || ""),
      URL: String(item.URL || item.url || ""),
      Category: String(item.Category || item.category || "etc"),
      Tags: Array.isArray(item.Tags || item.tags) ? (item.Tags || item.tags) : [],
      Description: String(item.Description || item.description || ""),
      One_Line_Review: String(item.One_Line_Review || item.one_line_review || ""),
      USP: String(item.USP || item.usp || ""),
      Pros_Cons: (item.Pros_Cons || item.pros_cons) || { pros: [], cons: [] },
      Usage_Score: parseFloat(item.Usage_Score || item.usage_score) || 0,
      Tech_Score: parseFloat(item.Tech_Score || item.tech_score) || 0,
      Buzz_Score: parseFloat(item.Buzz_Score || item.buzz_score) || 0,
      Utility_Score: parseFloat(item.Utility_Score || item.utility_score) || 0,
      Growth_Score: parseFloat(item.Growth_Score || item.growth_score) || 0,
      Total_Score: parseFloat(item.Total_Score || item.total_score) || 0,
      Pricing: String(item.Pricing || item.pricing || "Free"),
      Korean_Support: String(item.Korean_Support || item.korean_support || "N"),
      Platform: Array.isArray(item.Platform || item.platform) ? (item.Platform || item.platform) : ["Web"]
    })).filter(item => {
      if (!item.Name || !item.URL) return false;
      const nameLower = item.Name.toLowerCase().trim();
      if (seenNames.has(nameLower)) return false;
      seenNames.add(nameLower);
      return true;
    });

    console.log(`   ✅ ${rangeLabel}: ${chunk.length}개 항목 수집 완료`);
    return chunk;
  } catch (error) {
    if (retryCount < RETRY_LIMIT) {
      console.log(`   ❌ ${rangeLabel} 수집 실패: ${error.message}`);
      console.log(`   ⏳ ${RETRY_DELAY_MS / 1000}초 후 재시도...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return fetchRankingChunk(startRank, endRank, weekLabel, dateRange, excludeList, retryCount + 1);
    }

    console.error(`\n❌ [최종 실패]: ${rangeLabel} 구간을 백업 데이터로 대체합니다.`);
    const shuffled = [...FALLBACK_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.max(count, FALLBACK_POOL.length)).map((tool, i) => ({
      Name: tool.name, URL: tool.url, Category: tool.cat,
      Rank: startRank + i, Change: "0", Tags: ["AI"], Description: "백업 데이터",
      Total_Score: 70.0, Usage_Score: 70, Tech_Score: 70, Buzz_Score: 70, Utility_Score: 70, Growth_Score: 70,
      Pricing: "Free", Korean_Support: "Y", Platform: ["Web"]
    }));
  }
}

// ========================================
// 메인 실행
// ========================================
async function runRankingAgent() {
  try {
    const weekLabel = getWeekLabel();
    const dateRange = getSearchDateRange();
    console.log(`\n🚀 [Ranking Agent v2.0] ${weekLabel} (${dateRange} 기준) 글로벌 AI 툴 랭킹 생성 시작...`);
    console.log(`\n🔧 AI 엔진: Google Gemini 3 Flash Preview + Google Search Grounding\n`);

    console.log(`📡 Firestore에서 현재 1~100위 데이터를 가져오는 중...`);
    const currentRankingContext = await getCurrentRanking();

    const allTools = [];
    const globalSeenNames = new Set();

    // CHUNK_SIZE씩 고정 구간으로 수집 (ranking_config.js 참조)
    const ranges = [];
    for (let start = 1; start <= TOTAL_TOOLS; start += CHUNK_SIZE) {
      ranges.push([start, Math.min(start + CHUNK_SIZE - 1, TOTAL_TOOLS)]);
    }

    for (const [startRank, endRank] of ranges) {
      const excludeList = Array.from(globalSeenNames).join(", ");
      const chunk = await fetchRankingChunk(startRank, endRank, weekLabel, dateRange, excludeList);

      let added = 0;
      for (const tool of chunk) {
        const name = tool.Name.trim();
        let isDuplicate = false;
        for (const existing of globalSeenNames) {
          if (isSameProductFast(name, existing)) {
            console.log(`   🎯 전역 중복 제외: "${name}" (기존: "${existing}")`);
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          globalSeenNames.add(name);
          allTools.push(tool);
          added++;
        }
      }
      console.log(`   📊 진행률: ${allTools.length}/100 완료 (${startRank - 1}%) [이번 구간 +${added}개]\n`);
      await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
    }

    // 부족분 추가 수집
    if (allTools.length < 100) {
      const needed = 100 - allTools.length;
      console.log(`\n⚠️  ${needed}개 부족 → 추가 AI 툴 수집 시작...`);
      const excludeList = Array.from(globalSeenNames).join(", ");
      const extra = await fetchRankingChunk(allTools.length + 1, 100, weekLabel, dateRange, excludeList);
      let added = 0;
      for (const tool of extra) {
        if (allTools.length >= 100) break;
        const name = tool.Name.trim();
        let isDuplicate = false;
        for (const existing of globalSeenNames) {
          if (isSameProductFast(name, existing)) {
            console.log(`   ⚠️ 추가 요청에서도 중복: "${name}"`);
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          globalSeenNames.add(name);
          allTools.push(tool);
          added++;
        }
      }
      console.log(`   ✅ 추가 수집 완료: ${added}개 (총 ${allTools.length}개)`);
    }

    // 100개 강제 충원
    if (allTools.length < 100) {
      const shuffled = [...FALLBACK_POOL].sort(() => 0.5 - Math.random());
      for (const f of shuffled) {
        if (allTools.length >= 100) break;
        if (![...globalSeenNames].some(n => isSameProductFast(n, f.name))) {
          allTools.push({
            Name: f.name, URL: f.url, Category: f.cat,
            Rank: 0, Change: "0", Tags: ["AI"], Description: "백업 충원",
            Total_Score: 60.0, Usage_Score: 60, Tech_Score: 60, Buzz_Score: 60, Utility_Score: 60, Growth_Score: 60,
            Pricing: "Free", Korean_Support: "Y", Platform: ["Web"]
          });
          globalSeenNames.add(f.name);
        }
      }
    }

    console.log(`\n✅ 총 ${allTools.length}개 도구 수집 완료 (중복 제거됨)\n`);
    allTools.forEach((t, i) => t.Rank = i + 1);

    console.log(`💾 Firestore adminReports에 저장 중...`);
    const reportRef = await db.collection("adminReports").add({
      type: "ranking_update",
      summary: `[${weekLabel}] 글로벌 AI 툴 랭킹 100 갱신 (${allTools.length}개) - Gemini 3`,
      data: {
        tools: allTools,
        weekLabel,
        totalCount: allTools.length,
        generatedAt: new Date().toISOString(),
        engine: "Gemini 3 Flash Preview + Google Search"
      },
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n🎉 [완료] adminReports에 보고서 저장 완료!`);
    console.log(`   📄 보고서 ID: ${reportRef.id}`);
    console.log(`   📊 수집된 툴: ${allTools.length}개`);
    console.log(`   ⚠️  관리자 에이전트 제어실에서 최종 승인 후 랭킹이 갱신됩니다.\n`);

    const scores = allTools.map(t => t.Total_Score).filter(s => s > 0);
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
    const top3 = allTools.slice(0, 3).map(t => t.Name).join(", ");
    const bot3 = allTools.slice(-3).map(t => t.Name).join(", ");
    console.log(`\n📈 [통계]`);
    console.log(`   평균 Total Score: ${avg}`);
    console.log(`   상위 3개 툴: ${top3}`);
    console.log(`   하위 3개 툴: ${bot3}`);
  } catch (error) {
    console.error("❌ 오류:", error);
    process.exit(1);
  }
}

runRankingAgent();
