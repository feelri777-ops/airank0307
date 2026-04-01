/**
 * upload_ranking_json.js
 * JSON 파일을 Firestore adminReports에 직접 업로드하는 스크립트
 *
 * 사용법:
 *   node scripts/upload_ranking_json.js ranking_part1.json ranking_part2.json
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Firebase 초기화
function initAdmin() {
  if (admin.apps.length > 0) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } else {
    const keyPath = path.join(ROOT, 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
    } else {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT 또는 serviceAccountKey.json 필요');
      process.exit(1);
    }
  }
}

// 사용자 JSON 형식 → adminReports tools 형식으로 변환
function convertTool(t) {
  return {
    Rank: Number(t.rank) || 0,
    Change: String(t.change || "0"),
    Name: String(t.name || ""),
    URL: String(t.url || ""),
    Category: String(t.category || "etc"),
    Tags: Array.isArray(t.tags) ? t.tags : [],
    Description: String(t.description || ""),
    One_Line_Review: String(t.one_line_review || ""),
    USP: String(t.usp || ""),
    Pros_Cons: String(t.pros_cons || ""),
    Difficulty: String(t.difficulty || "중"),
    Usage_Score: parseFloat(t.usage_score) || 0,
    Tech_Score: parseFloat(t.tech_score) || 0,
    Buzz_Score: parseFloat(t.buzz_score) || 0,
    Utility_Score: parseFloat(t.utility_score) || 0,
    Growth_Score: parseFloat(t.growth_score) || 0,
    Total_Score: parseFloat(t.total_score) || 0,
    Pricing: String(t.pricing || "Free"),
    Korean_Support: String(t.korean_support || "N"),
    Platform: String(t.platform || "Web"),
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('❌ JSON 파일 경로를 인자로 넘겨주세요.');
    console.error('   예: node scripts/upload_ranking_json.js part1.json part2.json');
    process.exit(1);
  }

  // 여러 파일 읽어서 합치기
  let allTools = [];
  for (const filePath of args) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${absPath}`);
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(absPath, 'utf8'));
    const items = Array.isArray(raw) ? raw : (raw.data || []);
    console.log(`📄 ${path.basename(absPath)}: ${items.length}개 항목 로드`);
    allTools.push(...items);
  }

  // rank 기준 정렬
  allTools.sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));

  // 변환
  const tools = allTools.map(convertTool);

  console.log(`\n✅ 총 ${tools.length}개 툴 준비 완료`);
  console.log('   상위 3개:', tools.slice(0, 3).map(t => `#${t.Rank} ${t.Name}`).join(', '));

  initAdmin();
  const db = admin.firestore();

  const now = new Date();
  const weekLabel = (() => {
    const y = now.getFullYear(), m = now.getMonth() + 1, w = Math.ceil(now.getDate() / 7);
    return `${y}년 ${m}월 ${w}주차`;
  })();

  const reportData = {
    type: "ranking_update",
    summary: `[${weekLabel}] 수동 업로드 AI 툴 랭킹 ${tools.length}개`,
    data: {
      tools,
      weekLabel,
      totalCount: tools.length,
      generatedAt: now.toISOString(),
      engine: "Manual JSON Upload"
    },
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log('\n💾 Firestore adminReports에 저장 중...');
  const ref = await db.collection("adminReports").add(reportData);
  console.log(`\n🎉 업로드 완료!`);
  console.log(`   보고서 ID: ${ref.id}`);
  console.log(`   툴 수: ${tools.length}개`);
  console.log(`   ⚠️  관리자 에이전트 제어실에서 승인하면 랭킹이 반영됩니다.`);
}

main().catch(e => {
  console.error('❌ 오류:', e);
  process.exit(1);
});
