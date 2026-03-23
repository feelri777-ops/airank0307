
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, '../serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const dataPath = path.join(__dirname, '../tool list/unified_tools.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

async function importData() {
  const tools = data.tools;
  const batch = db.batch();
  const toolsRef = db.collection('tools');

  console.log(`Importing ${tools.length} tools...`);

  // To update or add by name, we need to find existing ones first
  const existingSnap = await toolsRef.get();
  const existingMap = {};
  existingSnap.forEach(doc => {
    existingMap[doc.data().name.toLowerCase()] = doc.id;
  });

  for (const item of tools) {
    const nameLower = item.name.toLowerCase();
    const docData = {
      ...item,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metrics: {
        usage: item.usage || 0,
        tech: item.tech || 0,
        buzz: item.buzz || 0,
        utility: item.utility || 0,
        growth: item.growth || 0
      }
    };
    
    // Cleanup internal keys used for normalization
    delete docData.usage;
    delete docData.tech;
    delete docData.buzz;
    delete docData.utility;
    delete docData.growth;

    if (existingMap[nameLower]) {
      batch.update(toolsRef.doc(existingMap[nameLower]), docData);
    } else {
      batch.set(toolsRef.doc(), docData);
    }
  }

  await batch.commit();
  console.log('Successfully imported all tools to Firestore.');
  
  process.exit(0);
}

importData().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
