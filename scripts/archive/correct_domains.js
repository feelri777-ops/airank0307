import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CORRECTIONS = {
  "ChatGPT": "chatgpt.com",
  "DALL-E 3": "openai.com/dall-e-3",
  "Adobe Firefly": "adobe.com/products/firefly",
  "Amazon Nova": "nova.amazon.com",
  "Amazon Q Developer": "aws.amazon.com/q/developer",
  "Adobe Express": "adobe.com/express",
  "Canva AI": "canva.com/magic-studio",
  "Figma AI": "figma.com/ai",
  "Notion AI": "notion.so/product/ai",
  "ClickUp AI": "clickup.com/ai",
  "Zapier AI": "zapier.com/ai",
  "Bing Image Creator": "bing.com/images/create",
  "JetBrains AI": "jetbrains.com/ai",
  "Duolingo Max": "duolingo.com/max",
  "Intercom Fin": "intercom.com/fin",
  "Gemma": "ai.google.dev/gemma",
  "Phi-4": "azure.microsoft.com/phi"
};

async function applyDomainCorrections() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error("CSV 파일을 찾을 수 없습니다.");
    return;
  }

  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const lines = rawCsv.split('\n');
  const header = lines[0];
  const newLines = [header];

  let correctedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split('\t');
    if (cols.length < 3) {
      newLines.push(lines[i]);
      continue;
    }

    const id = cols[0].trim();
    const name = cols[1].trim();
    const currentDomain = cols[2].trim();

    if (CORRECTIONS[name]) {
      const newDomain = CORRECTIONS[name];
      if (currentDomain !== newDomain) {
        console.log(`[${id}] ${name}: ${currentDomain} -> ${newDomain}`);
        cols[2] = newDomain;
        correctedCount++;
      }
    }
    
    newLines.push(cols.join('\t'));
  }

  if (correctedCount > 0) {
    fs.writeFileSync(csvPath, newLines.join('\n'), 'utf8');
    console.log(`\n✅ 총 ${correctedCount}개의 도메인 주소가 실시간 정보로 갱신되었습니다.`);
  } else {
    console.log("\n변경할 대상이 없습니다.");
  }
}

applyDomainCorrections();
