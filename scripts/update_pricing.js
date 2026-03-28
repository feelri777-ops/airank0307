import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRICING_JSON_PATH = path.join(__dirname, '..', 'public', 'pricing-data.json');

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

// ========================================
// 2. 결제 플랜(Pricing) 추출 함수 (다중 모델 시도)
// ========================================
async function generatePricingInfo(toolChunk) {
  const modelsToTry = [
    "gemini-3-flash-preview", 
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash", 
    "gemini-1.5-pro", 
    "gemini-pro", 
    "models/gemini-1.5-flash", 
    "models/gemini-pro"
  ];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `AI 도구 전문가로서 아래 도구들의 결제 플랜(Pricing)을 추출하세요. 
대상: ${toolChunk.map(t => `${t.name} (${t.url})`).join(', ')}
형식: JSON [{ "id": "툴ID", "pricing": [{ "planName": "Free", "price": "0", "billing": "Free Forever", "features": ["..."] }] }]
상세 설명은 한글로, 플랜명은 영문으로 작성하세요.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (e) {
      lastError = e;
      console.log(`  - ${modelName} 시도 실패: ${e.message.substring(0, 100)}...`);
      continue;
    }
  }

  console.error("❌ 모든 Gemini 모델 시도 실패:", lastError?.message);
  return [];
}

// ========================================
// 3. 메인 실행 로직
// ========================================
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const limit = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || 100;
  const allPricingUpdates = [];
  
  console.log(`🚀 Firestore 툴 결제 플랜 자동 수집 시작... (상위 ${limit}개, ${isDryRun ? "시뮬레이션 모드" : "실제 업데이트 모드"})`);

  try {
    const snapshot = await db.collection("tools").orderBy("score", "desc").limit(Number(limit)).get();
    const allTools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ 총 ${allTools.length}개의 툴을 대상으로 작업을 시작합니다.`);

    const batchSize = 5;
    for (let i = 0; i < allTools.length; i += batchSize) {
      const chunk = allTools.slice(i, i + batchSize);
      console.log(`📡 [${i + 1}~${Math.min(i + batchSize, allTools.length)}] 구간 결제 플랜 분석 중...`);

      const updatesByAI = await generatePricingInfo(chunk);
      allPricingUpdates.push(...updatesByAI);

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
      
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!isDryRun) {
      try {
        const existingData = fs.existsSync(PRICING_JSON_PATH) 
          ? JSON.parse(fs.readFileSync(PRICING_JSON_PATH, 'utf8')) 
          : {};
        
        const mergedData = { ...existingData };
        allPricingUpdates.forEach(u => {
          mergedData[u.id] = u.pricing;
        });

        const publicDir = path.dirname(PRICING_JSON_PATH);
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        fs.writeFileSync(PRICING_JSON_PATH, JSON.stringify(mergedData, null, 2));
        console.log(`\n💾 로컬 캐시 JSON 저장 완료 : ${PRICING_JSON_PATH}`);
      } catch (err) {
        console.error("❌ JSON 파일 저장 실패:", err);
      }
    }

    console.log(`\n🎉 결제 플랜 업데이트가 완료되었습니다! ${isDryRun ? "" : "(실제 DB 업데이트 수행됨)"}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

main();
