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
// 2. 한글 이름 생성 함수
// ========================================
async function generateKoreanNames(toolChunk) {
  const prompt = `당신은 AI 도구 전문가입니다. 아래 도구들의 영어 이름을 보고, 한국 사용자들이 주로 검색하는 한글 발음 및 별칭들을 모두 생성해 주세요.

[규칙]
1. 한글 표기법뿐만 아니라, 가장 대중적인 발음과 약칭들을 쉼표로 나열하세요.
2. 예: ChatGPT -> 챗GPT, 챗지피티, GPT4, 지피티
3. 예: Midjourney -> 미드저니, 미드전이, 엠제이
4. 예: Claude -> 클로드, 앤스로픽 챗봇

[대상 툴 목록]
${toolChunk.map(t => `- ID: ${t.id}, 영어이름: ${t.name}`).join('\n')}

[출력 형식]
JSON 형식으로만 대답하세요. 예: [{ "id": "툴ID", "nameKo": "챗GPT, 챗지피티" }]
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
  console.log("🚀 Firestore 모든 툴에 한글 이름(nameKo) 데이터 보강 시작...");

  try {
    const snapshot = await db.collection("tools").get();
    const allTools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ 총 ${allTools.length}개의 툴을 처리합니다.`);

    const batchSize = 20;
    for (let i = 0; i < allTools.length; i += batchSize) {
      const chunk = allTools.slice(i, i + batchSize);
      console.log(`📡 [${i + 1}~${Math.min(i + batchSize, allTools.length)}] 구간 처리 중...`);

      const updates = await generateKoreanNames(chunk);

      const batch = db.batch();
      for (const update of updates) {
          if (update.id && update.nameKo) {
              const ref = db.collection("tools").doc(update.id);
              batch.update(ref, { nameKo: update.nameKo });
              console.log(`  - ${update.id} -> ${update.nameKo}`);
          }
      }
      await batch.commit();
      console.log(`✨ [${i + 1}~${Math.min(i + batchSize, allTools.length)}] 업데이트 완료!`);
      
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log("\n🎉 모든 툴에 한글 이름 데이터가 성공적으로 보충되었습니다!");
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

main();
