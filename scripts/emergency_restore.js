
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
    if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      console.error('❌ serviceAccountKey.json 파일이 필요하거나 FIREBASE_SERVICE_ACCOUNT 환경변수가 필요합니다.');
      process.exit(1);
    }
  }
}

async function restoreToolsMetadata() {
  const csvPath = path.join(ROOT, 'data', 'airank2602.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ 복구 원천인 airank2602.csv 파일이 없습니다.');
    return;
  }

  console.log('🔄 CSV 파일을 기반으로 Firestore 메타데이터 복구를 시작합니다...');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  initAdmin();
  const db = admin.firestore();
  let batch = db.batch();
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 탭 구분을 기본으로 하되, 탭이 없으면 쉼표 시도 (airank2602.csv는 탭 구분으로 보임)
    const parts = line.split('\t');
    if (parts.length < 3) continue;

    // 인덱스: 0:ID, 1:ServiceName, 2:AnalysisDomain, 5:OpenSource
    const id = parts[0]?.trim();
    const name = parts[1]?.trim();
    const url = parts[2]?.trim();
    const isOpenSource = parts[5]?.trim() === 'Y' ? 'Y' : 'N';

    if (id && name) {
      const docRef = db.collection('tools').doc(String(id));
      batch.update(docRef, {
        name,
        url: url.includes('http') ? url : `https://${url}`,
        isOpenSource,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      count++;
    }

    if (count % 450 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`  ✓ ${count}개 복구 중...`);
    }
  }

  if (count % 450 !== 0) {
    await batch.commit();
  }

  console.log(`✅ 총 ${count}개의 도구 메타데이터 복구(이름, URL 등)가 완료되었습니다!`);
}

restoreToolsMetadata().catch(err => {
  console.error('❌ 복구 실패:', err.message);
  process.exit(1);
});
