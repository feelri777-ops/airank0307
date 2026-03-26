import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkTools() {
  console.log("🔍 tools 컬렉션 현황 점검...");
  const snap = await db.collection("tools").get();
  console.log(`📦 총 문서 수: ${snap.size}`);
  
  const docs = [];
  snap.forEach(doc => {
    docs.push({ id: doc.id, name: doc.data().name, rank: doc.data().rank, score: doc.data().score });
  });

  // 순위별 정렬
  docs.sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));

  console.log("\n--- 상위 10개 문서 (ID 및 이름) ---");
  docs.slice(0, 10).forEach(d => {
    console.log(`[ID: ${d.id.padEnd(20)}] Rank: ${String(d.rank).padEnd(3)} Name: ${d.name} (Score: ${d.score})`);
  });

  console.log("\n--- ID가 숫자인 문서들 ---");
  const numericIds = docs.filter(d => !isNaN(d.id));
  numericIds.forEach(d => {
    console.log(`[ID: ${d.id.padEnd(20)}] Rank: ${String(d.rank).padEnd(3)} Name: ${d.name}`);
  });
}

checkTools().catch(console.error);
