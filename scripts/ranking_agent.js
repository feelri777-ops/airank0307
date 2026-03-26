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

// --- 핵심 로직: 10개 단위 정밀 호출 ---
async function fetchRankingChunk(range, weekLabel, dateRange, currentRankingContext) {
  const systemPrompt = `당신은 세계 최고의 AI 기술 분석가이자 시장 조사 전문가입니다. 실시간 웹 검색(Similarweb, LMSYS, GitHub, SNS 등)을 통해 [${range}]에 해당하는 도구들의 최신 지표를 상세히 조사하고 객관적인 랭킹을 생성하세요.`;

  const userPrompt = `[목표 주차: ${weekLabel}] / [조사 범위: ${dateRange}]

[현재 TOP 100 상황 (참고)]
${currentRankingContext}

**[중요 임무: ${range} 정밀 분석 및 랭킹 생성]**
위 [현재 TOP 100] 정보를 바탕으로 하되, 실시간 웹 검색을 통해 해당 순위 구간(${range})의 총 10개 도구들에 대해 아래 사항을 전수 조사하세요.

1. **상세 분석**: 각 도구의 최근 7일간의 트래픽 증감, 신규 기능 업데이트 소식, Reddit/X(Twitter)에서의 소셜 버즈, 최신 벤치마크 순위를 정밀하게 확인하세요. 
2. **순위 재배치**: 급부상 중인 툴은 순위를 올리거나 NEW로 진입시키고, 하락세인 툴은 점수를 깎아 순위를 하향 조정하세요.
3. **엄격한 필터링**: 누구나 쓸 수 있는 '글로벌 상용 서비스'만 포함하세요. (사내용, 특정 기관 전용, 단순 뉴스 보도용 제품은 절대 제외)
4. **점수 산정**: 가중치(이용량 35%, 기술 25%, 버즈 20%, 실무 15%, 상승률 5%)에 따라 0.0~100.0 사이의 정밀한 Total_Score를 산출하세요.

**[출력 데이터 규격]**
반드시 아래 필드를 포함한 JSON 배열만 출력하세요 (10개 항목). 다른 텍스트는 일절 쓰지 마세요.
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

  console.log(`🤖 [Ranking Agent] ${range} 정밀 분석 중 (Perplexity sonar-pro)...`);
  const text = await askPerplexity(systemPrompt, userPrompt);

  try {
    const chunk = extractJsonArray(text);
    console.log(`   ✅ ${range}: ${chunk.length}개 항목 수집 완료`);
    return chunk;
  } catch (err) {
    console.error(`\n❌ [치명적 오류]: ${range} JSON 파싱 실패!`);
    console.error(`=== Perplexity 응답 원본 데이터 ===\n${text}\n=================================\n`);
    throw err;
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
