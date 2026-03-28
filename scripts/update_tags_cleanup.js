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

// 명시적으로 Firebase 앱 초기화 여부 확인
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')))
  });
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// ========================================
// 2. 핵심 태그(3개) 추출 함수
// ========================================
async function generateSmartTags(toolChunk) {
  const prompt = `당신은 AI 도구 데이터베이스를 관리하는 시니어 데이터 엔지니어입니다.
아래 AI 도구들의 '명칭'과 '설명'을 분석하여, 각 도구를 가장 잘 나타내는 **핵심 태그 3가지**를 추출해 주세요.

[태그 작성 규칙]
1. 개수: 반드시 툴 당 **딱 3개**만 추출하세요.
2. 언어: 'LLM', 'SEO', 'API', 'SOTA', 'RAG', 'Prompt', 'GPT', 'UI' 등 전문적인 기술 용어는 **영문**으로 표기하고, 일반적인 기능이나 목적은 **한글**로 작성하세요. (예: 챗봇, 이미지생성)
3. 순서: 가장 중요한 특징이 첫 번째 태그(Index 0)가 되도록 배치하세요. (이 태그는 UI에서 테마 색상으로 하이라이트됩니다.)
4. 내용: 변별력 없는 공통 단어(AI, 도구 등)는 제외하고, 실제 사용자 경험에 도움되는 키워드로 구성하세요.

[대상 툴 목록]
${toolChunk.map(t => `- ID: ${t.id}, 이름: ${t.name}, 설명: ${t.desc || t.oneLineReview || ""}`).join('\n')}

[출력 형식]
반드시 아래 JSON 배열 형식으로만 대답하세요:
[{ "id": "툴ID", "newTags": ["첫번째핵심태그", "두번째태그", "세번째태그"] }]
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
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`🚀 Firestore 툴 태그 정합성 클리닝 시작... (${isDryRun ? "시뮬레이션 모드" : "실제 업데이트 모드"})`);

  try {
    const snapshot = await db.collection("tools").get();
    const allTools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ 총 ${allTools.length}개의 툴을 대상으로 작업을 시작합니다.`);

    const batchSize = 10;
    for (let i = 0; i < allTools.length; i += batchSize) {
      const chunk = allTools.slice(i, i + batchSize);
      console.log(`📡 [${i + 1}~${Math.min(i + batchSize, allTools.length)}] 구간 AI 분석 중...`);

      const updatesByAI = await generateSmartTags(chunk);

      if (!isDryRun) {
        const batch = db.batch();
        let upCount = 0;
        for (const update of updatesByAI) {
            if (update.id && Array.isArray(update.newTags) && update.newTags.length === 3) {
                const ref = db.collection("tools").doc(update.id);
                batch.update(ref, { 
                  tags: update.newTags,
                  last_tags_cleanup: new Date().toISOString()
                });
                upCount++;
            }
        }
        if (upCount > 0) {
          await batch.commit();
          console.log(`✨ [${i + 1}~${Math.min(i + batchSize, allTools.length)}] ${upCount}개 툴 실제 업데이트 완료!`);
        }
      } else {
        console.log("📝 시뮬레이션 결과:");
        updatesByAI.forEach(up => {
          const t = chunk.find(c => c.id === up.id);
          if (t) console.log(`  - [${t.name}] : ${JSON.stringify(up.newTags)}`);
        });
      }
      
      // API 할당량 초과 방지
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n🎉 작업이 완료되었습니다! ${isDryRun ? "" : "(실제 DB 업데이트 수행됨)"}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

main();
