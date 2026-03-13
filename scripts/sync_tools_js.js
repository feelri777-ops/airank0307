import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function syncScoresToToolsJs() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const scoresPath = path.join(__dirname, '..', 'public', 'scores.json');
  const toolsJsPath = path.join(__dirname, '..', 'src', 'data', 'tools.js');

  if (!fs.existsSync(scoresPath)) return;
  const scoresData = JSON.parse(fs.readFileSync(scoresPath, 'utf8')).tools;

  let toolsJsContent = fs.readFileSync(toolsJsPath, 'utf8');

  // 각 도구별로 score와 change를 업데이트
  for (const id in scoresData) {
    const { score, change } = scoresData[id];
    
    // id: [ID] 패턴 뒤의 score와 change 값을 찾아서 교체
    // 정규식 설명: id: [ID] 로 시작해서 다음 객체 닫기(}) 전까지의 score: [NUM] 과 change: [NUM] 을 찾음
    const idPattern = new RegExp(`id:\\s*${id},[\\s\\S]*?score:\\s*([\\d.-]+)`, 'm');
    const changePattern = new RegExp(`id:\\s*${id},[\\s\\S]*?change:\\s*([\\d.-]+)`, 'm');

    if (toolsJsContent.match(idPattern)) {
      toolsJsContent = toolsJsContent.replace(idPattern, (match, p1) => match.replace(`score: ${p1}`, `score: ${score}`));
    }
    if (toolsJsContent.match(changePattern)) {
      toolsJsContent = toolsJsContent.replace(changePattern, (match, p1) => match.replace(`change: ${p1}`, `change: ${change}`));
    }
  }

  fs.writeFileSync(toolsJsPath, toolsJsContent, 'utf8');
  console.log("✅ [Sync] scores.json -> src/data/tools.js 동기화 완료!");
}

syncScoresToToolsJs();
