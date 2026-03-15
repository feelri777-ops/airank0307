import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const W_OPR = 0.50;
const W_NTV = 0.25;
const W_GHS = 0.10;
const W_SNS = 0.15;

async function fastNormalizationSync() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const scoresPath = path.join(__dirname, '..', 'public', 'scores.json');
  
  if (!fs.existsSync(scoresPath)) return;
  const data = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));
  const tools = data.tools;

  // 1단계: 최대 페널티 적용된 OPR 찾기
  let maxPenalizedOpr = 0.1;
  for (const id in tools) {
    const opr = tools[id].metrics.opr || 0;
    if (opr > maxPenalizedOpr) maxPenalizedOpr = opr;
  }

  console.log(`[FastSync] Current Max OPR in data: ${maxPenalizedOpr}`);

  // 2단계: 정규화 및 전체 점수 재산출
  for (const id in tools) {
    const t = tools[id];
    const penalizedOpr = t.metrics.opr || 0;
    const normalizedOpr = Number(((penalizedOpr / maxPenalizedOpr) * 100).toFixed(2));
    
    const ntv = t.metrics.ntv || 0;
    const ghs = t.metrics.ghs || 0;
    const sns = t.metrics.sns || 0;
    
    const totalScore = Number(((normalizedOpr * W_OPR) + (ntv * W_NTV) + (ghs * W_GHS) + (sns * W_SNS)).toFixed(2));
    
    t.score = totalScore;
    t.metrics.opr = normalizedOpr;
  }

  data.updated = new Date().toISOString();
  fs.writeFileSync(scoresPath, JSON.stringify(data, null, 2), 'utf8');
  console.log("✅ [FastSync] scores.json 정규화 및 재산출 완료!");
}

fastNormalizationSync();
