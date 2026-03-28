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

if (admin.apps.length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
    } else {
      console.error("❌ Firebase 인증 키를 찾을 수 없습니다.");
      process.exit(1);
    }
  }
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 최신 모델 사용

// ========================================
// 2. 결제 플랜(Pricing) 추출 함수
// ========================================
async function generatePricingInfo(toolChunk) {
  const prompt = `당신은 AI 도구 시장 분석 전문가입니다.
아래 AI 도구들의 '명칭', '설명', 'URL'을 분석하여, 각 도구의 현재 **결제 플랜(Pricing Plans)** 정보를 추출해 주세요.

[분석 규칙]
1. 플랜 개수: 도구 당 2~3개 (예: Free, Pro, Team/Enterprise)
2. 언어: 플랜 명칭(Free, Pro 등)은 **영문**으로, 상세 기능 설명은 **한글**로 작성하세요.
3. 가격: 가급적 달러($) 기준으로 표기하되, 무료인 경우 '0'으로 표기하세요.
4. 특징: 각 플랜별 핵심 혜택을 2~3가지 핵심 키워드로 추출하세요.
5. 최신성: 2024~2025년 기준 공식 홈페이지 정보를 바탕으로 추론하세요. 정확한 정보를 모를 경우 'Free'와 보편적인 'Pro' 플랜으로 구성하세요.

[대상 툴 목록]
${toolChunk.map(t => `- ID: ${t.id}, 이름: ${t.name}, URL: ${t.url || ""}, 설명: ${t.desc || t.oneLineReview || ""}`).join('\n')}

[출력 형식]
반드시 아래 JSON 배열 형식으로만 대답하세요:
[{ 
  "id": "툴ID", 
  "pricing": [
    { "planName": "Free", "price": "0", "billing": "Free Forever", "features": ["기본 기능", "제한된 사용량"] },
    { "planName": "Pro", "price": "20", "billing": "per month", "features": ["고급 기능", "우선 순위 지원"] }
  ]
}]
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
  const limit = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || 100;
  
  console.log(`🚀 Firestore 툴 결제 플랜 자동 수집 시작... (상위 ${limit}개, ${isDryRun ? "시뮬레이션 모드" : "실제 업데이트 모드"})`);

  try {
    const snapshot = await db.collection("tools").orderBy("score", "desc").limit(Number(limit)).get();
    const allTools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ 총 ${allTools.length}개의 툴을 대상으로 작업을 시작합니다.`);

    const batchSize = 5; // 가격 정보는 더 복잡하므로 청크 사이즈를 줄임
    for (let i = 0; i < allTools.length; i += batchSize) {
      const chunk = allTools.slice(i, i + batchSize);
      console.log(`📡 [${i + 1}~${Math.min(i + batchSize, allTools.length)}] 구간 결제 플랜 분석 중...`);

      const updatesByAI = await generatePricingInfo(chunk);

      if (!isDryRun) {
        const batch = db.batch();
        let upCount = 0;
        for (const update of updatesByAI) {
            if (update.id && Array.isArray(update.pricing)) {
                const ref = db.collection("tools").doc(update.id);
                batch.update(ref, { 
                  pricing: update.pricing,
                  last_pricing_update: new Date().toISOString()
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
          if (t) console.log(`  - [${t.name}] : ${up.pricing.map(p => p.planName).join(', ')}`);
        });
      }
      
      // API 할당량 초과 방지
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n🎉 결제 플랜 업데이트가 완료되었습니다! ${isDryRun ? "" : "(실제 DB 업데이트 수행됨)"}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

main();
