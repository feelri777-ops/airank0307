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
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);

// --- 날짜 헬퍼 ---
function getWeekLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const week = Math.ceil(now.getDate() / 7);
  return `${year}년 ${month}월 ${week}주차`;
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
async function fetchRankingChunk(model, range, weekLabel) {
  const prompt = `
당신은 글로벌 AI 툴 정밀 평가 에이전트입니다.
현재 시스템의 기준 시간은 '${weekLabel}'(실행 시점)입니다.
반드시 google_search를 활용하여 최근 1개월 내의 최신 신뢰할 수 있는 데이터를 수집하고,
아래 알고리즘 가중치를 철저히 적용하여 글로벌 AI 툴 ${range} 랭킹을 생성하세요.

[알고리즘 가중치]
- 이용량(35%): 최근 1개월간의 Similarweb 트래픽, MAU, 트래픽 증감률
- 기술력(25%): 최신 LMSYS Chatbot Arena 순위, GitHub 커밋 활성도, 기술적 혁신성
- 버즈량(20%): 최근 2주간 X/Reddit/Product Hunt 등 소셜 미디어/테크 커뮤니티 언급 빈도
- 실무가치(15%): 실제 B2B 채택 및 업무 효율화 실사용 사례 비중
- 상승률(5%): 전월 또는 전주 대비 사용자 및 검색량 성장(Growth) 지표

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
  const chunk = extractJsonArray(text);
  console.log(`✅ ${range}: ${chunk.length}개 항목 수신`);
  return chunk;
}

async function runRankingAgent() {
  try {
    const weekLabel = getWeekLabel();
    console.log(`\n🚀 [Ranking Agent] ${weekLabel} 글로벌 AI 툴 랭킹 생성 시작...\n`);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ google_search: {} }]
    });

    // 2회 분할 호출 (응답 잘림 방지)
    const [chunk1, chunk2] = await Promise.all([
      fetchRankingChunk(model, "1위부터 50위", weekLabel),
      fetchRankingChunk(model, "51위부터 100위", weekLabel),
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
