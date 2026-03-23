import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. Firebase Admin 초기화 ---
function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();
  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  throw new Error("⚠️ Firebase 인증 정보를 찾을 수 없습니다.");
}

// .env 로드
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const app = initializeFirebase();
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);

async function runToolScout() {
  try {
    console.log("🔍 [Tool Scout Agent] 전체 툴 통합 분석을 시작합니다...");
    
    const toolsSnap = await db.collection("tools").get();
    if (toolsSnap.empty) {
      console.log("⚠️ 등록된 툴이 하나도 없습니다.");
      return;
    }
    const tools = toolsSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
    console.log(`🤖 총 ${tools.length}개의 툴을 분석하여 단일 보고서로 통합합니다.`);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      tools: [{ google_search: {} }] 
    });

    const allErrors = [];
    const allUpdates = [];

    // 10개씩 배치 처리
    for (let i = 0; i < tools.length; i += 10) {
      const batch = tools.slice(i, i + 10);
      const progress = Math.round(((i + batch.length) / tools.length) * 100);
      process.stdout.write(`\r🚀 분석 진행률: ${progress}% (${i + batch.length}/${tools.length})...`);

      const prompt = `
        너는 AI 툴 관리 에이전트야. 다음 10개의 AI 도구 정보를 점검해줘.
        
        [도구 리스트]
        ${batch.map(t => `- ID: ${t.docId}, 이름: ${t.name}, URL: ${t.url}, 현설명: ${t.desc}, 카테고리: ${t.cat}, 현재태그: ${Array.isArray(t.tags) ? t.tags.join(",") : ""}`).join("\n")}

        [수행 작업]
        1. 구글검색으로 URL 유효성 확인 및 이전 여부 확인.
        2. 실제 기능과 '현설명' 비교 후 오류/오타 감지.
        3. 최근 1주일 내의 새 모델 출시 등 중요 업데이트 확인.
        4. 현재 '카테고리'가 도구의 주 기능에 적합한지 판단 (부적합 시 추천 카테고리 제시).
        5. 도구의 새로운 기능을 반영한 '추천 태그' (3~5개) 도출.

        [보고 형식]
        JSON 코드로만 대답해.
        {
          "errors": [{"docId": "id", "toolName": "name", "issue": "오류내용", "suggestedFix": "수정안"}],
          "updates": [
            {
              "docId": "id", 
              "toolName": "name", 
              "content": "업데이트 요약", 
              "suggestedCat": "추천 카테고리(필요시)", 
              "suggestedTags": ["태그1", "태그2"]
            }
          ]
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanJson = responseText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        if (parsed.errors) allErrors.push(...parsed.errors);
        if (parsed.updates) allUpdates.push(...parsed.updates);

      } catch (e) {
        console.error(`\n❌ [${i}번 묶음] 분석 중 오류:`, e.message);
      }
    }

    console.log("\n\n✅ 모든 분석 완료! 통합 보고서를 생성합니다...");

    // 단일 보고서 생성
    const finalReport = {
      type: "tool_scout_full", // 통합 리포트 타입
      summary: `[통합 분석] ${tools.length}개 도구 점검 완료 (오류 ${allErrors.length}건, 업데이트 ${allUpdates.length}건)`,
      data: {
        errors: allErrors,
        updates: allUpdates,
        totalChecked: tools.length,
        runAt: admin.firestore.FieldValue.serverTimestamp()
      },
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("adminReports").add(finalReport);
    console.log("🏆 전체 툴 통합 보고서가 Firestore에 성공적으로 저장되었습니다!");

  } catch (error) {
    console.error("❌ 에이전트 구동 중 치명적 오류:", error);
  }
}

runToolScout().catch(console.error);
