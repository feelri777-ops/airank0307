
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
      console.error('❌ FIREBASE_SERVICE_ACCOUNT 환경변수 또는 serviceAccountKey.json 필요');
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

  console.log('🔄 [Restoring] CSV 파일을 기반으로 Firestore 메타데이터 복구를 시도합니다...');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  
  initAdmin();
  const db = admin.firestore();
  let batch = db.batch();
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 탭 구분을 시도하고, 탭이 없으면 쉼표 시도
    let parts = line.split('\t');
    if (parts.length < 3) parts = line.split(',');
    if (parts.length < 3) continue;

    // CSV 인덱스 대응 (데이터 포맷 확인 기반)
    // 0:ID, 1:ServiceName, 2:AnalysisDomain, 5:OpenSource
    const id = parts[0]?.trim().replace(/"/g, '');
    const name = parts[1]?.trim().replace(/"/g, '');
    let url = parts[2]?.trim().replace(/"/g, '') || "";
    const isOpenSource = parts[5]?.trim().toUpperCase() === 'Y' ? 'Y' : 'N';

    if (id && name) {
      if (url && !url.includes('://')) url = `https://${url}`;
      
      const docRef = db.collection('tools').doc(String(id));
      
      // set + merge 명령어로 기존 문서를 생성하거나 강제로 필드를 대입합니다.
      batch.set(docRef, {
        id: String(id),
        name: name,
        nameKo: name, // 기본값으로 이름 할당
        url: url,
        isOpenSource: isOpenSource,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      count++;
    }

    if (count % 450 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`  ✓ ${count}개 복구 중...`);
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`✅ [Success] 총 ${count}개의 도구 메타데이터(이름, URL 등)가 복구되었습니다!`);
}

restoreToolsMetadata().catch(err => {
  console.error('❌ [Error] 복구 작업 중 치명적 오류 발생:', err);
  process.exit(1);
});
