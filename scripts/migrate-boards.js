import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Firebase Admin SDK 설정 (update_ranking.js의 로직 재사용)
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const BOARDS = [
  { id: "chatgpt",    name: "ChatGPT",    logo: "https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64",        color: "#10a37f", desc: "ChatGPT 사용팁, 질문, 경험을 공유해요" },
  { id: "gemini",     name: "Gemini",     logo: "https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64",  color: "#4285F4", desc: "Google Gemini 활용법과 토론" },
  { id: "claude",     name: "Claude",     logo: "https://www.google.com/s2/favicons?domain=claude.ai&sz=64",          color: "#CC785C", desc: "Anthropic Claude 활용 경험 공유" },
  { id: "grok",       name: "Grok",       logo: "https://www.google.com/s2/favicons?domain=x.ai&sz=64",               color: "#1DA1F2", desc: "xAI Grok 사용 경험과 팁 공유" },
  { id: "notebooklm", name: "NotebookLM", logo: "https://www.google.com/s2/favicons?domain=notebooklm.google&sz=64", color: "#34A853", desc: "Google NotebookLM 활용법과 연구 팁" },
  { id: "opensource", name: "AI 언더독",  logo: "https://www.google.com/s2/favicons?domain=huggingface.co&sz=64",     color: "#8B5CF6", desc: "아직 덜 알려졌지만 주목할 만한 AI 툴 발굴·공유" },
  { id: "copilot",    name: "Copilot",    logo: "https://www.google.com/s2/favicons?domain=copilot.microsoft.com&sz=64", color: "#0078D4", desc: "Microsoft Copilot 활용 경험과 팁 공유" },
  { id: "perplexity", name: "Perplexity", logo: "https://www.google.com/s2/favicons?domain=perplexity.ai&sz=64",         color: "#20B8CD", desc: "Perplexity AI 검색 활용법과 경험 공유" },
  { id: "midjourney", name: "Midjourney", logo: "https://www.google.com/s2/favicons?domain=midjourney.com&sz=64",         color: "#000000", desc: "Midjourney 이미지 생성 팁과 프롬프트 공유" },
  { id: "cursor",     name: "Cursor",     logo: "https://www.google.com/s2/favicons?domain=cursor.com&sz=64",             color: "#6366F1", desc: "Cursor AI 코딩 경험과 활용법 공유" },
  { id: "stablediffusion", name: "Stable Diffusion", logo: "https://www.google.com/s2/favicons?domain=stability.ai&sz=64",    color: "#FF6B2B", desc: "Stable Diffusion 이미지 생성 팁과 모델 공유" },
  { id: "runway",     name: "Runway",     logo: "https://www.google.com/s2/favicons?domain=runwayml.com&sz=64",           color: "#5B5BD6", desc: "Runway 영상 생성 활용법과 크리에이티브 공유" },
  { id: "suno",       name: "Suno",       logo: "https://www.google.com/s2/favicons?domain=suno.com&sz=64",               color: "#FF4D4D", desc: "Suno AI 음악 생성 경험과 팁 공유" },
  { id: "windsurf",   name: "Windsurf",   logo: "https://www.google.com/s2/favicons?domain=codeium.com&sz=64",            color: "#09B6A2", desc: "Windsurf AI 코딩 경험과 활용법 공유" },
  { id: "notion",     name: "Notion AI",  logo: "https://www.google.com/s2/favicons?domain=notion.so&sz=64",              color: "#000000", desc: "Notion AI 활용법과 워크플로우 공유" },
  { id: "sora",       name: "Sora",       logo: "https://www.google.com/s2/favicons?domain=sora.com&sz=64",               color: "#412991", desc: "OpenAI Sora 영상 생성 경험 공유" },
  { id: "free",       name: "자유게시판", logo: "https://www.google.com/s2/favicons?domain=airank.kr&sz=64",               color: "#F59E0B", desc: "AI 전반에 관한 자유로운 이야기" },
];

async function migrate() {
  console.log("🚀 게시판 데이터 이전 시작...");
  
  const batch = db.batch();
  
  BOARDS.forEach((board, index) => {
    const docRef = db.collection('boards').doc(board.id);
    batch.set(docRef, {
      ...board,
      order: index, // 정렬을 위해 순서 추가
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
  console.log(`✅ ${BOARDS.length}개의 게시판 데이터를 Firestore로 이전하였습니다.`);
}

migrate().catch(console.error);
