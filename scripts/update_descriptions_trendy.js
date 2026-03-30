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
// 2. 공대생/개발자 스타일 설명 생성 함수
// ========================================
async function generateGeekyReviews(toolChunk) {
  const prompt = `당신은 SOTA 기술과 효율성을 추구하는 'AI밖에 모르는 천재 공대생'입니다. 
아래 AI 도구들의 '한 줄 리뷰'와 '상세 설명'을 해당 페르소나의 말투로 전문적이면서도 열정적으로 수정해 주세요.

[페르소나 가이드라인]
1. 말투: '~인 듯', '~함', '~임' 등의 담백하면서도 기술적 확신이 느껴지는 어미 사용.
2. 키워드: SOTA, 레이턴시, 아키텍처, 인퍼런스, 멀티모달, 프롬프트 엔지니어링, 벡터 DB, 모델 성능, 생산성 한계 돌파 등 기술적 용어 적절히 융합.
3. 이모지 금지. 
4. 너무 진지하기보다는 본인이 감탄해서 쓴 듯한 '덕후' 느낌 한 스푼 추가 (예: "성능 미쳤음", "속도 체감 됨", "이건 혁명임").
5. 기존의 '갓생', '치트키' 같은 너무 흔한 마케팅 용어는 지양할 것.

[대상 툴 목록]
${toolChunk.map(t => `- ID: ${t.id}, 이름: ${t.name}, 현재 한 줄: ${t.oneLineReview || ""}, 현재 상세: ${t.desc || ""}`).join('\n')}

[출력 형식]
반드시 아래 JSON 배열 형식으로만 대답하세요:
[{ "id": "툴ID", "newReview": "수정된 한 줄 리뷰 (25~45자)", "newDesc": "수정된 상세 설명 (80~120자)" }]
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

      const updates = await generateGeekyReviews(chunk);

      const batch = db.batch();
      for (const update of updates) {
          const originalTool = chunk.find(c => c.id === update.id);
          if (originalTool && (update.newReview || update.newDesc)) {
              const ref = db.collection("tools").doc(update.id);
              const data = {};
              if (update.newReview) data.oneLineReview = update.newReview;
              if (update.newDesc) data.desc = update.newDesc;
              batch.update(ref, data);
          } else if (update.id) {
              console.log(`  ⚠️  건너뜀: ID 미일치 (${update.id})`);
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
