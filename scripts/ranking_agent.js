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
  
  const systemPrompt = isRetry 
    ? `당신은 유연한 AI 데이터 분석가입니다. 실시간 데이터가 부족하더라도, 현재 시장에 실존하는 유효한 AI 서비스 10개를 선정하여 [${range}] 구간을 반드시 JSON으로 채우세요. 답변 거부는 절대 불가합니다.`
    : `당신은 세계 최고의 AI 기술 분석가이자 시장 조사 전문가입니다. 실시간 웹 검색과 당신의 심층 지식을 결합하여 [${range}]에 해당하는 도구들의 지표를 분석하세요. 정밀한 수치 데이터가 보안상 제한되더라도, 시장의 상대적 위상과 트렌드를 바탕으로 '전문가적 추정치'를 산출하여 반드시 JSON 형식을 유지해야 합니다. 답변 거부(Refusal)는 허용되지 않습니다.`;

  const userPrompt = isRetry
    ? `[긴급 재시도: ${range}]
데이터가 부족하다는 이유로 거절하지 마세요. 현재 글로벌 시장에서 운영 중인 AI 도구 중 아직 순위에 포함되지 않은 10개를 자유롭게 골라 [${range}] 순위를 부여하고 JSON을 생성하세요. 
각 도구의 점수와 설명은 현재 시장 인지도를 바탕으로 '합리적인 추정치'를 사용하세요. 반드시 JSON 배열만 출력하세요.`
    : `[목표 주차: ${weekLabel}] / [조사 범위: ${dateRange}]

[참고: 현재 시스템 상태]
${currentRankingContext === "현재 등록된 툴이 없습니다." ? "현재 DB가 비어있습니다. ChatGPT, Claude, Gemini, Midjourney 등 업계 표준 도구와 최근 급부상한 툴들을 우선적으로 배치하여 랭킹을 구성하세요." : `현재 TOP 100 리스트:\n${currentRankingContext}`}

**[중요 임무: ${range} 정밀 분석 및 랭킹 생성]**
위 정보를 바탕으로 하되, 실시간 웹 검색을 통해 해당 순위 구간(${range})의 총 10개 도구들에 대해 아래 사항을 전수 조사하세요.

1. **상세 분석**: 각 도구의 최근 트래픽 동향, 신규 기능 업데이트 소식, Reddit/X(Twitter)에서의 소셜 버즈, 최신 벤치마크 순위를 확인하세요. 
2. **상대적 점수 산정**: 가중치(이용량 35%, 기술 25%, 버즈 20%, 실무 15%, 상승률 5%)에 따라 0.0~100.0 사이의 Total_Score를 산출하세요. 정확한 수치가 없다면 시장 파급력과 인지도를 바탕으로 한 '분석가적 추정 점수'를 부여하세요.
3. **엄격한 필터링**: 누구나 쓸 수 있는 '글로벌 상용 서비스'만 포함하세요.
4. **결과 보장**: 어떤 경우에도 아래 JSON 형식을 반드시 출력해야 하며, 데이터가 부족하다는 이유로 설명을 나열하거나 거부해서는 안 됩니다.

**[출력 데이터 규격]**
반드시 아래 필드를 포함한 JSON 배열만 출력하세요 (10개 항목). 다른 텍스트(부연 설명 등)는 일절 쓰지 마세요.
[
  {
    "Rank": 해당 순위 숫자,
    "Change": "NEW" 또는 "+N", "-N", "0",
    "Name": "도구명",
    "URL": "공식 URL",
    "Category": "text/image/video/audio/code/agent/etc 중 택1",
    "Tags": ["핵심기능1", "태그2", "태그3"],
    "Description": "현재 시점의 핵심 가치와 최근 소식이 반영된 상세 설명 (3문장 내외, 한국어)",
    "One_Line_Review": "사용자가 반드시 써야 할 결정적 이유 (한국어)",
    "USP": "경쟁사 대비 가장 강력한 기술적 차별점",
    "Pros_Cons": { "pros": ["장점1", "장점2"], "cons": ["단점1"] },
    "Difficulty": "초급/중급/고급",
    "Usage_Score": 0~100 실수,
    "Tech_Score": 0~100 실수,
    "Buzz_Score": 0~100 실수,
    "Utility_Score": 0~100 실수,
    "Growth_Score": 0~100 실수,
    "Total_Score": 가중치 합산 총점,
    "Pricing": "Free/Freemium/Paid",
    "Korean_Support": "Y/N",
    "Platform": ["Web", "iOS", "Android", "Desktop" 등],
    "API_Available": "Y/N",
    "Latest_Update": "최근 1개월 내 주요 업데이트 (구체적 내용)",
    "Free_Tier_Limit": "무료 플랜 제약 조건"
  }
]`;

  if (isRetry) {
    console.log(`   ⚠️ [Retry ${retryCount}] ${range} 완화된 프롬프트로 재시도 중...`);
  } else {
    console.log(`🤖 [Ranking Agent] ${range} 정밀 분석 중 (Perplexity sonar-pro)...`);
  }

  const text = await askPerplexity(systemPrompt, userPrompt);

  try {
    const rawChunk = extractJsonArray(text);
    
    // 데이터 정규화 및 유효성 검사
    const chunk = rawChunk.map(item => {
      // 키 대소문자 정규화 (Rank, Name, URL 등)
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
    }).filter(item => item.Name && item.Rank); // 이름과 순위가 있는 것만 포함

    console.log(`   ✅ ${range}: ${chunk.length}개 항목 유효성 검증 완료`);
    return chunk;
  } catch (err) {
    if (retryCount < 2) {
      return fetchRankingChunk(range, weekLabel, dateRange, currentRankingContext, retryCount + 1);
    }
    console.error(`\n❌ [치명적 오류]: ${range} 3회 시도 모두 실패!`);
    console.error(`=== Perplexity 응답 원본 데이터 ===\n${text}\n=================================\n`);
    return []; // 실패 시 빈 배열 반환하여 전체 중단 방지
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
