import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PLATFORM_PENALTY_MAP = {
  "aws.amazon.com": 0.5, "amazon.com": 0.5, "google.com": 0.5,
  "microsoft.com": 0.5, "azure.microsoft.com": 0.5, "adobe.com": 0.5,
  "apple.com": 0.5, "github.com": 0.5, "facebook.com": 0.5,
  "bing.com": 0.5, "zoom.us": 0.5, "slack.com": 0.5,
  "canva.com": 0.5, "figma.com": 0.5, "notion.so": 0.5
};

const PENALTY_EXCEPTIONS = ["Canva AI", "Figma AI", "Notion AI", "Adobe Firefly"];

function getSmartPenalty(domain, toolName) {
  if (!domain) return { p: 1.0, r: "N/A" };
  if (PENALTY_EXCEPTIONS.includes(toolName)) return { p: 1.0, r: "Core Brand Exception" };
  
  const domainLower = domain.toLowerCase();
  const toolNameLower = toolName.toLowerCase().replace(/\s/g, "").replace(/-/g, "").replace(/\./g, "");
  const platforms = ["amazon", "google", "microsoft", "adobe", "apple", "facebook", "github"];
  let coreName = toolNameLower;
  platforms.forEach(p => coreName = coreName.replace(p, ""));
  
  const [host, ...pathParts] = domainLower.split("/");
  const pathPart = pathParts.join("/");
  const pathClean = pathPart.replace(/-/g, "").replace(/_/g, "");

  if (coreName.length > 2 && pathClean.includes(coreName)) return { p: 0.5, r: "Path includes tool name" };
  if (coreName.length > 2 && host.includes(coreName)) return { p: 1.0, r: "Independent Host" };

  for (const p in PLATFORM_PENALTY_MAP) {
    if (host.includes(p)) return { p: 0.5, r: `Platform Domain (${p})` };
  }
  return { p: 1.0, r: "None" };
}

async function generateSummary() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
  const scoresPath = path.join(__dirname, '..', 'public', 'scores.json');
  
  const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8')).tools;
  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const lines = rawCsv.split('\n').filter(l => l.trim());
  
  const report = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;
    const id = cols[0].trim();
    const name = cols[1].trim();
    const domain = cols[2].trim();
    
    const penaltyInfo = getSmartPenalty(domain, name);
    const scoreData = scores[id] || { score: 0, metrics: {} };
    
    report.push({
      id, name, domain,
      totalScore: scoreData.score,
      metrics: scoreData.metrics,
      isPenalized: penaltyInfo.p < 1.0 ? "O" : "X",
      reason: penaltyInfo.r
    });
  }

  // 상위 30개만 우선 출력 (전체는 너무 길 수 있음)
  const topN = report.sort((a, b) => b.totalScore - a.totalScore).slice(0, 40);
  
  console.log("| 순위 | 툴 이름 | 도메인 | 패널티 | 패널티 사유 | 종합점수 | 세부(G/N/S/GH) |");
  console.log("| :--- | :--- | :--- | :---: | :--- | :---: | :--- |");
  topN.forEach((t, idx) => {
    const m = t.metrics;
    const detail = `${m.opr || 0}/${m.ntv || 0}/${m.sns || 0}/${m.ghs || 0}`;
    console.log(`| ${idx + 1} | ${t.name} | \`${t.domain}\` | ${t.isPenalized} | ${t.reason} | **${t.totalScore}** | ${detail} |`);
  });
}

generateSummary();
