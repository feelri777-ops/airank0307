import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function testWriteRead() {
  console.log("🧪 Firestore 테스트 시작...");
  const testRef = db.collection("adminReports").doc("TEST_DOC");
  
  await testRef.set({
    type: "test",
    summary: "테스트 보고서입니다 (실시간 체크용)",
    data: { errors: [], updates: [] },
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log("✅ 쓰기 성공! 이제 다시 읽어옵니다...");

  const snap = await db.collection("adminReports").get();
  console.log(`📦 현재 adminReports 컬렉션 문서 수: ${snap.size}`);
  snap.forEach(doc => {
    console.log(` - [${doc.id}] ${doc.data().summary}`);
  });
}

testWriteRead().catch(console.error);
