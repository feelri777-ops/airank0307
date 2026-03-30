import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// 1. Firebase 초기화
// ========================================
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

if (admin.apps.length === 0) {
  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')))
    });
  } else {
    console.error("❌ Firebase 인증 키(serviceAccountKey.json)를 찾을 수 없습니다.");
    process.exit(1);
  }
}

const db = admin.firestore();

async function fixStaleRanks() {
  console.log("🚀 [Fix] 랭킹 중복 및 유실 데이터 정리 시작...");

  try {
    // 1. 가장 최근에 승인된 랭킹 리포트 가져오기 (인덱스 오류 방지를 위해 메모리 기반 정렬/필터링)
    console.log("📡 랭킹 리포트 조회 중...");
    const reportSnap = await db.collection("adminReports")
      .where("type", "==", "ranking_update")
      .get();

    if (reportSnap.empty) {
      console.warn("⚠️ 랭킹 리포트가 없습니다.");
      return;
    }

    const approvedReports = reportSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(r => r.status === "approved")
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    if (approvedReports.length === 0) {
      console.warn("⚠️ 승인된 랭킹 리포트가 없습니다.");
      return;
    }

    const latestReport = approvedReports[0];
    const rankedToolNames = new Set(
      latestReport.data.tools.map(t => String(t.Name || "").toLowerCase().trim())
    );

    console.log(`✅ 최근 리포트 발견: "${latestReport.summary}" (${rankedToolNames.size}개 도구)`);

    // 2. 전체 도구 목록 가져오기
    const toolsSnap = await db.collection("tools").get();
    const allTools = toolsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📊 현재 DB 총 도구 수: ${allTools.length}개`);

    const batch = db.batch();
    let staleCount = 0;
    let validCount = 0;

    for (const tool of allTools) {
      const toolName = String(tool.name || "").toLowerCase().trim();
      
      if (tool.rank && !rankedToolNames.has(toolName)) {
        // 리포트에는 없는데 rank 값이 있는 경우 -> stale 데이터
        batch.update(db.collection("tools").doc(tool.id), {
          rank: admin.firestore.FieldValue.delete()
        });
        staleCount++;
        console.log(`  🗑️ 제거 대상 (Stale rank): ${tool.name} (ID: ${tool.id}, Prev Rank: ${tool.rank})`);
      } else if (tool.rank) {
        validCount++;
      }
    }

    if (staleCount > 0) {
      await batch.commit();
      console.log(`\n✨ 정리 완료: ${staleCount}개의 유실된 랭킹 정보를 제거했습니다.`);
    } else {
      console.log("\n✅ 정리할 유실 데이터가 없습니다.");
    }

    console.log(`📈 정리 후 활성 랭킹 도구 수: ${validCount}개`);
    process.exit(0);

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

fixStaleRanks();
