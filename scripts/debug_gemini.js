import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

async function testEngine() {
  console.log("🛠️ 엔진 가동 테스트 시작...");
  if (!API_KEY) {
    console.log("❌ API KEY 없음!");
    return;
  }
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  console.log(`📡 API KEY 확인됨: [${API_KEY.substring(0, 5)}...]`);

  // 모델명 리스트 (순차적 시도)
  const modelsToTry = ["gemini-1.5-flash", "gemini-pro", "gemini-1.5-flash-latest"];
  
  for (const mName of modelsToTry) {
    try {
      console.log(`🔍 모델 '${mName}' 시도 중...`);
      const model = genAI.getGenerativeModel({ model: mName });
      const prompt = "Please say exactly 'OK-READY' if you receive this.";
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text.includes("OK-READY")) {
        console.log(`✅ 엔진 가동 성공! 사용 모델: ${mName}`);
        return mName;
      }
    } catch (err) {
      console.log(`⏩ '${mName}' 실패: status ${err.status || 'unknown'}`);
    }
  }
  console.log("❌ 모든 모델 가동 실패. 404의 원인이 API 티어 문제일 수 있습니다.");
}

testEngine();
