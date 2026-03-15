import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PLATFORM_PENALTY_MAP = {
  "aws.amazon.com": 0.5,
  "amazon.com": 0.5,
  "google.com": 0.5,
  "microsoft.com": 0.5,
  "azure.microsoft.com": 0.5,
  "adobe.com": 0.5,
  "apple.com": 0.5,
  "github.com": 0.5,
  "facebook.com": 0.5,
  "bing.com": 0.5,
  "zoom.us": 0.5,
  "slack.com": 0.5,
  "canva.com": 0.5,
  "figma.com": 0.5,
  "notion.so": 0.5
};

const PENALTY_EXCEPTIONS = ["Canva AI", "Figma AI", "Notion AI", "Adobe Firefly"];

function getSmartPenalty(domain, toolName) {
  if (!domain) return 1.0;

  if (PENALTY_EXCEPTIONS.includes(toolName)) return { penalty: 1.0, reason: "Core Platform AI (Exception)" };

  const domainLower = domain.toLowerCase();
  const toolNameLower = toolName.toLowerCase().replace(/\s/g, "").replace(/-/g, "").replace(/\./g, "");
  
  const platforms = ["amazon", "google", "microsoft", "adobe", "apple", "facebook", "github"];
  let coreName = toolNameLower;
  platforms.forEach(p => coreName = coreName.replace(p, ""));
  
  const [host, ...pathParts] = domainLower.split("/");
  const pathPart = pathParts.join("/");
  const pathClean = pathPart.replace(/-/g, "").replace(/_/g, "");

  // 1. 이름이 경로(/ 뒤)에 있는 경우 -> 50% 페널티
  if (coreName.length > 2 && pathClean.includes(coreName)) return { penalty: 0.5, reason: "Path includes tool name" };

  // 2. 이름이 호스트(도메인 주소)에 있는 경우 -> 독립 브랜드 인정 (면제)
  if (coreName.length > 2 && host.includes(coreName)) return { penalty: 1.0, reason: "Independent Brand Host" };

  // 3. 거대 플랫폼 도메인인 경우 -> 50% 페널티
  for (const p in PLATFORM_PENALTY_MAP) {
    if (host.includes(p)) return { penalty: 0.5, reason: `Platform Domain (${p})` };
  }
  
  return { penalty: 1.0, reason: "No Penalty" };
}

async function analyzePenalties() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
  
  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const lines = rawCsv.split('\n').filter(line => line.trim() !== '');
  
  const penalizedTools = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;
    
    const name = cols[1].trim();
    const domain = cols[2].trim();
    
    const result = getSmartPenalty(domain, name);
    if (result.penalty < 1.0) {
      penalizedTools.push({
        id: cols[0].trim(),
        name,
        domain,
        reason: result.reason
      });
    }
  }

  console.log(`\n=== 감점(페널티) 적용 도구 리스트 (총 ${penalizedTools.length}개) ===\n`);
  penalizedTools.forEach(t => {
    console.log(`[${t.id}] ${t.name.padEnd(20)} | Domain: ${t.domain.padEnd(40)} | 사유: ${t.reason}`);
  });
}

analyzePenalties();
