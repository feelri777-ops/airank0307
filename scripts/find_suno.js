import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config();

const serviceAccount = JSON.parse(fs.readFileSync('serviceAccountKey.json','utf8'));
admin.initializeApp({credential:admin.credential.cert(serviceAccount)});

async function checkSuno() {
  console.log("🕵️‍♂️ [Suno Scanner] DB의 모든 문서를 검사합니다...");
  const snap = await admin.firestore().collection('tools').get();
  let found = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    const name = (data.name || "").toLowerCase();
    const url = (data.url || "").toLowerCase();
    if (name.includes('suno') || url.includes('suno')) {
      console.log(`🚨 발견!! ID: ${d.id}, 이름: ${data.name}, URL: ${data.url}`);
      found++;
    }
  });
  if (found === 0) console.log("⚠️ DB에 Suno의 흔적을 찾을 수 없습니다.");
  else console.log(`✅ 총 ${found}개의 흔적을 발견했습니다.`);
}

checkSuno();
