import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey || apiKey.length < 10) {
  console.error("❌ [치명적 오류]: 유효한 GEMINI API 키가 환경 변수에 설정되지 않았습니다.");
  console.error("💡 해결방법: GitHub Repository -> Settings -> Secrets and variables -> Actions 에 들어가서 'GEMINI_API_KEY' 라는 이름으로 구글 제미나이 API 키를 등록해주세요.");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

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
  const day = now.getDay() || 7; // 월=1 ... 일=7
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - day);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `${fmt(lastMonday)} ~ ${fmt(lastSunday)}`;
}

// --- JSON 클렌징: AI 응답에서 순수 JSON 배열만 추출 ---
function extractJsonArray(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  // 배열 시작/끝 위치 추출
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error("JSON 배열을 찾을 수 없습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// --- 핵심 로직: 1~50위, 51~100위 분할 호출 ---
async function fetchRankingChunk(model, range, weekLabel, dateRange) {
  const prompt = `
당신은 글로벌 AI 툴 정밀 평가 에이전트입니다.
현재 시스템의 랭킹 목표 주차는 '${weekLabel}'입니다.
반드시 google_search를 활용하여 [${dateRange}] (월요일 ~ 일요일 7일간) 동안 발생한 최신 데이터를 우선적으로 수집하되, 만약 특정 툴의 해당 주차 데이터가 부족하더라도 가장 최신의 가용 데이터를 활용하여 **반드시 누락 없이 50개의 목록을 채우세요**. "데이터를 찾을 수 없습니다" 등의 대화형 응답은 절대 금지합니다.

**[중요 지시사항]**
이번 호출에서는 전체 100위 중 **[${range}]**에 해당하는 50개의 툴 랭킹만 생성해야 합니다. 
반드시 JSON 객체의 "Rank" 값을 ${range} 범위에 맞게 (예: 1~50 또는 51~100) 정확히 배정하세요.

[알고리즘 가중치]
- 이용량(35%): [${dateRange}] 기간의 Similarweb 트래픽 및 증감 데이터
- 기술력(25%): [${dateRange}] 기간 중 업데이트된 핵심 벤치마크(LMSYS 등) 순위 변동 및 기술 혁신 뉴스
- 버즈량(20%): [${dateRange}] 7일간 X/Reddit/Product Hunt 등 소셜 미디어/테크 커뮤니티 언급 빈도
- 실무가치(15%): [${dateRange}] 기간 동안 새롭게 파악된 B2B 채택 및 업무 효율화 사례
- 상승률(5%): 직전 주간 대비 [${dateRange}] 주간의 급성장(Growth) 지표

[데이터 소스 참고]
Similarweb 트래픽, LMSYS Chatbot Arena 순위, Product Hunt 트렌드, GitHub Stars, X/Reddit 버즈

[출력 규격]
반드시 아래 필드를 모두 포함한 JSON 배열만 출력하세요. 다른 텍스트는 일절 쓰지 마세요.
[
  {
    "Rank": 1,
    "Change": "NEW",
    "Name": "도구명",
    "URL": "https://...",
    "Category": "카테고리(text/image/video/audio/code/agent/etc 중 하나)",
    "Tags": ["태그1", "태그2", "태그3"],
    "Description": "상세 설명 (2-3문장)",
    "One_Line_Review": "한줄평",
    "USP": "핵심 차별점",
    "Pros_Cons": { "pros": ["장점1", "장점2"], "cons": ["단점1"] },
    "Difficulty": "초급/중급/고급 중 하나",
    "Usage_Score": 85.0,
    "Tech_Score": 78.0,
    "Buzz_Score": 92.0,
    "Utility_Score": 80.0,
    "Growth_Score": 75.0,
    "Total_Score": 84.5,
    "Pricing": "Free/Freemium/Paid 중 하나",
    "Korean_Support": "Y/N 중 하나",
    "Platform": ["Web", "iOS", "Android", "Desktop"] 중 해당하는 것들
  }
]
`;

  console.log(`🤖 [Ranking Agent] ${range} 호출 중...`);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  try {
    const chunk = extractJsonArray(text);
    console.log(`✅ ${range}: ${chunk.length}개 항목 수신 완료`);
    return chunk;
  } catch (err) {
    console.error(`\n❌ [치명적 오류]: ${range} JSON 파싱 실패!`);
    console.error(`=== 제미나이 응답 원본 데이터 ===\n${text}\n=================================\n`);
    throw err;
  }
}

async function runRankingAgent() {
  try {
    const weekLabel = getWeekLabel();
    const dateRange = getSearchDateRange();
    console.log(`\n🚀 [Ranking Agent] ${weekLabel} (${dateRange} 기준) 글로벌 AI 툴 랭킹 생성 시작...\n`);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ google_search: {} }]
    });

    // 2회 분할 호출 (응답 잘림 방지)
    const [chunk1, chunk2] = await Promise.all([
      fetchRankingChunk(model, "1위부터 50위", weekLabel, dateRange),
      fetchRankingChunk(model, "51위부터 100위", weekLabel, dateRange),
    ]);

    const allTools = [...chunk1, ...chunk2];
    console.log(`\n📊 총 ${allTools.length}개 도구 수집 완료`);

    // Firestore adminReports에 pending 상태로 저장 (바로 반영 X)
    const reportRef = await db.collection("adminReports").add({
      type: "ranking_update",
      summary: `[${weekLabel}] 글로벌 AI 툴 랭킹 갱신 제안 (100개)`,
      data: {
        tools: allTools,
        weekLabel,
        totalCount: allTools.length,
        generatedAt: new Date().toISOString(),
      },
      status: "pending",   // ← 관리자 컨펌 전까지 반영 안 됨
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n🏆 [완료] adminReports에 pending 보고서 저장: ${reportRef.id}`);
    console.log(`   ⚠️  관리자 에이전트 제어실에서 최종 컨펌 후 랭킹이 갱신됩니다.\n`);

  } catch (error) {
    console.error("❌ Ranking Agent 오류:", error);
    process.exit(1);
  }
}

runRankingAgent();
