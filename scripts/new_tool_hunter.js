import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';

// --- 0. 환경 변수 로드 ---
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

// --- 1. Firebase Admin 초기화 ---
function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();
  const scPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(scPath, 'utf8'))) });
}

const db = initializeFirebase().firestore();
const normalizeUrl = (u) => (u||"").replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "").toLowerCase();

async function runNewToolHunter() {
  try {
    console.log("🚀 [Hunter 3.1 Metered] 토큰 계량기 탑재 및 발굴 개시...");
    const genAI = new GoogleGenerativeAI(API_KEY);

    // 3.1 세대 전용 회선 (유일한 작동 모델)
    const model = genAI.getGenerativeModel(
      { model: "gemini-3.1-flash-image-preview" },
      { apiVersion: 'v1beta' }
    );

    // 1. 기존 도구 메타데이터
    const exSnap = await db.collection("tools").get();
    const existing = exSnap.docs.map(doc => {
      const d = doc.data();
      return {
        plainName: (d.name || "").toLowerCase().replace(/\s+/g, ''),
        domain: normalizeUrl(d.url)
      };
    });

    const prompt = `베타 테스터의 눈으로 무명에 가까운 초신성 AI 도구 7~10개를 발굴해줘. 
    메이저 툴(Notion, Canva, Gamma 등)은 절대 금지. 
    갓 출시된 제품 위주로 한국어로 소개해.
    [JSON 포맷]: {"recommendations": [{"name": "도구명", "url": "URL", "desc": "요약", "cat": "카테고리", "reason": "이유", "tags": "태그"}]}`;

    console.log("🧠 3.1 세대 엔진이 정밀 스캔 중...");
    const result = await model.generateContent(prompt);
    
    // --- 🚨 토큰 자원 계측 🚨 ---
    const usage = result.response.usageMetadata;
    console.log("📊 [토큰 계량판] ------------------");
    console.log(`🔹 입력 토큰: ${usage.promptTokenCount}`);
    console.log(`🔹 출력 토큰: ${usage.candidatesTokenCount}`);
    console.log(`🔸 총 합계: ${usage.totalTokenCount}`);
    console.log("---------------------------------");

    let rawResult = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(rawResult);

    // 2. 초정밀 Fuzzy 필터링
    const filtered = (parsed.recommendations || []).filter(tool => {
      const nName = tool.name.toLowerCase().replace(/\s+/g, '');
      const nDomain = normalizeUrl(tool.url);
      const conflict = existing.some(ex => 
        ex.plainName.includes(nName) || nName.includes(ex.plainName) ||
        (ex.domain !== "" && nDomain !== "" && (ex.domain.includes(nDomain) || nDomain.includes(ex.domain)))
      );
      return !conflict;
    });

    if (filtered.length === 0) return console.log("⚠️ 새로운 발굴품이 없습니다.");

    console.log(`✅ 최종 ${filtered.length}개 보물 보고서 작성 완료!`);

    await db.collection("adminReports").add({
      type: "new_tool_recommendation",
      summary: `[3.1 계량 발굴] ${filtered.length}개의 신생 AI 상장 제안`,
      data: { 
        recommendations: filtered, 
        runAt: new Date(),
        tokenUsage: {
          prompt: usage.promptTokenCount,
          candidates: usage.candidatesTokenCount,
          total: usage.totalTokenCount
        }
      },
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("🏆 토큰 데이터가 포함된 정밀 보고서가 전송되었습니다!");

  } catch (error) {
    console.error("❌ 정계량 발굴 실패:", error);
  }
}

runNewToolHunter();
