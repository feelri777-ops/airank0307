
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLS_PATH = path.join(__dirname, "../src/data/tools.js");

const UPDATES = {
  // Multimodal 대장들
  "ChatGPT": { cat: "multimodal", tags: ["멀티모달", "챗봇", "생산성", "GPT-4o"] },
  "Claude": { cat: "multimodal", tags: ["멀티모달", "글쓰기", "코딩", "200K"] },
  "Gemini": { cat: "multimodal", tags: ["멀티모달", "구글연동", "대화형", "1M"] },
  "DeepSeek": { cat: "multimodal", tags: ["멀티모달", "오픈소스", "추론", "수학"] },
  "Grok": { cat: "multimodal", tags: ["멀티모달", "실시간정보", "X연동"] },
  "Llama": { cat: "multimodal", tags: ["멀티모달", "오픈소스", "로컬실행"] },
  "Mistral AI": { cat: "multimodal", tags: ["멀티모달", "오픈소스", "유럽AI"] },
  "Poe": { cat: "multimodal", tags: ["멀티모달", "멀티모델허브", "채팅"] },
  "Meta AI": { cat: "multimodal", tags: ["멀티모달", "SNS연동", "Llama3"] },
  "Qwen": { cat: "multimodal", tags: ["멀티모달", "코드특화", "오픈소스"] },

  // 검색/연구 특화
  "Perplexity AI": { cat: "search", tags: ["AI검색", "실시간출처", "연구"] },
  "NotebookLM": { cat: "search", tags: ["논문분석", "연구", "요약", "오디오파일"] },
  "SciSpace": { cat: "search", tags: ["논문검색", "학술연구", "PDF분석"] },
  "Consensus": { cat: "search", tags: ["과학적근거", "논문검색", "학술"] },

  // 오디오/음악
  "Suno": { cat: "audio", tags: ["AI작곡", "음악생성", "보컬"] },
  "Udio": { cat: "audio", tags: ["AI작곡", "고품질음악", "음반수준"] },
  "ElevenLabs": { cat: "audio", tags: ["AI성우", "음성복제", "멀티링구얼"] },
  "Eleven Labs": { cat: "audio", tags: ["AI성우", "음성복제", "멀티링구얼"] },

  // 에이전트
  "Devin": { cat: "agent", tags: ["AI개발자", "프로그래밍", "자율코딩"] },
  "AutoGPT": { cat: "agent", tags: ["자율형AI", "태스크수행", "에이전트"] },
  "Cline": { cat: "agent", tags: ["VSCode에이전트", "자율코딩", "오픈소스"] },

  // 이미지/비디오 (기존 유지하되 태그 보강)
  "Midjourney": { cat: "image", tags: ["예술적생성", "디자인", "아트"] },
  "Sora": { cat: "video", tags: ["비디오생성", "OpenAI", "현실적"] },
  "Kling AI": { cat: "video", tags: ["고품질비디오", "현실감", "대세"] },
  "v0": { cat: "code", tags: ["웹프론트엔드", "React생성", "UI디자인"] },
};

function run() {
  const content = fs.readFileSync(TOOLS_PATH, "utf8");
  
  // { ... id: X, ... } 블록 단위로 쪼갬
  const tools = content.split(/\{(.*?\n\s+id: \d+,.*?)\}/gs);
  
  let newContent = tools[0];
  for (let i = 1; i < tools.length; i += 2) {
    let toolStr = tools[i];
    let tail = tools[i+1] || "";
    
    // 이 툴의 이름을 찾음
    const nameMatch = toolStr.match(/name:\s*["\'](.*?)["\']/);
    if (nameMatch) {
      const toolName = nameMatch[1];
      if (UPDATES[toolName]) {
        const update = UPDATES[toolName];
        console.log(`✅ [업데이트] ${toolName}: ${update.cat}`);
        
        // 카테고리 교체
        toolStr = toolStr.replace(/cat:\s*["\']\w+["\']/, `cat: "${update.cat}"`);
        // 태그 교체
        const tagsStr = update.tags.map(t => `"${t}"`).join(", ");
        toolStr = toolStr.replace(/tags:\s*\[.*?\]/, `tags: [${tagsStr}]`);
      }
    }
    newContent += `{${toolStr}}` + tail;
  }

  fs.writeFileSync(TOOLS_PATH, newContent, "utf8");
  console.log("\n🚀 src/data/tools.js 전수 수정 및 카테고리 최적화 완료!");
}

run();
