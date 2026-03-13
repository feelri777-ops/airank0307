import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PLATFORM_DOMAINS = [
  "openai.com",
  "google.com",
  "microsoft.com",
  "adobe.com",
  "amazon.com",
  "aws.amazon.com",
  "github.com",
  "meta.com",
  "facebook.com",
  "apple.com"
];

async function checkDomainAccuracy() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
  
  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const lines = rawCsv.split('\n').filter(line => line.trim() !== '');
  
  const suspectTools = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;
    
    const id = cols[0].trim();
    const name = cols[1].trim();
    const domain = cols[2].trim().toLowerCase();
    
    let issue = "";
    
    // 1. 플랫폼 도메인만 달랑 써서 통계 왜곡이 확실시되는 경우
    if (PLATFORM_DOMAINS.includes(domain)) {
      issue = `Platform main domain only (Statistical noise likely)`;
    }
    // 2. 주소가 너무 단순하거나 하위 경로가 빠진 것으로 의심되는 경우
    else if (!domain.includes(".") || (domain.split(".").length < 2)) {
      issue = "Invalid or overly simple domain";
    }
    // 3. 특정 거대 플랫폼의 다른 도구가 알려진 공식 도메인이 따로 있는 경우 (추론)
    else if (name.toLowerCase().includes("google") && !domain.includes("google")) {
       // Check for brand mismatch
    }

    if (issue) {
      suspectTools.push({ id, name, domain, issue });
    }
  }

  console.log(`\n=== 도메인 확인 필요 대상 (총 ${suspectTools.length}개) ===\n`);
  suspectTools.forEach(t => {
    console.log(`[${t.id.padStart(3)}] ${t.name.padEnd(20)} | Current: ${t.domain.padEnd(30)} | Issue: ${t.issue}`);
  });
}

checkDomainAccuracy();
