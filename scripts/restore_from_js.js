
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
    // 로컬 환경용
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

async function restoreFromJS() {
  initAdmin();
  
  const db = admin.firestore();
  let batch = db.batch();
  let count = 0;

  console.log(`🔄 src/data/tools.js 파일에서 ${TOOLS_DATA.length}개의 풍부한 데이터를 읽어와서 Firestore를 단숨에 복구합니다...`);

  for (const tool of TOOLS_DATA) {
    if (!tool.id) continue;
    
    const docRef = db.collection('tools').doc(String(tool.id));
    
    // Tools_data에 있는 '모든 유용한 정보'를 그대로 덮어쓰기 (강제 복원)
    const restoreData = {
      id: String(tool.id),
      name: tool.name || "",
      nameKo: tool.nameKo || "",
      url: tool.url || "",
      cat: tool.cat || "",
      icon: tool.icon || "",
      desc: tool.desc || "",
      features: tool.features || [],
      tags: tool.tags || [],
      isOpenSource: tool.tags?.includes("오픈소스") ? "Y" : "N",
      free: !!tool.free,
      life: tool.life || [],
      naverKw: tool.naverKw || [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    batch.set(docRef, restoreData, { merge: true });
    count++;

    console.log(`- ${tool.name} 복구 데이터 준비...`);
    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`  ✓ ${count}개 커밋 완료...`);
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }

  console.log(`✅ [완벽 복구] 총 ${count}개의 도구 메타데이터가 상세내용(아이콘, 설명, 태그)과 함께 완벽하게 복구되었습니다!`);
}

restoreFromJS().catch(err => {
  console.error('❌ 복구 실패:', err);
  process.exit(1);
});
