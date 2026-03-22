
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { TOOLS_DATA } from '../src/data/tools.js';

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

async function syncTaxonomies() {
  initAdmin();
  const db = admin.firestore();
  
  console.log("📡 Firestore 카테고리/태그 정밀 동기화를 시작합니다...");
  
  const batchSize = 450;
  let batch = db.batch();
  let count = 0;

  for (const t of TOOLS_DATA) {
    const docRef = db.collection("tools").doc(String(t.id));
    
    // js 데이터에 정의된 최신 cat과 tags로 덮어쓰기
    batch.set(docRef, {
      cat: t.cat,
      tags: t.tags,
      desc: t.desc, // 설명도 업데이트 리스트에 포함
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  
  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ [성공] 총 ${count}개 툴의 카테고리/태그/설명 데이터가 Firestore에 강제 동기화되었습니다.`);
}

syncTaxonomies().catch(e => {
  console.error("❌ 오류 발생:", e);
  process.exit(1);
});
