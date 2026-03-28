import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// 1. Firebase 및 Gemini 초기화
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

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY가 없습니다.");
  process.exit(1);
}

const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error("❌ serviceAccountKey.json을 찾을 수 없습니다.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')))
});

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// ========================================
// 2. 트렌디한 설명 생성 함수
// ========================================
async function generateTrendyReviews(toolChunk) {
  const prompt = `당신은 20-30대 트렌드에 민감한 AI 도구 마케터입니다. 아래 AI 도구들의 기존 '한 줄 리뷰'를 2030 세대의 '힙한' 말투로 길고 상세하게 수정해 주세요.

[규칙]
1. 말투는 '~임', '~함', '~함' 등의 담백하면서도 힙한 종결 어미 사용.
2. '갓생', '치트키', '못 참지', '국밥', '육각형', '손해임', '닥치고 씀' 같은 요즘 유행어 활용.
3. 이모지는 절대 사용하지 마세요.
4. 각 리뷰는 25~45자 내외로 기존보다 상세하게 작성할 것.
5. 반드시 원본의 의미(툴의 실제 기능)는 정확하게 유지할 것.

[대상 툴 목록]
${toolChunk.map(t => `- ID: ${t.id}, 이름: ${t.name}, 기존 설명: ${t.oneLineReview || t.desc}`).join('\n')}

[출력 형식]
JSON 형식으로만 대답하세요. 예: [{ "id": "툴ID", "newReview": "수정된 설명" }]
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("❌ Gemini 생성 실패:", e.message);
    return [];
  }
}

// ========================================
// 3. 메인 실행 로직
// ========================================
async function main() {
  console.log("🚀 Firestore 툴 설명 업데이트 시작 (Trendy & No Emoji)...");

  try {
    const snapshot = await db.collection("tools").get();
    const allTools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ 총 ${allTools.length}개의 툴을 찾았습니다.`);

    const batchSize = 10;
    for (let i = 0; i < allTools.length; i += batchSize) {
      const chunk = allTools.slice(i, i + batchSize);
      console.log(`📡 [${i + 1}~${Math.min(i + batchSize, allTools.length)}] 구간 처리 중...`);

      const updates = await generateTrendyReviews(chunk);

      const batch = db.batch();
      for (const update of updates) {
          if (update.id && update.newReview) {
              const ref = db.collection("tools").doc(update.id);
              batch.update(ref, { oneLineReview: update.newReview });
          }
      }
      await batch.commit();
      console.log(`✨ [${i + 1}~${Math.min(i + batchSize, allTools.length)}] 업데이트 완료!`);
      
      // Rate limiting 방지
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log("\n🎉 모든 툴 설명이 요즘 스타일로 업데이트되었습니다!");
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

main();
