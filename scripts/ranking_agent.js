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
  console.error("   .env 파일에 VITE_GEMINI_API_KEY 또는 GEMINI_API_KEY를 추가하세요.");
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
  console.log("📡 Firestore에서 현재 1~100위 데이터를 가져오는 중...");
  try {
    const snapshot = await db.collection("tools")
      .orderBy("rank", "asc")
      .limit(100)
      .get();

    if (snapshot.empty) {
      console.log("⚠️ 기존 데이터가 없습니다. 신규로 생성합니다.");
      return "현재 등록된 툴이 없습니다.";
    }

    const currentList = snapshot.docs.map(doc => {
      const data = doc.data();
      return `#${data.rank} ${data.name} (URL: ${data.url || 'N/A'})`;
    }).join("\n");

    console.log(`✅ 기존 데이터 ${snapshot.size}개 로드 완료`);
    return currentList;
  } catch (error) {
    console.error("⚠️ Firestore 데이터 로드 실패:", error.message);
    return "현재 등록된 툴이 없습니다.";
  }
}

// ========================================
// JSON 추출 및 클렌징 (강화된 버전)
// ========================================
function extractJsonArray(text) {
  try {
    // 마크다운 코드 블록 제거
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // JSON 배열 찾기
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');

    if (start === -1 || end === -1) {
      throw new Error("JSON 배열을 찾을 수 없습니다.");
    }

    const jsonStr = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      throw new Error("JSON이 배열 형식이 아닙니다.");
    }

    return parsed;
  } catch (error) {
    console.error("❌ JSON 파싱 실패:", error.message);
    console.error("원본 텍스트:", text.substring(0, 500));
    throw error;
  }
}

// ========================================
// 빠른 중복 판별 (기존 로직 유지)
// ========================================
function isSameProductFast(name1, name2) {
  const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1단계: 완전 동일
  if (clean1 === clean2) return true;

  // 2단계: 한쪽이 다른 쪽을 완전히 포함 (최소 5글자 이상)
  if (clean1.length >= 5 && clean2.length >= 5) {
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      return true;
    }
  }

  // 3단계: 대표 제품군 키워드 매칭
  const productFamilies = [
    ['claude', 'sonnet', 'opus', 'haiku'],
    ['chatgpt', 'gpt4', 'gpt3', 'gpt', 'dalle'],
    ['gemini', 'bard'],
    ['copilot', 'githubcopilot'],
    ['midjourney', 'midjourneyv'],
    ['runway', 'runwayml'],
    ['deepseek', 'deepseekv'],
    ['stable', 'stablediffusion'],
    ['llama', 'llamav']
  ];

  for (const family of productFamilies) {
    const in1 = family.some(k => clean1.includes(k));
    const in2 = family.some(k => clean2.includes(k));
    if (in1 && in2) {
      return true;
    }
  }

  return false;
}

// ========================================
// 업계 표준 백업 도구 리스트 (최후의 수단)
// ========================================
const FALLBACK_POOL = [
  { name: "ChatGPT", url: "https://chatgpt.com", cat: "text" },
  { name: "Claude", url: "https://claude.ai", cat: "text" },
  { name: "Gemini", url: "https://gemini.google.com", cat: "text" },
  { name: "Midjourney", url: "https://midjourney.com", cat: "image" },
  { name: "DALL-E 3", url: "https://openai.com/dall-e-3", cat: "image" },
  { name: "Stable Diffusion", url: "https://stability.ai", cat: "image" },
  { name: "Runway Gen-3", url: "https://runwayml.com", cat: "video" },
  { name: "Sora", url: "https://openai.com/sora", cat: "video" },
  { name: "GitHub Copilot", url: "https://github.com/features/copilot", cat: "code" },
  { name: "Cursor", url: "https://cursor.com", cat: "code" },
  { name: "Perplexity AI", url: "https://perplexity.ai", cat: "search" },
  { name: "NotebookLM", url: "https://notebooklm.google", cat: "text" },
  { name: "ElevenLabs", url: "https://elevenlabs.io", cat: "audio" },
  { name: "Suno", url: "https://suno.ai", cat: "audio" },
  { name: "HeyGen", url: "https://heygen.com", cat: "video" },
  { name: "Leonardo AI", url: "https://leonardo.ai", cat: "image" },
  { name: "v0", url: "https://v0.dev", cat: "code" },
  { name: "Jasper", url: "https://jasper.ai", cat: "text" },
  { name: "Copy.ai", url: "https://copy.ai", cat: "text" },
  { name: "Synthesia", url: "https://synthesia.io", cat: "video" }
];

// ========================================
// Gemini API 호출 (Google Search 그라운딩 활용)
// ========================================
async function askGemini(prompt, retryCount = 0) {
  try {
    // gemini-3-flash-preview 모델 사용 (Google Search 그라운딩 지원)
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{
        googleSearch: {} // Google Search 그라운딩 활성화
      }]
    });

    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error("Gemini API가 빈 응답을 반환했습니다.");
    }

    return text;
  } catch (error) {
    console.error(`❌ Gemini API 호출 실패 (시도 ${retryCount + 1}/3):`, error.message);

    if (retryCount < 2) {
      console.log(`   ⏳ 3초 후 재시도...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return askGemini(prompt, retryCount + 1);
    }

    throw error;
  }
}

// ========================================
// 10개 단위 랭킹 청크 수집 (재시도 로직 포함)
// ========================================
async function fetchRankingChunk(range, weekLabel, dateRange, currentRankingContext, retryCount = 0) {
  const startRank = parseInt(range.match(/\d+/)[0]);
  const endRank = startRank + 9;

  console.log(`🤖 [Ranking Agent] ${range} 분석 중 (Gemini 3 Flash Preview + Google Search)...`);

  if (retryCount > 0) {
    console.log(`   ⚠️ [재시도 ${retryCount}/3] ${range} 구간 데이터 수집 중...`);
  }

  const prompt = `당신은 AI 도구 시장 분석 전문가입니다. Google Search를 활용하여 실시간 데이터를 기반으로 글로벌 AI 툴 랭킹을 생성하세요.

[작업 지침]
- 순위 구간: ${startRank}위 ~ ${endRank}위 (정확히 10개)
- 목표 주차: ${weekLabel}
- 조사 기간: ${dateRange}
- 현재 시스템 상태: ${currentRankingContext === "현재 등록된 툴이 없습니다." ? "DB 초기 상태" : "기존 랭킹 존재"}

[참고: 현재 등록된 주요 툴]
${currentRankingContext}

[핵심 요구사항]
1. **정확히 10개의 AI 툴**을 ${startRank}위부터 ${endRank}위까지 순서대로 선정하세요
2. 각 툴마다 **6가지 세부 점수 요소**를 0.0~100.0 사이 값으로 산정하세요:
   - Usage_Score: 실제 사용자 수, 트래픽, 활성 사용자 기반 점수
   - Tech_Score: 기술력, 모델 성능, 혁신성 점수
   - Buzz_Score: 소셜 미디어 언급, 뉴스, 화제성 점수
   - Utility_Score: 실용성, 사용 편의성, 접근성 점수
   - Growth_Score: 최근 성장률, 업데이트 빈도, 발전 속도
   - Total_Score: 위 5가지 점수의 가중 평균 (Usage 30%, Tech 25%, Buzz 20%, Utility 15%, Growth 10%)

3. **절대 거부 금지**: 데이터가 부족해도 합리적인 추정치로 10개를 반드시 채우세요
4. **중복 방지**: 이미 다른 순위에 등록된 툴은 제외하세요
5. **정확한 URL**: 각 툴의 공식 웹사이트 URL을 제공하세요

[출력 형식]
반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력하세요.

[
  {
    "Rank": ${startRank},
    "Change": "0",
    "Name": "ChatGPT",
    "URL": "https://chatgpt.com",
    "Category": "text",
    "Tags": ["LLM", "Chatbot", "Multimodal"],
    "Description": "OpenAI에서 개발한 세계 점유율 1위 AI 서비스입니다.",
    "One_Line_Review": "가장 범용적이고 강력한 AI 비서의 표준",
    "USP": "압도적인 사용자 생태계와 안정적인 멀티모달 성능",
    "Pros_Cons": { "pros": ["범용성", "에코시스템", "안정성"], "cons": ["속도", "비용"] },
    "Difficulty": "초급",
    "Usage_Score": 98.5,
    "Tech_Score": 97.0,
    "Buzz_Score": 99.0,
    "Utility_Score": 96.0,
    "Growth_Score": 92.0,
    "Total_Score": 97.5,
    "Pricing": "Freemium",
    "Korean_Support": "Y",
    "Platform": ["Web", "iOS", "Android"],
    "API_Available": "Y",
    "Latest_Update": "o1-preview 모델 및 Canvas 기능 정식 출시",
    "Free_Tier_Limit": "GPT-4o 사용량 제한 후 4o-mini 전환"
  }
]

**중요**: 위 예시 형식을 정확히 따라 ${startRank}위부터 ${endRank}위까지 10개의 객체를 배열로 반환하세요.`;

  try {
    const text = await askGemini(prompt);
    const rawChunk = extractJsonArray(text);

    // 필수 필드 검증 및 정규화
    const seenNames = new Set();
    const chunk = rawChunk
      .map(item => {
        const normalized = {};

        // 대소문자 무관하게 필드 매핑
        Object.keys(item).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'rank') normalized.Rank = item[key];
          else if (lowerKey === 'name') normalized.Name = item[key];
          else if (lowerKey === 'url') normalized.URL = item[key];
          else if (lowerKey === 'change') normalized.Change = item[key];
          else if (lowerKey === 'category') normalized.Category = item[key];
          else if (lowerKey === 'tags') normalized.Tags = item[key];
          else if (lowerKey === 'description') normalized.Description = item[key];
          else if (lowerKey === 'one_line_review') normalized.One_Line_Review = item[key];
          else if (lowerKey === 'usp') normalized.USP = item[key];
          else if (lowerKey === 'pros_cons') normalized.Pros_Cons = item[key];
          else if (lowerKey === 'difficulty') normalized.Difficulty = item[key];
          else if (lowerKey === 'usage_score') normalized.Usage_Score = parseFloat(item[key]) || 0;
          else if (lowerKey === 'tech_score') normalized.Tech_Score = parseFloat(item[key]) || 0;
          else if (lowerKey === 'buzz_score') normalized.Buzz_Score = parseFloat(item[key]) || 0;
          else if (lowerKey === 'utility_score') normalized.Utility_Score = parseFloat(item[key]) || 0;
          else if (lowerKey === 'growth_score') normalized.Growth_Score = parseFloat(item[key]) || 0;
          else if (lowerKey === 'total_score') normalized.Total_Score = parseFloat(item[key]) || 0;
          else if (lowerKey === 'pricing') normalized.Pricing = item[key];
          else if (lowerKey === 'korean_support') normalized.Korean_Support = item[key];
          else if (lowerKey === 'platform') normalized.Platform = item[key];
          else if (lowerKey === 'api_available') normalized.API_Available = item[key];
          else if (lowerKey === 'latest_update') normalized.Latest_Update = item[key];
          else if (lowerKey === 'free_tier_limit') normalized.Free_Tier_Limit = item[key];
          else normalized[key] = item[key];
        });

        // 기본값 설정
        normalized.Change = normalized.Change || "0";
        normalized.Category = normalized.Category || "etc";
        normalized.Tags = normalized.Tags || [];
        normalized.Description = normalized.Description || "";
        normalized.One_Line_Review = normalized.One_Line_Review || "";
        normalized.USP = normalized.USP || "";
        normalized.Pros_Cons = normalized.Pros_Cons || { pros: [], cons: [] };
        normalized.Difficulty = normalized.Difficulty || "중급";
        normalized.Pricing = normalized.Pricing || "Freemium";
        normalized.Korean_Support = normalized.Korean_Support || "N";
        normalized.Platform = normalized.Platform || ["Web"];
        normalized.API_Available = normalized.API_Available || "N";
        normalized.Latest_Update = normalized.Latest_Update || "";
        normalized.Free_Tier_Limit = normalized.Free_Tier_Limit || "";

        return normalized;
      })
      .filter(item => {
        // 필수 필드 검증
        if (!item.Name || !item.Rank || !item.URL) {
          console.log(`   ⚠️ 필수 필드 누락: ${JSON.stringify(item)}`);
          return false;
        }

        // 청크 내 중복 제거
        const nameLower = String(item.Name).toLowerCase().trim();
        if (seenNames.has(nameLower)) {
          console.log(`   ⚠️ 중복 툴 제외: ${item.Name}`);
          return false;
        }
        seenNames.add(nameLower);
        return true;
      });

    // 10개 미만이면 재시도
    if (chunk.length < 10 && retryCount < 3) {
      throw new Error(`10개를 다 채우지 못함 (현재 ${chunk.length}개)`);
    }

    console.log(`   ✅ ${range}: ${chunk.length}개 항목 수집 완료`);
    return chunk;

  } catch (error) {
    console.error(`   ❌ ${range} 수집 실패:`, error.message);

    // 재시도
    if (retryCount < 3) {
      console.log(`   ⏳ 5초 후 재시도...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return fetchRankingChunk(range, weekLabel, dateRange, currentRankingContext, retryCount + 1);
    }

    // 최후의 수단: Fallback 데이터 사용
    console.error(`\n❌ [최종 실패]: ${range} 구간을 백업 데이터로 대체합니다.`);
    const fallbackChunk = FALLBACK_POOL.slice(0, 10).map((tool, idx) => ({
      Rank: startRank + idx,
      Change: "0",
      Name: tool.name,
      URL: tool.url,
      Category: tool.cat,
      Tags: ["AI Service", "Recommended"],
      Description: `${tool.name}은(는) 해당 분야에서 널리 사용되는 선도적인 AI 솔루션입니다.`,
      One_Line_Review: "시장 인지도가 높은 안정적인 서비스",
      USP: "안정적인 서비스 운영과 검증된 사용자 피드백",
      Pros_Cons: { pros: ["높은 인지도", "안정성"], cons: ["상대적으로 늦은 업데이트"] },
      Difficulty: "중급",
      Usage_Score: 75.0,
      Tech_Score: 78.0,
      Buzz_Score: 72.0,
      Utility_Score: 80.0,
      Growth_Score: 65.0,
      Total_Score: 75.0,
      Pricing: "Freemium",
      Korean_Support: "Y",
      Platform: ["Web"],
      API_Available: "Y",
      Latest_Update: "",
      Free_Tier_Limit: ""
    }));

    return fallbackChunk;
  }
}

// ========================================
// 메인 랭킹 에이전트 실행
// ========================================
async function runRankingAgent() {
  try {
    const weekLabel = getWeekLabel();
    const dateRange = getSearchDateRange();
    console.log(`\n🚀 [Ranking Agent v2.0] ${weekLabel} (${dateRange} 기준) 글로벌 AI 툴 랭킹 생성 시작...\n`);
    console.log(`🔧 AI 엔진: Google Gemini 3 Flash Preview + Google Search Grounding\n`);

    const currentRankingContext = await getCurrentRanking();
    const allTools = [];
    const globalSeenNames = new Set();

    // 10개씩 10번 호출 (총 100개)
    for (let i = 1; i <= 100; i += 10) {
      const start = i;
      const end = i + 9;
      const rangeStr = `${start}위부터 ${end}위`;

      const chunk = await fetchRankingChunk(rangeStr, weekLabel, dateRange, currentRankingContext);

      // 전역 중복 제거
      const uniqueChunk = [];
      for (const tool of chunk) {
        const toolName = String(tool.Name).trim();
        let isDuplicate = false;

        for (const existingName of globalSeenNames) {
          if (isSameProductFast(toolName, existingName)) {
            console.log(`   🎯 전역 중복 제외: "${tool.Name}" (기존: "${existingName}")`);
            isDuplicate = true;
            break;
          }
        }

        if (!isDuplicate) {
          globalSeenNames.add(toolName);
          uniqueChunk.push(tool);
        }
      }

      allTools.push(...uniqueChunk);

      // 진행률 표시
      const progress = Math.min(100, Math.round((i / 100) * 100));
      console.log(`   📊 진행률: ${allTools.length}/100 완료 (${progress}%) [이번 구간 +${uniqueChunk.length}개]\n`);

      // API 호출 간격 (Rate Limiting 방지)
      if (i < 91) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ 총 ${allTools.length}개 도구 수집 완료 (중복 제거됨)`);

    // 100개 미만이면 추가 수집
    if (allTools.length < 100) {
      const needed = 100 - allTools.length;
      console.log(`\n⚠️  ${needed}개 부족 → 추가 AI 툴 수집 시작...`);

      const excludeList = Array.from(globalSeenNames).join(", ");
      const extraPrompt = `다음 툴들은 이미 포함되어 있으니 절대 중복하지 말고, 새로운 AI 툴 ${needed}개를 추천하세요:\n${excludeList}`;

      try {
        const extraChunk = await fetchRankingChunk(
          `추가 ${needed}개`,
          weekLabel,
          dateRange,
          extraPrompt,
          0
        );

        const extraUnique = [];
        for (const tool of extraChunk) {
          if (extraUnique.length >= needed) break;

          const toolName = String(tool.Name).trim();
          let isDuplicate = false;

          for (const existingName of globalSeenNames) {
            if (isSameProductFast(toolName, existingName)) {
              console.log(`   ⚠️ 추가 요청에서도 중복: "${tool.Name}"`);
              isDuplicate = true;
              break;
            }
          }

          if (!isDuplicate) {
            globalSeenNames.add(toolName);
            tool.Rank = allTools.length + extraUnique.length + 1;
            extraUnique.push(tool);
          }
        }

        allTools.push(...extraUnique);
        console.log(`   ✅ 추가 수집 완료: ${extraUnique.length}개 (총 ${allTools.length}개)`);
      } catch (err) {
        console.error(`   ❌ 추가 수집 실패:`, err.message);
        console.log(`   ⚠️  ${allTools.length}개로 계속 진행합니다.`);
      }
    }

    // Rank 재정렬 (순서 보장)
    allTools.sort((a, b) => a.Rank - b.Rank);
    allTools.forEach((tool, idx) => {
      tool.Rank = idx + 1;
    });

    // adminReports에 저장
    console.log(`\n💾 Firestore adminReports에 저장 중...`);
    const reportRef = await db.collection("adminReports").add({
      type: "ranking_update",
      summary: `[${weekLabel}] 글로벌 AI 툴 랭킹 정밀 갱신 제안 (${allTools.length}개) - Gemini 3`,
      data: {
        tools: allTools,
        weekLabel,
        totalCount: allTools.length,
        generatedAt: new Date().toISOString(),
        engine: "Gemini 3 Flash Preview + Google Search",
        version: "2.0"
      },
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n🎉 [완료] adminReports에 보고서 저장 완료!`);
    console.log(`   📄 보고서 ID: ${reportRef.id}`);
    console.log(`   📊 수집된 툴: ${allTools.length}개`);
    console.log(`   ⚠️  관리자 에이전트 제어실에서 최종 승인 후 랭킹이 갱신됩니다.\n`);

    // 성공 통계
    const avgTotalScore = (allTools.reduce((sum, t) => sum + t.Total_Score, 0) / allTools.length).toFixed(2);
    console.log(`\n📈 [통계]`);
    console.log(`   평균 Total Score: ${avgTotalScore}`);
    console.log(`   상위 3개 툴: ${allTools.slice(0, 3).map(t => t.Name).join(', ')}`);
    console.log(`   하위 3개 툴: ${allTools.slice(-3).map(t => t.Name).join(', ')}\n`);

  } catch (error) {
    console.error("\n❌ [치명적 오류] Ranking Agent 실행 실패:", error);
    console.error(error.stack);
    process.exit(1);
  }
}

// ========================================
// 실행
// ========================================
runRankingAgent();
