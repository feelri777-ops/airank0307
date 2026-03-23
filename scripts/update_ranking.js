import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

// --- 0. Firebase 초기화 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return null;
}

const app = initializeFirebase();
const db = app ? admin.firestore() : null;

async function syncScores() {
  if (!db) {
    console.error("❌ Firebase DB에 접근할 수 없습니다.");
    return;
  }

  console.log("📡 Firestore에서 최신 도구 데이터를 가져와 랭킹을 갱신합니다...");
  
  const snapshot = await db.collection('tools').orderBy('rank', 'asc').get();
  const toolsOutput = {};
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.name) {
      toolsOutput[doc.id] = {
        score: data.score || 0,
        change: data.change || "-",
        rank: data.rank || 999,
        metrics: data.metrics || {},
        pricing: data.pricing || "Free",
        koSupport: data.koSupport || "N",
        cat: data.cat || "etc",
        oneLineReview: data.oneLineReview || "",
        tags: data.tags || []
      };
    }
  });

  const result = {
    updated: new Date().toISOString(),
    source: "Weekly AI Map Sync",
    tools: toolsOutput
  };

  const mainScoresPath = path.join(__dirname, '..', 'public', 'scores.json');
  fs.writeFileSync(mainScoresPath, JSON.stringify(result, null, 2), 'utf8');
  console.log("✅ public/scores.json 업데이트 완료!");
}

syncScores().catch(err => {
  console.error("❌ 동기화 중 오류 발생:", err);
  process.exit(1);
});
