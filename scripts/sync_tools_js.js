/**
 * scripts/sync_tools_js.js
 *
 * scores.json의 최신 점수/변동값을 Firestore tools 컬렉션에 반영
 * GitHub Actions의 랭킹 갱신 워크플로우에서 update_ranking.js 실행 후 호출됨
 *
 * 환경변수 (GitHub Actions Secret):
 *   FIREBASE_SERVICE_ACCOUNT  — Firebase 서비스 계정 JSON (문자열)
 *
 * 실행: node scripts/sync_tools_js.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function initAdmin() {
  if (admin.apps.length > 0) return;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    const keyPath = path.join(ROOT, 'serviceAccountKey.json');
    if (!fs.existsSync(keyPath)) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT 환경변수 또는 serviceAccountKey.json 필요');
      process.exit(1);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

async function syncScoresToFirestore() {
  const scoresPath = path.join(ROOT, 'public', 'scores.json');
  if (!fs.existsSync(scoresPath)) {
    console.error('❌ scores.json 없음');
    return;
  }

  const scoresData = JSON.parse(fs.readFileSync(scoresPath, 'utf8')).tools;
  if (!scoresData) {
    console.error('❌ scores.json에 tools 필드 없음');
    return;
  }

  initAdmin();
  const db = admin.firestore();

  const ids = Object.keys(scoresData);
  const batchSize = 400;
  let count = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    const batch = db.batch();

    for (const id of chunk) {
      const { score, change, metrics } = scoresData[id];
      const docRef = db.collection('tools').doc(id);
      batch.set(docRef, {
        score: score ?? 0,
        change: change ?? 0,
        metrics: metrics ?? null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      count++;
    }

    await batch.commit();
    console.log(`  ✓ ${Math.min(i + batchSize, ids.length)} / ${ids.length} 업데이트 완료`);
  }

  console.log(`✅ [Sync] scores.json → Firestore tools 동기화 완료! (${count}개)`);
}

syncScoresToFirestore().catch(e => {
  console.error('❌ Sync 실패:', e);
  process.exit(1);
});
