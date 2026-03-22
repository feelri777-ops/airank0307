import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function initAdmin() {
  if (admin.apps.length > 0) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    const keyPath = path.join(ROOT, 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT 필요함');
      process.exit(1);
    }
  }
}

async function rebalance() {
  initAdmin();
  const db = admin.firestore();
  
  console.log("📡 Firestore에서 모든 툴 데이터를 불러옵니다...");
  const snap = await db.collection("tools").get();
  
  const tools = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  console.log(`총 ${tools.length}개 툴 확인됨.`);

  // 순수 자동점수(t.score) 기준으로만 정렬 후 100위 컷오프
  tools.sort((a, b) => (b.score || 0) - (a.score || 0));

  console.log("\n====== 순수 자동 점수 기준 TOP 20 ======");
  tools.slice(0, 20).forEach((t, i) => console.log(`${i+1}. ${t.name} (${t.score || 0})`));
  
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  console.log("\n📦 Firestore 업데이트 적용 시작 (순수 100위 컷오프 숨김처리)...");
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const docRef = db.collection("tools").doc(String(t.id));
    
    // 100위 이내면 hidden = false, 그 외는 hidden = true
    const shouldHide = i >= 100;
    
    const updateData = {
      hidden: shouldHide,
      manualScore: admin.firestore.FieldValue.delete(), // 기존 수동 점수 완전히 삭제 (원래 구조 유지)
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    batch.update(docRef, updateData);
    count++;
    
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  
  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ [성공] 원래 점수 구조 그대로 1위~100위 노출, 나머지 숨김 처리 완료!`);
}

rebalance().catch(e => {
  console.error("❌ 처리 중 오류 발생:", e);
  process.exit(1);
});
