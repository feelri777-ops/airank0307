import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function initAdmin() {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

async function test() {
  initAdmin();
  if (admin.apps.length === 0) return console.log("No admin");
  const db = admin.firestore();
  const snap = await db.collection('tools').orderBy('score', 'desc').get();
  
  const ids = snap.docs.map(d => d.id);
  console.log(`Ordered by score: returned ${ids.length} tools`);
  const missing = ['187', '188', '232', '247'].filter(id => !ids.includes(id));
  console.log(`Missing ids: ${missing.join(', ')}`);
}
test().catch(console.error);
