import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// ========================================
// 업계 표준 백업 도구 리스트 (확장된 Fallback Pool)
// ========================================
const FALLBACK_POOL = [
  { name: "ChatGPT", url: "https://chatgpt.com", cat: "text" },
  { name: "Claude", url: "https://claude.ai", cat: "text" },
  { name: "Gemini", url: "https://gemini.google.com", cat: "text" },
  { name: "Midjourney", url: "https://midjourney.com", cat: "image" },
  { name: "DALL-E 3", url: "https://openai.com/dall-e-3", cat: "image" },
  { name: "Stable Diffusion", url: "https://stability.ai", cat: "image" },
  { name: "Runway Gen-3", url: "https://runwayml.com", cat: "video" },
  { name: "Luma Dream Machine", url: "https://lumalabs.ai", cat: "video" },
  { name: "Sora", url: "https://openai.com/sora", cat: "video" },
  { name: "GitHub Copilot", url: "https://github.com/features/copilot", cat: "code" },
  { name: "Cursor", url: "https://cursor.com", cat: "code" },
  { name: "Perplexity AI", url: "https://perplexity.ai", cat: "search" },
  { name: "NotebookLM", url: "https://notebooklm.google", cat: "text" },
  { name: "ElevenLabs", url: "https://elevenlabs.io", cat: "audio" },
  { name: "Suno", url: "https://suno.ai", cat: "audio" },
  { name: "Udio", url: "https://udio.com", cat: "audio" },
  { name: "HeyGen", url: "https://heygen.com", cat: "video" },
  { name: "Leonardo AI", url: "https://leonardo.ai", cat: "image" },
  { name: "v0.dev", url: "https://v0.dev", cat: "code" },
  { name: "Replit Agent", url: "https://replit.com", cat: "code" },
  { name: "Jasper", url: "https://jasper.ai", cat: "text" },
  { name: "Copy.ai", url: "https://copy.ai", cat: "text" },
  { name: "Synthesia", url: "https://synthesia.io", cat: "video" },
  { name: "Grammarly", url: "https://grammarly.com", cat: "text" },
  { name: "Canva Magic Studio", url: "https://canva.com", cat: "design" },
  { name: "Adobe Firefly", url: "https://adobe.com/sensei/generative-ai/firefly.html", cat: "image" },
  { name: "Gamma", url: "https://gamma.app", cat: "design" },
  { name: "DeepL", url: "https://deepl.com", cat: "text" },
  { name: "Poe", url: "https://poe.com", cat: "text" },
  { name: "Hugging Face", url: "https://huggingface.co", cat: "dev" },
  { name: "Character.ai", url: "https://character.ai", cat: "text" },
  { name: "InVideo", url: "https://invideo.io", cat: "video" },
  { name: "Beautiful.ai", url: "https://beautiful.ai", cat: "design" },
  { name: "Figma AI", url: "https://figma.com", cat: "design" }
];

// ========================================
// 중복 판별
// ========================================
function isSameProductFast(name1, name2) {
  const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean1 === clean2) return true;
  if (clean1.length >= 5 && clean2.length >= 5) {
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
  }
  return false;
}

// ========================================
// Gemini API 호출
// ========================================
async function askGemini(prompt, retryCount = 0) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview", 
      generationConfig: { temperature: 0.2, topP: 0.95, topK: 40, maxOutputTokens: 8192 }
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
// 가변 랭킹 청크 수집
// ========================================
async function fetchRankingChunk(rangeLabel, count, weekLabel, dateRange, currentRankingContext, retryCount = 0) {
  console.log(`🤖 [Ranking Agent] ${rangeLabel} 분석 중 (${count}개 요청)...`);

  const prompt = `당신은 AI 도구 시장 분석 전문가입니다. Google Search를 기반으로 글로벌 AI 툴 랭킹을 생성하세요.

[작업 지침]
- 요청 개수: **정확히 ${count}개**
- 순위 대역: ${rangeLabel}
- 목표 주차: ${weekLabel}
- 조사 기간: ${dateRange}

[참고: 이미 목록에 포함된 주요 툴 - 절대 중복 금지]
${currentRankingContext}

[핵심 요구사항]
1. 선정 기준: 실제 사용량, 기술력, 화제성을 종합하여 현재 가장 인기 있는 AI 도구를 선정하세요.
2. 각 툴마다 세부 점수 및 정보를 JSON 형식으로 제공하세요.
3. **중복 엄격 금지**: 위 '참고' 리스트에 있는 툴은 절대 다시 언급하지 마세요.
4. **절대 거부 금지**: 유명하지 않은 툴이라도 시장 가치가 있다면 포함하여 반드시 ${count}개를 채우세요.

[출력 형식]
반드시 JSON 배열 형식으로만 응답하세요.

[
  {
    "Rank": 0,
    "Change": "0",
    "Name": "Name",
    "URL": "https://...",
    "Category": "text",
    "Tags": ["Tag"],
    "Description": "...",
    "One_Line_Review": "...",
    "USP": "...",
    "Pros_Cons": { "pros": ["..."], "cons": ["..."] },
    "Usage_Score": 85.0,
    "Tech_Score": 80.0,
    "Buzz_Score": 75.0,
    "Utility_Score": 90.0,
    "Growth_Score": 70.0,
    "Total_Score": 80.0,
    "Pricing": "Free",
    "Korean_Support": "Y",
    "Platform": ["Web"]
  }
]`;

  try {
    const text = await askGemini(prompt);
    const rawChunk = extractJsonArray(text);

    const seenNames = new Set();
    const chunk = rawChunk.map(item => {
      const normalized = {
        Rank: 0,
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
      };
      return normalized;
    }).filter(item => {
      if (!item.Name || !item.URL) return false;
      const nameLower = item.Name.toLowerCase().trim();
      if (seenNames.has(nameLower)) return false;
      seenNames.add(nameLower);
      return true;
    });

    return chunk;
  } catch (error) {
    if (retryCount < 2) return fetchRankingChunk(rangeLabel, count, weekLabel, dateRange, currentRankingContext, retryCount + 1);
    
    // Fallback: globalSeenNames 무관하게 count개 반환 (중복 제거는 호출부에서 처리)
    console.error(`\n❌ [최종 실패]: 백업 데이터 사용`);
    const shuffled = [...FALLBACK_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.max(count, FALLBACK_POOL.length)).map(tool => ({
      Name: tool.name, URL: tool.url, Category: tool.cat,
      Rank: 0, Change: "0", Tags: ["AI"], Description: "백업 데이터", 
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
    console.log(`\n🚀 [Ranking Agent v2.5] ${weekLabel} 시작...\n`);

    const currentRankingContext = await getCurrentRanking();
    const allTools = [];
    const globalSeenNames = new Set();

    let round = 1;
    while (allTools.length < 100 && round <= 20) {
      const needed = 100 - allTools.length;
      const countToRequest = Math.min(needed, 5); // 한 번에 5개씩 요청하여 JSON 안정성 확보
      
      const chunk = await fetchRankingChunk(`라운드 ${round}`, countToRequest, weekLabel, dateRange, Array.from(globalSeenNames).slice(-40).join(", "));

      for (const tool of chunk) {
        if (allTools.length >= 100) break;
        const name = tool.Name.trim();
        let isDuplicate = false;
        for (const existing of globalSeenNames) {
          if (isSameProductFast(name, existing)) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          globalSeenNames.add(name);
          allTools.push(tool);
        }
      }
      console.log(`📊 진행률: ${allTools.length}/100\n`);
      round++;
      if (allTools.length < 100) await new Promise(r => setTimeout(r, 2000));
    }

    // 100개 강제 충원
    if (allTools.length < 100) {
      const shuffled = [...FALLBACK_POOL].sort(() => 0.5 - Math.random());
      for (const f of shuffled) {
        if (allTools.length >= 100) break;
        if (!globalSeenNames.has(f.name)) {
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

    allTools.forEach((t, i) => t.Rank = i + 1);

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
      status: "pending", createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n🎉 완료: ${reportRef.id} (${allTools.length}개)`);
  } catch (error) {
    console.error("❌ 오류:", error);
    process.exit(1);
  }
}

runRankingAgent();
