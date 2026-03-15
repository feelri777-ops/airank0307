import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function exportJsonToCsv() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const today = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(today.getTime() + kstOffset);
  const dateStr = kstDate.toISOString().split('T')[0];
  
  const jsonPath = path.join(__dirname, '..', 'public', 'history', `scores-${dateStr}.json`);
  const csvDataPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
  const outputPath = path.join(__dirname, '..', `ai_rank_report_${dateStr}.csv`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`JSON 파일을 찾을 수 없습니다: ${jsonPath}`);
    return;
  }

  // 1. JSON 읽기
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const scores = jsonData.tools;

  // 2. 도구 정보(이름, 도메인) 매핑을 위해 원본 CSV 읽기
  const rawCsv = fs.readFileSync(csvDataPath, 'utf8');
  const lines = rawCsv.split('\n').filter(l => l.trim());
  const toolMap = {};
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;
    toolMap[cols[0].trim()] = {
      name: cols[1].trim(),
      domain: cols[2].trim()
    };
  }

  // 3. 리포트 생성을 위한 리스트 정렬
  const reportList = Object.entries(scores).map(([id, data]) => {
    const info = toolMap[id] || { name: 'Unknown', domain: 'Unknown' };
    return {
      id,
      name: info.name,
      domain: info.domain,
      score: data.score,
      metrics: data.metrics,
      change: data.change || 0
    };
  }).sort((a, b) => b.score - a.score);

  // 4. CSV 쓰기 (Excel 한글 깨짐 방지 BOM 추가)
  let csvContent = '\uFEFF';
  csvContent += '순위,ID,툴이름,도메인,종합점수,변동,구글(50%),네이버(25%),GitHub(10%),SNS(15%)\n';
  
  reportList.forEach((item, index) => {
    const m = item.metrics || {};
    csvContent += `${index + 1},${item.id},"${item.name}","${item.domain}",${item.score},${item.change},${m.opr || 0},${m.ntv || 0},${m.ghs || 0},${m.sns || 0}\n`;
  });

  fs.writeFileSync(outputPath, csvContent, 'utf8');
  console.log(`✅ 리포트 생성 완료: ${outputPath}`);
}

exportJsonToCsv();
