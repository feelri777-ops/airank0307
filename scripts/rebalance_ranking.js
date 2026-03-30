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

// 진짜 AI 대장격 필수 툴들에게 주는 "AI 순혈 프리미엄(가점)"
const BONUS_SCORES = {
  // S급 범용 AI 대장 (+25점)
  "ChatGPT": 25, "Gemini": 25, "Claude": 25, "DeepSeek": 25,
  // A급 각 분야별 대장급 AI (+15점)
  "Midjourney": 15, "Perplexity AI": 15, "Cursor": 15, "Grok": 15, "Llama": 15,
  "GitHub Copilot": 15, "Sora": 15, "WRTN": 15,
  // B급 높은 인지도의 AI 툴 (+10점)
  "Suno": 10, "Runway Gen-3": 10, "DALL-E 3": 10, "ElevenLabs": 10, "Microsoft Copilot": 10,
  "NotebookLM": 10, "HeyGen": 10, "Leonardo AI": 10, "Poe": 10, "Character.AI": 10,
  "v0": 10, "Devin": 10, "Stable Diffusion": 10, "Pika Labs": 10, "Mistral AI": 10,
  "Luma AI": 10, "Kling AI": 10, "Udio": 10, "Krea AI": 10, "Bolt.new": 10, "Meta AI": 10, "Flux": 10
};

// AI 주력이 아니면서 도메인 깡패로 상위권을 교란하는 툴 "일반 툴 페널티(감점)"
const PENALTY_SCORES = {
  // 트래픽 깡패 일반 SaaS (-20점)
  "Canva AI": -20, "Notion AI": -20, "Figma AI": -20, "JetBrains AI": -20,
  "Freepik AI": -20, "Zapier AI": -20, "Make": -20, "ClickUp AI": -20,
  "Zoom AI": -20, "CapCut AI": -20, "Trello": -20, "Miro": -20, "Wix": -20, "Shopify": -20,
  "Grammarly": -10 // 그래머리는 AI 비중이 크지만 텍스트 교정 위주이므로 소폭 감점
};

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

  // 각 툴의 자동 점수에 가점/감점을 더해 최종 조정 점수 계산
  tools.forEach(t => {
    let rawScore = t.score || 0;
    let bonus = 0;
    
    if (BONUS_SCORES[t.name]) bonus = BONUS_SCORES[t.name];
    else if (t.nameKo && BONUS_SCORES[t.nameKo]) bonus = BONUS_SCORES[t.nameKo];
    
    // 페널티는 이름의 일부만 포함되어도 감점 적용 (예: Canva, Zoom 등)
    Object.keys(PENALTY_SCORES).forEach(penaltyName => {
      if (t.name.includes(penaltyName)) {
        bonus = PENALTY_SCORES[penaltyName];
      }
    });
    
    // 최종 점수 (최대 99.9점, 최소 0점으로 제한)
    let adjustedScore = rawScore + bonus;
    if (adjustedScore > 99.9) adjustedScore = 99.9;
    if (adjustedScore < 0) adjustedScore = 0;
    
    t._calCalcScore = parseFloat(adjustedScore.toFixed(2));
  });

  // 보정된 최종 점수 기준으로 정렬
  tools.sort((a, b) => b._calCalcScore - a._calCalcScore);

  console.log("\n====== 보정치(가점/감점) 적용된 TOP 20 ======");
  tools.slice(0, 20).forEach((t, i) => console.log(`${i+1}. ${t.name} (보정된 점수: ${t._calCalcScore})`));
  
  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  console.log("\n📦 Firestore 업데이트 적용 시작 (점수 덮어쓰기 및 100위 컷오프 숨김처리)...");
  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const docRef = db.collection("tools").doc(String(t.id));
    
    // 100위 이내면 hidden = false, 그 외는 hidden = true
    const shouldHide = i >= 100;
    
    const updateData = {
      score: t._calCalcScore, // 보정된 점수를 실제 score 필드에 영구 적용
      hidden: shouldHide,
      manualScore: admin.firestore.FieldValue.delete(), // 과거의 수동 완전 고정 점수 로직 파기
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

  // public/scores.json 파일도 동기화 (프론트엔드 캐시 일관성 보장)
  const scoresPath = path.join(ROOT, 'public', 'scores.json');
  if (fs.existsSync(scoresPath)) {
    console.log("\n📄 public/scores.json 파일 동기화를 시작합니다...");
    const scoresData = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
    
    // scores.json 내의 각 도구 점수와 랭킹 보정값 일치시킴
    tools.forEach(t => {
      if (scoresData.tools && scoresData.tools[String(t.id)]) {
        scoresData.tools[String(t.id)].score = t._calCalcScore;
      }
    });

    scoresData.updated = new Date().toISOString();
    scoresData.source = "Rebalanced via rebalance_ranking.js";
    
    fs.writeFileSync(scoresPath, JSON.stringify(scoresData, null, 2), 'utf8');
    console.log("✅ [공유] public/scores.json 동기화 완료!");
  }

  // ============================================================
  // adminReports 최신 랭킹 보고서도 보정된 score/rank로 동기화
  // → 랭킹 세부 페이지와 메인 페이지 순위 일치
  // ============================================================
  console.log("\n📋 adminReports 최신 보고서 동기화 시작...");
  try {
    const reportsSnap = await db.collection("adminReports")
      .where("type", "==", "ranking_update")
      .get();

    if (!reportsSnap.empty) {
      // 보정된 score 기준 이름→순위 맵 생성
      const nameToRank = {};
      const nameToScore = {};
      tools.forEach((t, i) => {
        if (i < 100) {
          nameToRank[t.name?.toLowerCase().trim()] = i + 1;
          nameToScore[t.name?.toLowerCase().trim()] = t._calCalcScore;
        }
      });

      // 최신 보고서 찾기
      const sortedReports = reportsSnap.docs.sort((a, b) => {
        const aTime = a.data().createdAt?.toMillis() || 0;
        const bTime = b.data().createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
      const latestDoc = sortedReports[0];
      const latestData = latestDoc.data();
      const reportTools = latestData.data?.tools || [];

      // 보정된 score/rank 적용
      const updatedTools = reportTools.map(t => {
        const key = t.Name?.toLowerCase().trim();
        const newRank = nameToRank[key];
        const newScore = nameToScore[key];
        if (newRank !== undefined) {
          return { ...t, Rank: newRank, Total_Score: newScore };
        }
        return t;
      });

      // Rank 기준 재정렬
      updatedTools.sort((a, b) => a.Rank - b.Rank);

      await db.collection("adminReports").doc(latestDoc.id).update({
        "data.tools": updatedTools,
        "data.rebalancedAt": new Date().toISOString()
      });

      console.log(`✅ adminReports 최신 보고서(${latestDoc.id}) 동기화 완료! (${updatedTools.length}개 툴)`);
    } else {
      console.log("⚠️ adminReports에 랭킹 보고서가 없습니다. 건너뜁니다.");
    }
  } catch (e) {
    console.error("❌ adminReports 동기화 실패:", e.message);
  }

  console.log(`\n✅ [성공] 가점/감점 보정 점수로 1~100위 방어 성공, 점수 덮어쓰기 및 숨김 처리 완료!`);
}

rebalance().catch(e => {
  console.error("❌ 처리 중 오류 발생:", e);
  process.exit(1);
});
