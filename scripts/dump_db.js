import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '../serviceAccountKey.json'), 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const snap = await db.collection('tools').get();
  console.log(`Total tools: ${snap.size}`);
  const data = snap.docs.map(d => ({
    id: d.id,
    name: d.data().name,
    rank: d.data().rank,
    score: d.data().score
  }));
  
  // JSON 파일로 저장
  fs.writeFileSync(path.join(__dirname, 'db_dump.json'), JSON.stringify(data, null, 2));
  console.log("Dump saved to scripts/db_dump.json");
}

run().catch(console.error);
