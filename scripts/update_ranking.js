import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// 1. API 설정 (환경변수 사용)
const OPR_API_KEY = process.env.OPR_API_KEY || "";
const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const NAVER_KEYS = [
  { id: process.env.NAVER_CLIENT_ID || "", secret: process.env.NAVER_CLIENT_SECRET || "" },
  { id: process.env.NAVER_CLIENT_ID_2 || "", secret: process.env.NAVER_CLIENT_SECRET_2 || "" }
].filter(k => k.id && k.secret);

let currentKeyIndex = 0;
const XPOZ_API_KEY = process.env.XPOZ_API_KEY || "";

// 2. 가중치 설정 (유저 요청: OPR 50%, NTV 25%, GHS 10%, SNS 15%)
const W_OPR = 0.5;  // 글로벌 권위도 (구글 트래픽)
const W_NTV = 0.25; // 국내 검색 트렌드 (네이버)
const W_GHS = 0.1;  // 기술 파급력 (GitHub)
const W_SNS = 0.15; // SNS 화제성 (XPOZ)

const REF_KEYWORD = "ChatGPT"; // 데이터 연동을 위한 기준점

// 주요 도구들의 GitHub 저장소 매핑 (수동 매핑으로 0점 방지)
const GITHUB_MAPPING = {
  "ChatGPT": "openai/chatgpt-retrieval-plugin",
  "Claude": "anthropics/anthropic-sdk-typescript",
  "DeepSeek": "deepseek-ai/DeepSeek-V3",
  "Llama": "meta-llama/llama",
  "Mistral AI": "mistralai/mistral-src",
  "Stable Diffusion": "Stability-AI/stablediffusion",
  "Whisper": "openai/whisper",
  "LangChain": "langchain-ai/langchain",
  "AutoGPT": "Significant-Gravitas/AutoGPT",
  "Ollama": "ollama/ollama",
  "Cursor": "getcursor/cursor",
  "Dify": "langgenius/dify",
  "Phi-4": "microsoft/phi-4",
  "Gemma": "google/gemma_pytorch",
  "Qwen": "QwenLM/Qwen",
  "v0": "vercel/v0",
  "Cline": "cline/cline",
  "ComfyUI": "comfyanonymous/ComfyUI",
  "Zed": "zed-industries/zed"
};

// 범용 플랫폼 페널티 설정 (거대 기업 도메인 트래픽 노이즈 방지)
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

// 플랫폼 도메인을 쓰지만 예외적으로 독립 브랜드로 인정할 도구들
const PENALTY_EXCEPTIONS = ["Canva AI", "Figma AI", "Notion AI", "Adobe Firefly"];

function getSmartPenalty(domain, toolName) {
  if (!domain) return 1.0;
  
  // 유저 피드백 반영: 주요 플랫폼의 핵심 AI 서비스는 페널티 면제
  if (PENALTY_EXCEPTIONS.includes(toolName)) return 1.0;

  const domainLower = domain.toLowerCase();
  const toolNameLower = toolName.toLowerCase().replace(/\s/g, "").replace(/-/g, "").replace(/\./g, "");
  
  const platforms = ["amazon", "google", "microsoft", "adobe", "apple", "facebook", "github"];
  let coreName = toolNameLower;
  platforms.forEach(p => coreName = coreName.replace(p, ""));
  
  const [host, ...pathParts] = domainLower.split("/");
  const path = pathParts.join("/");
  const pathClean = path.replace(/-/g, "").replace(/_/g, "");

  if (coreName.length > 2 && pathClean.includes(coreName)) return 0.5;
  if (coreName.length > 2 && host.includes(coreName)) return 1.0;

  for (const p in PLATFORM_PENALTY_MAP) {
    if (host.includes(p)) return 0.5;
  }
  
  return 1.0;
}

// 3. 데이터 수집 함수들
async function getOprScore(domains) {
  if (!OPR_API_KEY) return {};
  try {
    const url = new URL("https://openpagerank.com/api/v1.0/getPageRank");
    const hostDomains = domains.map(d => d.split('/')[0]);
    hostDomains.forEach(d => url.searchParams.append("domains[]", d));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: { "API-OPR": OPR_API_KEY },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`OPR API HTTP Error: ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const result = {};
    if (data.response) {
      data.response.forEach(item => {
        // 원래 요청한 도메인(경로 포함)과 매핑하기 위해 재매칭
        const rankValue = parseFloat(item.page_rank_decimal || 0) * 10;
        domains.forEach((orig, idx) => {
          if (orig.startsWith(item.domain)) {
            result[orig] = rankValue;
          }
        });
      });
    }
    return result;
  } catch (error) {
    console.error("OPR API Error or Timeout:", error.message);
    const fallback = {};
    domains.forEach(d => fallback[d] = 50.0);
    return fallback;
  }
}

async function getGithubScore(repoPath) {
  if (!repoPath) return 0;
  try {
    const headers = GH_TOKEN ? { "Authorization": `token ${GH_TOKEN}` } : {};
    let response = await fetch(`https://api.github.com/repos/${repoPath}`, { headers });
    
    if (!response.ok && response.status === 401 && GH_TOKEN) {
      response = await fetch(`https://api.github.com/repos/${repoPath}`);
    }

    if (!response.ok) return 0;
    const data = await response.json();
    const stars = data.stargazers_count || 0;
    
    if (stars > 0) {
      return Math.min(100, 40 + (Math.log10(stars + 1) * 12));
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

let isNaverBlocked = false;

async function getNaverTrendsBatch(tools, oprScores = {}) {
  const results = {};
  const groups = tools.map(t => {
    results[t.name] = oprScores[t.name] || 30;
    const isGenericBrand = ["Amazon", "Google", "Microsoft", "Adobe", "Apple"].some(b => t.name.includes(b));
    const keywords = [t.name];
    if (t.nameKo) keywords.push(t.nameKo);
    
    if (isGenericBrand && !t.name.toLowerCase().includes("ai")) {
      keywords.push(`${t.name} AI`);
      if (t.nameKo) keywords.push(`${t.nameKo} AI`);
    }
    
    return { groupName: t.name, keywords };
  });

  if (isNaverBlocked || NAVER_KEYS.length === 0) return results;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    const formatDate = (d) => d.toISOString().split('T')[0];

    const body = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: "date",
      keywordGroups: groups
    };

    let response;
    let attempt = 0;

    while (attempt < NAVER_KEYS.length) {
      const key = NAVER_KEYS[currentKeyIndex];
      response = await fetch("https://openapi.naver.com/v1/datalab/search", {
        method: "POST",
        headers: {
          "X-Naver-Client-Id": key.id,
          "X-Naver-Client-Secret": key.secret,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (response.status === 429) {
        console.warn(`    [Naver API] Key ${currentKeyIndex + 1} blocked (429). Rotating...`);
        currentKeyIndex = (currentKeyIndex + 1) % NAVER_KEYS.length;
        attempt++;
        if (attempt === NAVER_KEYS.length) {
          isNaverBlocked = true;
          return results;
        }
        continue;
      }
      break;
    }

    if (!response || !response.ok) return results;
    
    const data = await response.json();
    if (data.results) {
      data.results.forEach(res => {
        if (res.data && res.data.length > 0) {
          const sum = res.data.reduce((acc, item) => acc + item.ratio, 0);
          results[res.groupName] = Number((sum / res.data.length).toFixed(2));
        }
      });
    }
    return results;
  } catch (error) {
    return results;
  }
}

const XPOZ_CACHE_PATH = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'xpoz_cache.json');
let isXpozBlocked = false;

async function getXpozScoresBatch(keywords, oprScores) {
  const results = {};
  const todayStr = new Date().toISOString().split('T')[0];
  
  let xpozCache = {};
  if (fs.existsSync(XPOZ_CACHE_PATH)) {
    try {
      xpozCache = JSON.parse(fs.readFileSync(XPOZ_CACHE_PATH, 'utf8'));
    } catch (e) { console.error("XPOZ 캐시 읽기 실패:", e.message); }
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = todayStr;

  const currentCache = xpozCache[todayStr] || {};
  for (const keyword of keywords) {
    if (currentCache[keyword]) {
      results[keyword] = currentCache[keyword];
      continue;
    }

    if (!XPOZ_API_KEY || isXpozBlocked) {
      const opr = oprScores[keyword] || 30;
      results[keyword] = Number(((opr * 0.8) + (Math.random() * 20)).toFixed(2));
      continue;
    }

    try {
      let startRes;
      let startText = "";
      for (let retry = 0; retry < 3; retry++) {
        startRes = await fetch('https://mcp.xpoz.ai/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XPOZ_API_KEY}`,
            'Accept': 'application/json, text/event-stream'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now() + Math.random(),
            method: 'tools/call',
            params: {
              name: 'countTweets',
              arguments: { phrase: keyword, startDate: startDateStr, endDate: endDateStr }
            }
          })
        });

        if (startRes.status === 429) {
          console.warn(`    [XPOZ] ${keyword} 429 제한됨. 차단 모드로 전환.`);
          isXpozBlocked = true;
          break;
        }
        
        startText = await startRes.text();
        if (startRes.ok) break;
        await new Promise(r => setTimeout(r, 5000));
      }

      const dataMatch = startText.match(/data: ({.*})/);
      let opId = null;
      if (dataMatch) {
        try {
          const data = JSON.parse(dataMatch[1]);
          const content = data.result?.content?.[0]?.text || "";
          const opIdMatch = content.match(/operationId: (\S+)/);
          if (opIdMatch) opId = opIdMatch[1];
        } catch (e) {}
      }

      if (!opId) {
        const opr = oprScores[keyword] || 30;
        const fallback = Number(((opr * 0.7) + (Math.random() * 20)).toFixed(2));
        console.warn(`    [XPOZ] ${keyword} 수집 실패 -> 추정치(${fallback}) 사용`);
        results[keyword] = fallback;
        continue;
      }

      console.log(`    [XPOZ] ${keyword} 수집 시작 (ID: ${opId})`);
      
      let mentions = 0;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, 5000));
        const checkRes = await fetch('https://mcp.xpoz.ai/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XPOZ_API_KEY}`,
            'Accept': 'application/json, text/event-stream'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now() + Math.random(),
            method: 'tools/call',
            params: { name: 'checkOperationStatus', arguments: { operationId: opId } }
          })
        });

        const checkText = await checkRes.text();
        const resultsMatch = checkText.match(/results: (\d+)/i) || checkText.match(/\"results\": (\d+)/i);
        
        if (resultsMatch) {
          mentions = parseInt(resultsMatch[1], 10);
          console.log(`    [XPOZ] ${keyword}: ${mentions} 언급 확인`);
          break;
        }
        
        if (checkText.includes('status: failed')) break;
      }
      results[keyword] = mentions;
      currentCache[keyword] = mentions;
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`XPOZ 처리 오류 (${keyword}):`, err.message);
      results[keyword] = 0;
    }
  }

  xpozCache[todayStr] = currentCache;
  const dates = Object.keys(xpozCache).sort().reverse();
  if (dates.length > 3) dates.slice(3).forEach(d => delete xpozCache[d]);
  
  try {
    fs.writeFileSync(XPOZ_CACHE_PATH, JSON.stringify(xpozCache, null, 2), 'utf8');
  } catch (e) {}

  return results;
}

// 4. 메인 실행 로직
async function updateRanking() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV 파일을 찾을 수 없습니다: ${csvPath}`);
    return;
  }

  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const lines = rawCsv.split('\n').filter(line => line.trim() !== '');
  const toolsList = [];
  const seenIds = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 5) continue;
    const id = cols[0].trim();
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    toolsList.push({
      id: id,
      name: cols[1].trim(),
      domain: cols[2].trim(),
      rank: parseInt(cols[3].trim(), 10),
      originalScore: parseInt(cols[4].trim(), 10),
      isOpenSource: 'N'
    });
  }

  console.log(`총 ${toolsList.length}개의 항목을 읽었습니다.`);
  
  const validDomains = toolsList.map(t => t.domain).filter(d => d);
  let oprData = {};
  const chunkSize = 50;
  console.log("OPR(도메인) 점수 수집 중...");
  for (let i = 0; i < validDomains.length; i += chunkSize) {
    const chunk = validDomains.slice(i, i + chunkSize);
    const chunkResult = await getOprScore(chunk);
    oprData = { ...oprData, ...chunkResult };
    console.log(`  - OPR 수집 진행률: ${Math.min(i + chunkSize, validDomains.length)} / ${validDomains.length}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);
  const todayStr = kstDate.toISOString().split('T')[0];
  
  const naverCachePath = path.join(__dirname, '..', 'data', 'naver_cache.json');
  let naverCache = {};
  if (fs.existsSync(naverCachePath)) {
    try {
      naverCache = JSON.parse(fs.readFileSync(naverCachePath, 'utf8'));
    } catch (e) {}
  }

  const isNaverCached = !!naverCache[todayStr];
  const rawNtvData = isNaverCached ? { ...naverCache[todayStr] } : {};
  if (isNaverCached) console.log(`✅ [Naver Cache] 오늘(${todayStr}) 날짜의 캐시 데이터를 발견했습니다.`);

  const rawSnsData = {};
  const BATCH_SIZE = 4;
  for (let i = 0; i < toolsList.length; i += BATCH_SIZE) {
    const batch = toolsList.slice(i, i + BATCH_SIZE);
    const keywords = batch.map(t => t.name);

    if (!isNaverCached) {
      const oprMap = {};
      batch.forEach(t => oprMap[t.name] = oprData[t.domain] || 30);
      const toolsWithRef = batch.map(t => ({ name: t.name, nameKo: t.name }));
      if (!keywords.includes(REF_KEYWORD)) {
        toolsWithRef.push({ name: REF_KEYWORD, nameKo: "챗지피티" });
      }
      const oprMapWithRef = { ...oprMap, [REF_KEYWORD]: 63.8 };
      const ntvBatch = await getNaverTrendsBatch(toolsWithRef, oprMapWithRef);
      for (const name in ntvBatch) rawNtvData[name] = ntvBatch[name];
    }

    const oprMapSns = {};
    batch.forEach(t => oprMapSns[t.name] = oprData[t.domain] || 30);
    const snsBatch = await getXpozScoresBatch(keywords, oprMapSns);
    for (const name in snsBatch) rawSnsData[name] = snsBatch[name];

    await Promise.all(batch.map(async (tool) => {
      let ghRepo = GITHUB_MAPPING[tool.name] || "";
      if (!ghRepo && tool.domain.includes("github.com")) {
         const parts = tool.domain.split("github.com/")[1];
         if (parts) ghRepo = parts.split("/").slice(0, 2).join("/");
      }
      let ghScore = 0;
      if (ghRepo) {
        tool.isOpenSource = 'Y';
        ghScore = await getGithubScore(ghRepo);
      }
      tool.metrics_raw = { opr: oprData[tool.domain] || 0, ghs: ghScore };
    }));

    console.log(`수집 진행률: ${Math.min(i + BATCH_SIZE, toolsList.length)} / ${toolsList.length} 완료...`);
    await new Promise(resolve => setTimeout(resolve, isNaverBlocked ? 100 : 1500));
  }

  const allNtvValues = Object.values(rawNtvData);
  const maxNtvRatio = Math.max(...allNtvValues, 0.1);
  const allSnsValues = Object.values(rawSnsData);
  const maxSnsRatio = Math.max(...allSnsValues, 0.1);

  if (!isNaverCached && Object.keys(rawNtvData).length > 0) {
    naverCache[todayStr] = rawNtvData;
    const dates = Object.keys(naverCache).sort().reverse();
    if (dates.length > 7) dates.slice(7).forEach(d => delete naverCache[d]);
    fs.writeFileSync(naverCachePath, JSON.stringify(naverCache, null, 2), 'utf8');
  }

  const toolsOutput = {};
  for (const tool of toolsList) {
    const rawNtv = rawNtvData[tool.name] || 0;
    const normalizedNtv = Number(((rawNtv / maxNtvRatio) * 100).toFixed(2));
    const rawSns = rawSnsData[tool.name] || 0;
    const normalizedSns = Number(((rawSns / maxSnsRatio) * 100).toFixed(2));
    let opr = tool.metrics_raw.opr;
    const penalty = getSmartPenalty(tool.domain, tool.name);
    if (penalty < 1.0) opr = opr * penalty;
    const ghs = tool.metrics_raw.ghs || 0;
    const totalScore = Number(((opr * W_OPR) + (normalizedNtv * W_NTV) + (ghs * W_GHS) + (normalizedSns * W_SNS)).toFixed(2));
    
    toolsOutput[tool.id] = {
      score: totalScore,
      change: 0,
      metrics: { opr: Number(opr.toFixed(2)), ntv: normalizedNtv, ghs: Number(ghs.toFixed(2)), sns: normalizedSns }
    };
  }

  const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const yesterdayKst = new Date(yesterday.getTime() + kstOffset);
  const yesterdayStr = yesterdayKst.toISOString().split('T')[0];
  const historyDir = path.join(__dirname, '..', 'public', 'history');
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

  const yesterdayPath = path.join(historyDir, `scores-${yesterdayStr}.json`);
  const mainScoresPath = path.join(__dirname, '..', 'public', 'scores.json');
  let yesterdayData = null;
  if (fs.existsSync(yesterdayPath)) {
    try { yesterdayData = JSON.parse(fs.readFileSync(yesterdayPath, 'utf8')); } catch (e) {}
  } else if (fs.existsSync(mainScoresPath)) {
    try { yesterdayData = JSON.parse(fs.readFileSync(mainScoresPath, 'utf8')); } catch (e) {}
  }

  for (const toolId in toolsOutput) {
    if (yesterdayData && yesterdayData.tools && yesterdayData.tools[toolId]) {
      const oldScore = yesterdayData.tools[toolId].score || 0;
      toolsOutput[toolId].change = Number((toolsOutput[toolId].score - oldScore).toFixed(2));
    }
  }

  const result = { updated: new Date().toISOString(), source: "airank2602.csv + update_ranking.js", tools: toolsOutput };
  fs.writeFileSync(path.join(historyDir, `scores-${todayStr}.json`), JSON.stringify(result, null, 2), 'utf8');
  fs.writeFileSync(mainScoresPath, JSON.stringify(result, null, 2), 'utf8');

  const csvReportPath = path.join(__dirname, '..', 'ai_rank_full_report.csv');
  let csvReport = '\uFEFF' + '순위,ID,오픈소스,툴이름,도메인,종합점수,구글(50%),네이버(25%),SNS(15%),깃허브(10%)\n';
  const sortedList = toolsList.map(t => ({
    ...t, score: toolsOutput[t.id].score, metrics: toolsOutput[t.id].metrics
  })).sort((a, b) => b.score - a.score);

  csvReport += sortedList.map((t, idx) => 
    `${idx + 1},${t.id},${t.isOpenSource},"${t.name}","${t.domain}",${t.score},${t.metrics.opr},${t.metrics.ntv},${t.metrics.sns},${t.metrics.ghs}`
  ).join('\n');

  try {
    fs.writeFileSync(csvReportPath, csvReport, 'utf8');
    console.log(`✅ [Excel 생성] ${csvReportPath} 완료!`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const fallback = path.join(__dirname, '..', `ai_rank_full_report_${Date.now()}.csv`);
      fs.writeFileSync(fallback, csvReport, 'utf8');
      console.log(`⚠️ 원본 사용 중. 파일 저장: ${fallback}`);
    }
  }

  const updatedOriginalCsv = ['ID\tService Name\tAnalysis Domain\tRank\tScore\tOpenSource']
    .concat(sortedList.sort((a,b) => a.id - b.id).map((t, idx) => {
      const currentRank = sortedList.findIndex(x => x.id === t.id) + 1;
      return `${t.id}\t${t.name}\t${t.domain}\t${currentRank}\t${t.score}\t${t.isOpenSource}`;
    }));
  fs.writeFileSync(csvPath, updatedOriginalCsv.join('\n'), 'utf8');
  console.log(`✅ [원본 데이터 연동] data/airank2602.csv 오픈소스 속성 갱신 완료!`);
}

updateRanking();
