/**
 * scripts/migrate-tools-to-firestore.js
 *
 * tools.js의 239개 툴 데이터를 Firestore tools 컬렉션으로 1회 마이그레이션
 *
 * 사전 준비:
 *   1. Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
 *   2. 다운로드된 JSON을 프로젝트 루트에 serviceAccountKey.json 으로 저장
 *
 * 실행: node scripts/migrate-tools-to-firestore.js
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

// 서비스 계정 키 로드
const SERVICE_ACCOUNT_PATH = resolve(ROOT, 'serviceAccountKey.json');
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ serviceAccountKey.json 파일이 없습니다.');
  console.error('   Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// tools.js를 직접 읽어서 파싱 (ESM import를 사용)
const { TOOLS_DATA } = await import('../src/data/tools.js');

async function migrate() {
  console.log(`총 ${TOOLS_DATA.length}개 툴 마이그레이션 시작...`);

  // scores.json에서 최신 점수 병합
  const scoresPath = resolve(ROOT, 'public/scores.json');
  let scoresMap = {};
  if (existsSync(scoresPath)) {
    try {
      scoresMap = JSON.parse(readFileSync(scoresPath, 'utf8')).tools || {};
    } catch {}
  }

  const batch_size = 400; // Firestore 배치 최대 500
  let count = 0;
  let batch = db.batch();

  for (const tool of TOOLS_DATA) {
    const live = scoresMap[String(tool.id)];
    const score = live?.score ?? tool.score;
    const change = live?.change ?? tool.change;
    const metrics = live?.metrics ?? null;

    const docRef = db.collection('tools').doc(String(tool.id));
    batch.set(docRef, {
      id: tool.id,
      cat: tool.cat ?? '',
      icon: tool.icon ?? '',
      name: tool.name ?? '',
      nameKo: tool.nameKo ?? '',
      free: tool.free ?? false,
      desc: tool.desc ?? '',
      url: tool.url ?? '',
      features: tool.features ?? [],
      tags: tool.tags ?? [],
      score,
      change,
      metrics: metrics ?? null,
      sns: tool.sns ?? null,
      life: tool.life ?? [],
      naverKw: tool.naverKw ?? [],
      yt: tool.yt ?? null,
      ytKo: tool.ytKo ?? null,
      // 관리자 전용 필드
      manualScore: null,      // 수동 점수 (null이면 자동 사용)
      pinnedRank: null,       // 순위 고정 (null이면 자동)
      hidden: false,          // 숨기기
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    count++;

    // 400개마다 커밋
    if (count % batch_size === 0) {
      await batch.commit();
      console.log(`  ✓ ${count}개 완료...`);
      batch = db.batch();
    }
  }

  // 나머지 커밋
  if (count % batch_size !== 0) {
    await batch.commit();
  }

  console.log(`\n✅ 마이그레이션 완료! 총 ${count}개 툴이 Firestore tools 컬렉션에 저장되었습니다.`);
  process.exit(0);
}

migrate().catch(e => {
  console.error('❌ 마이그레이션 실패:', e);
  process.exit(1);
});
