// ============================================================
// ⚠️  RANKING CONFIG — 검증된 수집 조건 (함부로 수정하지 마세요)
//
// 이 파일은 2026-03-30 기준으로 정상 동작이 확인된
// 랭킹 에이전트의 핵심 조건을 정의합니다.
// ranking_agent.js는 이 파일을 import하여 사용합니다.
// ============================================================

export const CHUNK_SIZE = 10; // 한 번에 요청하는 툴 수 (10개 고정)
export const TOTAL_TOOLS = 100; // 목표 수집 개수
export const RETRY_LIMIT = 3; // 청크 실패 시 재시도 횟수
export const RETRY_DELAY_MS = 5000; // 재시도 대기 시간 (ms)
export const CHUNK_DELAY_MS = 2000; // 청크 간 대기 시간 (ms)

export const GEMINI_MODEL = "gemini-2.0-flash";
export const GEMINI_CONFIG = {
  temperature: 0.2,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192
};

// ============================================================
// 점수 기준 (Gemini에게 전달되는 평가 기준)
// ============================================================
export const SCORE_CRITERIA = `[점수 기준]
- Usage_Score: 실제 월간 사용자수 및 트래픽 기반 (0~100)
- Tech_Score: 기술력, 모델 성능, 혁신성 기반 (0~100)
- Buzz_Score: SNS·뉴스·커뮤니티 화제성 기반 (0~100)
- Utility_Score: 실용성, 사용 편의성, 문제 해결력 기반 (0~100)
- Growth_Score: 최근 성장세, 신규 유저 유입 속도 기반 (0~100)
- Total_Score: 위 5개 점수의 가중 평균 (Usage 35% + Utility 25% + Buzz 20% + Tech 15% + Growth 5%)`;

// ============================================================
// 수집 조건 (Gemini에게 전달되는 핵심 요구사항)
// ============================================================
export const COLLECTION_RULES = `[핵심 요구사항]
1. 선정 기준: 실제 사용량, 기술력, 화제성을 종합하여 현재 가장 인기 있는 AI 도구를 선정
2. 툴 이름은 서비스 단위로만 (예: "ChatGPT" O, "ChatGPT-4o" X / "Grok" O, "Grok-3" X)
3. 중복 엄격 금지: 위 목록에 있는 툴은 절대 다시 언급하지 마세요
4. 반드시 지정된 개수를 채우세요`;

// ============================================================
// 출력 형식 지침
// ============================================================
export const OUTPUT_FORMAT = `[출력 형식]
반드시 순수 JSON 배열만 출력하세요. 마크다운 코드블록 없이.`;

// ============================================================
// Fallback Pool (API 실패 시 사용되는 백업 툴 목록)
// ============================================================
export const FALLBACK_POOL = [
  { name: "ChatGPT", url: "https://chatgpt.com", cat: "text" },
  { name: "Claude", url: "https://claude.ai", cat: "text" },
  { name: "Gemini", url: "https://gemini.google.com", cat: "text" },
  { name: "Midjourney", url: "https://midjourney.com", cat: "image" },
  { name: "DALL-E 3", url: "https://openai.com/dall-e-3", cat: "image" },
  { name: "Stable Diffusion", url: "https://stability.ai", cat: "image" },
  { name: "Runway Gen-3", url: "https://runwayml.com", cat: "video" },
  { name: "Luma Dream Machine", url: "https://lumalabs.ai", cat: "video" },
  { name: "Sora", url: "https://openai.com/sora", cat: "video" },
  { name: "GitHub Copilot", url: "https://github.com/features/copilot", cat: "code" },
  { name: "Cursor", url: "https://cursor.com", cat: "code" },
  { name: "Perplexity AI", url: "https://perplexity.ai", cat: "search" },
  { name: "NotebookLM", url: "https://notebooklm.google", cat: "text" },
  { name: "ElevenLabs", url: "https://elevenlabs.io", cat: "audio" },
  { name: "Suno", url: "https://suno.ai", cat: "audio" },
  { name: "Udio", url: "https://udio.com", cat: "audio" },
  { name: "HeyGen", url: "https://heygen.com", cat: "video" },
  { name: "Leonardo AI", url: "https://leonardo.ai", cat: "image" },
  { name: "v0.dev", url: "https://v0.dev", cat: "code" },
  { name: "Replit Agent", url: "https://replit.com", cat: "code" },
  { name: "Jasper", url: "https://jasper.ai", cat: "text" },
  { name: "Copy.ai", url: "https://copy.ai", cat: "text" },
  { name: "Synthesia", url: "https://synthesia.io", cat: "video" },
  { name: "Grammarly", url: "https://grammarly.com", cat: "text" },
  { name: "Canva Magic Studio", url: "https://canva.com", cat: "design" },
  { name: "Adobe Firefly", url: "https://adobe.com/sensei/generative-ai/firefly.html", cat: "image" },
  { name: "Gamma", url: "https://gamma.app", cat: "design" },
  { name: "DeepL", url: "https://deepl.com", cat: "text" },
  { name: "Poe", url: "https://poe.com", cat: "text" },
  { name: "Hugging Face", url: "https://huggingface.co", cat: "dev" },
  { name: "Character.ai", url: "https://character.ai", cat: "text" },
  { name: "InVideo", url: "https://invideo.io", cat: "video" },
  { name: "Beautiful.ai", url: "https://beautiful.ai", cat: "design" },
  { name: "Figma AI", url: "https://figma.com", cat: "design" }
];
