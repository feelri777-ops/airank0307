
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// 대표적인 탑 티어 AI 모델/서비스 수동 점수 고정 (1위~40위)
const MANUAL_SCORES = {
  // --- 최상위 S급 (범용 생성형 AI) ---
  "ChatGPT": 99.00,
  "Gemini": 96.00,
  "Claude": 95.50,
  "Perplexity AI": 92.00,
  "DeepSeek": 91.50,
  
  // --- 최상위 A급 코딩/검색/이미지 ---
  "Midjourney": 89.00,
  "GitHub Copilot": 88.00,
  "Cursor": 87.50,
  "Grok": 87.00,
  "Llama": 86.50,
  
  // --- B급 메이저 서비스 (생산성/영상/오디오/특화) ---
  "Notion AI": 85.00,
  "Suno AI": 84.00,
  "Runway Gen-3": 83.50,
  "Sora": 83.00,
  "DALL-E 3": 82.50,
  "ElevenLabs": 81.00,
  "Grammarly": 80.50,
  "Microsoft Copilot": 80.00,
  "NotebookLM": 79.50,
  "Jasper": 78.50,
  "HeyGen": 78.00,
  "Leonardo AI": 77.50,
  "Poe": 77.00,
  "Character.AI": 76.50,
  "v0": 76.00,
  "Devin": 75.00,
  "Stable Diffusion": 74.50,
  "Canva AI": 74.00,
  "Pika Labs": 73.50,
  "Krea AI": 73.00,
  "Mistral AI": 72.50,
  "Gemma": 72.00,
  "AutoGPT": 71.50,
  "HuggingChat": 71.00,
  "Zapier AI": 69.50,
  "Figma AI": 68.00,
  "Adobe Firefly": 67.50
};

// 절대적으로 숨김 처리하거나 점수를 확 낮출 툴 (일반 툴인데 AI로 포장되어 OPR 점수를 너무 빨아먹는 경우)
const DOWNGRADE_NAMES = [
  "Make", "Trello", "Miro", "Wix", "Shopify"
];

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

  // 각 툴의 계산된 점수 확정
  tools.forEach(t => {
    let finalScore = t.score || 0;
    
    // 수동 점수 테이블 매칭
    if (MANUAL_SCORES[t.name]) {
      finalScore = MANUAL_SCORES[t.name];
      t.manualScore = finalScore;
    } else if (t.nameKo && MANUAL_SCORES[t.nameKo]) {
      finalScore = MANUAL_SCORES[t.nameKo];
      t.manualScore = finalScore;
    } else if (DOWNGRADE_NAMES.some(n => t.name.includes(n))) {
      finalScore = 10;
      t.manualScore = null;
    } else {
      t.manualScore = null; // 기존의 잘못된 매뉴얼 스코어 삭제
    }
    
    t._calCalcScore = finalScore;
  });

  // 점수(수동점수 반영) 기준으로 정렬 후 100위 컷오프
  tools.sort((a, b) => b._calCalcScore - a._calCalcScore);

  console.log("\n====== 재조정된 TOP 20 ======");
  tools.slice(0, 20).forEach((t, i) => console.log(`${i+1}. ${t.name} (${t._calCalcScore})`));
  
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  console.log("\n📦 Firestore 업데이트 적용 시작 (100위 컷오프 숨김처리)...");
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const docRef = db.collection("tools").doc(String(t.id));
    
    // 100위 이내면 hidden = false, 그 외는 hidden = true
    const shouldHide = i >= 100;
    
    const updateData = {
      hidden: shouldHide,
      manualScore: t.manualScore || null,
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

  console.log(`✅ [성공] 총 ${count}개의 툴 순위 및 노출 여부 재조정 완료!`);
}

rebalance().catch(e => {
  console.error("❌ 처리 중 오류 발생:", e);
  process.exit(1);
});
