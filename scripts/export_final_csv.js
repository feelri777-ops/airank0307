import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOOLS_DATA } from '../src/data/tools.js';

const PLATFORM_PENALTY_MAP = {
  "aws.amazon.com": 0.5, "amazon.com": 0.5, "google.com": 0.5,
  "microsoft.com": 0.5, "azure.microsoft.com": 0.5, "adobe.com": 0.5,
  "apple.com": 0.5, "github.com": 0.5, "facebook.com": 0.5,
  "bing.com": 0.5, "zoom.us": 0.5, "slack.com": 0.5,
  "canva.com": 0.5, "figma.com": 0.5, "notion.so": 0.5
};

const PENALTY_EXCEPTIONS = ["Canva AI", "Figma AI", "Notion AI", "Adobe Firefly"];

function getSmartPenalty(domain, toolName) {
  if (!domain) return { p: 1.0, r: "-" };
  if (PENALTY_EXCEPTIONS.includes(toolName)) return { p: 1.0, r: "핵심 브랜드 예외 인정" };
  
  const domainLower = domain.toLowerCase();
  const toolNameLower = toolName.toLowerCase().replace(/\s/g, "").replace(/-/g, "").replace(/\./g, "");
  const platforms = ["amazon", "google", "microsoft", "adobe", "apple", "facebook", "github"];
  let coreName = toolNameLower;
  platforms.forEach(p => coreName = coreName.replace(p, ""));
  
  const [host, ...pathParts] = domainLower.split("/");
  const pathPart = pathParts.join("/");
  const pathClean = pathPart.replace(/-/g, "").replace(/_/g, "");

  if (coreName.length > 2 && pathClean.includes(coreName)) return { p: 0.5, r: "하위 경로 페널티 (종속 서비스)" };
  if (coreName.length > 2 && host.includes(coreName)) return { p: 1.0, r: "독립 브랜드 호스트" };

  for (const p in PLATFORM_PENALTY_MAP) {
    if (host.includes(p)) return { p: 0.5, r: `플랫폼 도메인 (${p}) 종속` };
  }
  return { p: 1.0, r: "독립 서비스" };
}

async function exportToCsv() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
  const scoresPath = path.join(__dirname, '..', 'public', 'scores.json');
  
  if (!fs.existsSync(scoresPath)) {
    console.error("scores.json 파일을 찾을 수 없습니다.");
    return;
  }

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
    
    const toolInfo = TOOLS_DATA.find(t => String(t.id) === id) || {};
    const naverKw = Array.isArray(toolInfo.naverKw) ? toolInfo.naverKw.join('|') : (toolInfo.naverKw || '-');

    const penaltyInfo = getSmartPenalty(domain, name);
    const scoreData = scores[id] || { score: 0, metrics: {} };
    
    report.push({
      id, name, domain,
      totalScore: scoreData.score,
      metrics: scoreData.metrics,
      isPenalized: penaltyInfo.p < 1.0 ? "대상" : "해당없음",
      reason: penaltyInfo.r,
      naverKw
    });
  }

  // 전체 순위 정렬
  const sortedReport = report.sort((a, b) => b.totalScore - a.totalScore);
  
  // CSV 헤더 (Excel 한글 깨짐 방지 BOM 추가)
  let csvContent = '\uFEFF';
  csvContent += '순위,툴 이름,도메인,종합점수,구글(OPR 점수),원본 OPR 등급,네이버(NTV),SNS(XPOZ),GitHub(GHS),패널티 유무,패널티 이유,네이버 수집 키워드,SNS/GitHub 키워드\n';
  
  sortedReport.forEach((t, idx) => {
    const m = t.metrics || {};
    const snsKw = TOOLS_DATA.find(tool => String(tool.id) === t.id)?.github || t.name;
    const row = [
      idx + 1,
      `"${t.name}"`,
      `"${t.domain}"`,
      t.totalScore,
      m.opr || 0,
      `"${(m.opr / 10).toFixed(2)} / 10"`, // normalized OPR / 10 to show raw-ish rank
      m.ntv || 0,
      m.sns || 0,
      m.ghs || 0,
      t.isPenalized,
      `"${t.reason}"`,
      `"${t.naverKw}"`,
      `"X:${t.name} | GH:${snsKw}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const outputPath = path.join(__dirname, '..', 'ai_rank_final_report_detail.csv');
  try {
    fs.writeFileSync(outputPath, csvContent, 'utf8');
    console.log(`✅ [CSV 생성 완료] ${outputPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const fallback = path.join(__dirname, '..', `ai_rank_final_report_detail_${Date.now()}.csv`);
      fs.writeFileSync(fallback, csvContent, 'utf8');
      console.log(`⚠️ 원본 사용 중. 파일 저장: ${fallback}`);
    } else {
      throw err;
    }
  }
}

exportToCsv();
