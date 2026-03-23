import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

async function checkApiRaw() {
  console.log("🌐 구글 AI 본진 직접 통신 테스트...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello AI?" }] }]
      })
    });
    
    console.log(`📡 응답 상태 코드: ${response.status} (${response.statusText})`);
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ 통신 성공! AI로부터 메시지를 받았습니다.");
      // console.log(JSON.stringify(data, null, 2));
    } else {
      const errText = await response.text();
      console.log(`❌ 통신 실패: ${errText}`);
    }
  } catch (err) {
    console.error("❌ 통신 중 심각한 물리 에러:", err.message);
  }
}

checkApiRaw();
