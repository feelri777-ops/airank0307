import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();
  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.initializeApp();
}

const app = initializeFirebase();
const db = admin.firestore();

async function findTheLeak() {
  console.log("🕵️‍♂️ [Leak Hunter] 인덱스 없이 직접 보고서를 뒤져 추적합니다...");
  
  try {
    // 인덱스 없이 전체 보고서를 가져와서 코드로 필터링
    const snaps = await db.collection("adminReports").get();
    const reports = snaps.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r => r.type === "new_tool_recommendation")
      .sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      
    if (reports.length === 0) {
      console.log("⚠️ 리포트를 찾을 수 없습니다.");
      return;
    }
    
    // 가장 최근 보고서 선택
    const reportData = reports[0];
    const recommendations = reportData.data?.recommendations || [];
    
    console.log(`📑 발견된 최신 통과 툴: ${recommendations.length}개`);
    
    // 우리 친구(기존 툴)들을 싹 다 한 번의 소환으로 명단화
    const allToolsSnap = await db.collection("tools").get();
    const existingList = allToolsSnap.docs.map(doc => {
      const d = doc.data();
      return {
        name: (d.name || "").toLowerCase().trim().replace(/\s+/g, ''),
        domain: (d.url || "").replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "").toLowerCase(),
        fullName: d.name,
        fullUrl: d.url
      };
    });

    for (const tool of recommendations) {
      console.log(`\n🔍 [체크 대상] 추천된 툴: '${tool.name}' (URL: ${tool.url})`);
      const nName = tool.name.toLowerCase().trim().replace(/\s+/g, '');
      const nDomain = (tool.url || "").replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "").toLowerCase();
      
      let leakFound = false;
      for (const ex of existingList) {
        if (ex.name === nName) {
          console.log(`🚨 [발각!!] 이름 중복! (DB: ${ex.fullName} vs 추천: ${tool.name})`);
          leakFound = true;
        } else if (ex.domain === nDomain && nDomain !== "") {
          console.log(`🚨 [발각!!] URL 도메인 중복! (DB: ${ex.fullUrl} vs 추천: ${tool.url})`);
          leakFound = true;
        } else if (nDomain.includes(ex.domain) || ex.domain.includes(nDomain)) {
           if (nDomain !== "" && ex.domain !== "") {
              console.log(`⚠️ [의심!!] URL 조각이 겹침! (DB: ${ex.domain} vs 추천: ${nDomain})`);
              leakFound = true;
           }
        }
      }
      
      if (!leakFound) {
        console.log(`✅ '${tool.name}'은(는) 정말 DB에 없는 따끈따끈한 녀석입니다!`);
      }
    }
  } catch (err) {
    console.error("❌ 추적 에러:", err);
  }
}

findTheLeak();
