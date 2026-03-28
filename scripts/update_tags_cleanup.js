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

// Firebase 초기화 로직 개선 (GitHub Actions 지원)
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
// 2. 핵심 태그(3개) 추출 함수 (다중 모델 시도)
// ========================================
async function generateSmartTags(toolChunk) {
  const modelsToTry = ["gemini-3-flash-preview", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "models/gemini-1.5-flash", "models/gemini-pro"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `AI 도구의 핵심 태그 3가지(분별력 있는 한글/영문 전문 용어)를 JSON 배열 [{ "id": "툴ID", "newTags": ["태그1", "태그2", "태그3"] }] 형식으로 추출하세요.
대상: ${toolChunk.map(t => `${t.name}: ${t.desc || ""}`).join(', ')}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // JSON 배열 패턴([...])만 명확하게 추출 (앞뒤 텍스트 무시)
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const cleanedText = jsonMatch ? jsonMatch[0] : text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      return JSON.parse(cleanedText);
    } catch (e) {
      lastError = e;
      console.log(`  - ${modelName} 시도 실패: ${e.message.substring(0, 50)}...`);
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
