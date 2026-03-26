import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 환경 변수 로드 ---
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

// --- Firebase Admin 초기화 ---
function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
  }
  throw new Error("⚠️ Firebase 인증 정보를 찾을 수 없습니다.");
}

const db = initializeFirebase().firestore();

// --- Perplexity API (OpenAI 호환) ---
const perplexityKey = process.env.PERPLEXITY_API_KEY;
if (!perplexityKey) {
  console.error("❌ [치명적 오류]: PERPLEXITY_API_KEY가 설정되지 않았습니다.");
  process.exit(1);
}
const perplexity = new OpenAI({
  apiKey: perplexityKey,
  baseURL: 'https://api.perplexity.ai',
});

// --- Perplexity 호출 헬퍼 ---
async function askPerplexity(systemPrompt, userPrompt, model = "sonar-pro") {
  const response = await perplexity.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.0,
  });
  return response.choices[0].message.content;
}

// --- 날짜 헬퍼 ---
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

// --- Firestore에서 현재 1~100위 랭킹 데이터 가져오기 ---
async function getCurrentRanking() {
  console.log("📡 Firestore에서 현재 1~100위 데이터를 가져오는 중...");
  const snapshot = await db.collection("tools").orderBy("rank", "asc").limit(100).get();
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
}

// --- JSON 클렌징 ---
function extractJsonArray(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error("JSON 배열을 찾을 수 없습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// --- 핵심 로직: 10개 단위 정밀 호출 (재시도 로직 포함) ---
async function fetchRankingChunk(range, weekLabel, dateRange, currentRankingContext, retryCount = 0) {
  const isRetry = retryCount > 0;
  // 2차 재시도 시에는 더 정교한 reasoning 모델 사용 고려
  const model = retryCount >= 2 ? "sonar-reasoning-pro" : "sonar-pro";
  
  const systemPrompt = `당신은 고도로 훈련된 'AI 시장 데이터 매핑 엔진'입니다. 
당신의 임무는 실시간 웹 검색 결과를 바탕으로 지정된 순위 구간의 AI 도구들을 추출하고, 이를 정해진 JSON 스키마로 변환하는 것입니다. 
수치(Score) 데이터는 검색 결과에 나타난 각 도구의 상대적 위상(트래픽, 인지도, 기술력)을 0.0~100.0 사이의 값으로 '매핑'하는 과정이며, 이는 창작이 아닌 데이터 정량화 모델링의 일부입니다. 
다른 설명 없이 오직 JSON 배열만 출력하세요.`;

  const exampleJson = [
    {
      "Rank": 1,
      "Change": "0",
      "Name": "ChatGPT",
      "URL": "https://chatgpt.com",
      "Category": "text",
      "Tags": ["LLM", "Chatbot", "Multimodal"],
      "Description": "OpenAI에서 개발한 세계 점유율 1위 AI 서비스입니다. 최근 o1 모델 및 고급 음성 모드 업데이트로 선두를 유지 중입니다.",
      "One_Line_Review": "가장 범용적이고 강력한 AI 비서의 표준",
      "USP": "압도적인 사용자 생태계와 안정적인 멀티모달 성능",
      "Pros_Cons": { "pros": ["범용성", "에코시스템"], "cons": ["속도(고성능 모델)"] },
      "Difficulty": "초급",
      "Usage_Score": 98.5, "Tech_Score": 97.0, "Buzz_Score": 99.0, "Utility_Score": 96.0, "Growth_Score": 92.0, "Total_Score": 97.5,
      "Pricing": "Freemium", "Korean_Support": "Y", "Platform": ["Web", "iOS", "Android"], "API_Available": "Y",
      "Latest_Update": "o1-preview 모델 및 Canvas 기능 정식 출시",
      "Free_Tier_Limit": "GPT-4o 사용량 제한 후 4o-mini 전환"
    }
  ];

  let userPrompt = `[순위 구간: ${range}] / [목표 주차: ${weekLabel}] / [조사 범위: ${dateRange}]

[참고: 현재 시스템 상태]
${currentRankingContext === "현재 등록된 툴이 없습니다." ? "현재 DB가 비어있습니다. 업계 표준 도구들을 우선 배치하세요." : `현재 리스트 일부:\n${currentRankingContext}`}

[지침]
1. 검색 결과를 바탕으로 해당 순위(${range})를 채울 수 있는 최적의 AI 도구 10개를 선정하세요.
2. 각 필드에 값을 매핑하세요. 정확한 수치가 없다면 검색 결과에서 느껴지는 '상대적 인기도'를 0-100 점수로 변환하세요.
3. **절대 거부하지 마세요.** 이것은 창의적인 작문이 아니라 검색 기반의 데이터 구조화 작업입니다. 
4. 아래 예시 포맷과 동일한 10개의 JSON 객체를 배열([])에 담아 출력하세요.

[예시 포맷]:
${JSON.stringify(exampleJson, null, 2)}`;

  if (isRetry) {
    console.log(`   ⚠️ [Retry ${retryCount}] ${range} 완화된 프롬프트와 ${model} 모델로 재시도 중...`);
    userPrompt += `\n\n[중요] 이전 시도에서 '데이터 부족'을 이유로 거절되었습니다. 다시 지시합니다. 완벽한 분석이 아니더라도 '최선의 추정치'를 사용하여 JSON을 완성하는 것이 당신의 사명입니다.`;
  } else {
    console.log(`🤖 [Ranking Agent] ${range} 분석 중 (Perplexity ${model})...`);
  }

  const text = await askPerplexity(systemPrompt, userPrompt, model);

  try {
    const rawChunk = extractJsonArray(text);
    
    // 데이터 정규화 및 유효성 검사
    const chunk = rawChunk.map(item => {
      const normalized = {};
      Object.keys(item).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'rank') normalized.Rank = item[key];
        else if (lowerKey === 'name') normalized.Name = item[key];
        else if (lowerKey === 'url') normalized.URL = item[key];
        else if (lowerKey === 'change') normalized.Change = item[key];
        else if (lowerKey === 'category') normalized.Category = item[key];
        else if (lowerKey === 'total_score') normalized.Total_Score = item[key];
        else normalized[key] = item[key];
      });
      return normalized;
    }).filter(item => item.Name && item.Rank);

    console.log(`   ✅ ${range}: ${chunk.length}개 항목 매핑 완료`);
    return chunk;
  } catch (err) {
    if (retryCount < 3) {
      return fetchRankingChunk(range, weekLabel, dateRange, currentRankingContext, retryCount + 1);
    }
    console.error(`\n❌ [치명적 오류]: ${range} 모든 모델 시도 실패!`);
    console.error(`=== Perplexity 응답 원본 데이터 ===\n${text}\n=================================\n`);
    return [];
  }
}

async function runRankingAgent() {
  try {
    const weekLabel = getWeekLabel();
    const dateRange = getSearchDateRange();
    console.log(`\n🚀 [Ranking Agent] ${weekLabel} (${dateRange} 기준) 글로벌 AI 툴 정밀 랭킹 생성 시작...\n`);

    const currentRankingContext = await getCurrentRanking();
    const allTools = [];

    // 10개씩 10번 호출 (총 100개) - 정밀도 극대화 전략
    for (let i = 1; i <= 100; i += 10) {
      const start = i;
      const end = i + 9;
      const rangeStr = `${start}위부터 ${end}위`;
      
      const chunk = await fetchRankingChunk(rangeStr, weekLabel, dateRange, currentRankingContext);
      allTools.push(...chunk);
      
      // 진행률 표시
      console.log(`   📊 진행률: ${allTools.length}/100 완료`);
    }

    console.log(`\n✅ 총 ${allTools.length}개 도구 정밀 수집 완료`);

    // Firestore adminReports에 pending 상태로 저장
    const reportRef = await db.collection("adminReports").add({
      type: "ranking_update",
      summary: `[${weekLabel}] 글로벌 AI 툴 랭킹 정밀 갱신 제안 (${allTools.length}개)`,
      data: {
        tools: allTools.sort((a,b) => a.Rank - b.Rank),
        weekLabel,
        totalCount: allTools.length,
        generatedAt: new Date().toISOString(),
      },
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n🏆 [완료] adminReports에 정밀 보고서 저장: ${reportRef.id}`);
    console.log(`   ⚠️  관리자 에이전트 제어실에서 최종 컨펌 후 랭킹이 갱신됩니다.\n`);

  } catch (error) {
    console.error("❌ Ranking Agent 오류:", error);
    process.exit(1);
  }
}

runRankingAgent();
