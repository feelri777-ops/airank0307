import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyBgEK1nLoKTTa4tRwhZRQPC7xLQP8lf8NQ",
  authDomain: "airank0307.firebaseapp.com",
  projectId: "airank0307",
  storageBucket: "airank0307.firebasestorage.app",
  messagingSenderId: "778502679462",
  appId: "1:778502679462:web:65e2dced1dfdb41de93d67",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getTop20() {
  try {
    const snap = await getDocs(collection(db, "tools"));
    const tools = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter and Sort logic from AdminTools.jsx
    const ranked = tools
      .filter(t => !t.hidden) // Only non-hidden tools
      .map(t => ({ 
        ...t, 
        _effectiveScore: t.manualScore != null ? Number(t.manualScore) : (t.score || 0) 
      }))
      .sort((a, b) => b._effectiveScore - a._effectiveScore)
      .slice(0, 20);

    const resultPath = path.join(__dirname, '../data/top20_live.json');
    const dir = path.dirname(resultPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(resultPath, JSON.stringify(ranked, null, 2));
    console.log(`Saved top 20 live tools to ${resultPath}`);
    process.exit(0);
  } catch (error) {
    console.error("Error fetching tools:", error);
    process.exit(1);
  }
}

getTop20();
