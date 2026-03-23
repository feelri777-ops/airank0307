import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

async function listAvailableModels() {
  console.log("🔍 구글 엔진 센터에서 사용 가능한 모델 목록을 스캔합니다...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      console.log(`❌ 목록 조회 실패: ${errText}`);
      return;
    }
    
    const data = await response.json();
    console.log("✅ 사용 가능한 모델 목록:");
    if (data.models && data.models.length > 0) {
      data.models.forEach(m => {
        // 'flash'가 들어간 모델을 우선적으로 보여줌
        if (m.name.includes("flash")) {
          console.log(`🚀 [추천] ${m.name} (${m.displayName})`);
        } else {
          console.log(`   - ${m.name}`);
        }
      });
    } else {
      console.log("⚠️ 모델 목록이 비어 있습니다. API 키 설정을 확인하세요.");
    }
  } catch (err) {
    console.error("❌ 통신 중 오류 발생:", err.message);
  }
}

listAvailableModels();
