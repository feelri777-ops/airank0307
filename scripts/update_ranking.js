import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. API 설정 (환경변수 사용)
const OPR_API_KEY = process.env.OPR_API_KEY || "";
const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || "";
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

// 3. 데이터 수집 함수들
async function getOprScore(domains) {
  if (!OPR_API_KEY) return {};
  try {
    const url = new URL("https://openpagerank.com/api/v1.0/getPageRank");
    domains.forEach(d => url.searchParams.append("domains[]", d));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
        result[item.domain] = parseFloat(item.page_rank_decimal || 0) * 10;
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
    
    // 만약 토큰 오류(401)가 발생하면 토큰 없이 재시도 (Public Repo인 경우)
    if (!response.ok && response.status === 401 && GH_TOKEN) {
      response = await fetch(`https://api.github.com/repos/${repoPath}`);
    }

    if (!response.ok) return 0;
    const data = await response.json();
    const stars = data.stargazers_count || 0;
    
    if (stars > 0) {
      // 깃허브 점수 보정: 스타 수에 따라 40~100점 사이로 매핑
      // 1000개 이하면 기본 점수, 그 이상은 로그 스케일
      return Math.min(100, 40 + (Math.log10(stars + 1) * 12));
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

let isNaverBlocked = false;

async function getNaverTrendsBatch(keywords, oprScores = {}) {
  const results = {};
  keywords.forEach(k => {
    // 지능형 기본값: OPR(글로벌 점수)을 기반으로 국내 트렌드 추정 (쏠림 방지)
    const baseOPR = oprScores[k] || 30;
    results[k] = Number((2 + (baseOPR * 0.1)).toFixed(2)); 
  });
  results[REF_KEYWORD] = 100.0;

  if (isNaverBlocked) return results;

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    const formatDate = (d) => d.toISOString().split('T')[0];

    const groups = [];
    keywords.forEach(k => {
      groups.push({ groupName: k, keywords: [k] });
    });

    const body = {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      timeUnit: "date",
      keywordGroups: groups
    };

    const response = await fetch("https://openapi.naver.com/v1/datalab/search", {
      method: "POST",
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (response.status === 429) {
      console.warn(`    [Naver API Blocked] Using intelligent fallback for remaining tools.`);
      isNaverBlocked = true;
      return results;
    }

    if (!response.ok) return results;
    
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

async function getXpozScoresBatch(keywords, oprScores) {
  const results = {};
  if (!XPOZ_API_KEY) {
    console.warn("    [XPOZ API] API Key missing. Using dummy data.");
    for (const keyword of keywords) {
      const opr = oprScores[keyword] || 30;
      const base = (opr * 0.8) + (Math.random() * 20); 
      results[keyword] = Number(Math.min(100, base).toFixed(2));
    }
    return results;
  }

  for (const keyword of keywords) {
    try {
      const response = await fetch("https://mcp.xpoz.ai/mcp", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${XPOZ_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Mcp-Protocol-Version': '2024-11-05'
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "getTwitterPostsByKeywords",
            arguments: { query: keyword }
          }
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const responseText = await response.text();
      // "data: {...}" 패턴 추출 (SSE 응답 파싱)
      const dataMatch = responseText.match(/data:\s*({.+})/);
      
      if (dataMatch) {
         const jsonResponse = JSON.parse(dataMatch[1]);
         const contentText = jsonResponse.result?.content?.[0]?.text || "";
         
         // 텍스트 결과 내의 count 수치 추출
         const countMatch = contentText.match(/count:\s*(\d+)/i);
         const count = countMatch ? parseInt(countMatch[1]) : 0;
         
         // 300개 언급을 100점으로 환산하여 정규화
         const snsScore = Math.min(100, (count / 300) * 100);
         results[keyword] = Number(snsScore.toFixed(2));
         console.log(`    [XPOZ API] ${keyword}: ${count} mentions -> Score: ${results[keyword]}`);
      } else {
         throw new Error("Invalid response format");
      }
      
      // API 예절을 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.warn(`    [XPOZ API Error] ${keyword}: ${error.message} (Using OPR fallback)`);
      const opr = oprScores[keyword] || 30;
      const base = (opr * 0.8) + (Math.random() * 20); 
      results[keyword] = Number(Math.min(100, base).toFixed(2));
    }
  }
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

  // CSV 읽기 및 파싱
  const rawCsv = fs.readFileSync(csvPath, 'utf8');
  const lines = rawCsv.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split('\t').map(h => h.trim());
  
  const toolsList = [];
  const seenIds = new Set();
  const duplicates = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 5) continue;
    
    const id = cols[0].trim();
    const name = cols[1].trim();

    if (seenIds.has(id)) {
      duplicates.push({ line: i + 1, id, name });
    } else {
      seenIds.add(id);
    }

    toolsList.push({
      id: id,
      name: name,
      domain: cols[2].trim(),
      rank: parseInt(cols[3].trim(), 10),
      originalScore: parseInt(cols[4].trim(), 10),
      isOpenSource: 'N' // 기본값 N, 데이터 수집 시 판단
    });
  }

  console.log(`총 ${toolsList.length}개의 항목을 읽었습니다.`);
  if (duplicates.length > 0) {
    console.warn(`\n⚠️ 경고: CSV 파일 내에 중복된 ID가 ${duplicates.length}개 있습니다! (동일한 ID는 나중에 읽힌 데이터로 덮어쓰기 됩니다.)`);
    console.warn(`중복 ID 목록:`);
    duplicates.forEach(d => console.warn(`  - Line ${d.line}: ID [${d.id}] (${d.name})`));
    console.warn(`\n올바른 랭킹을 위해 CSV 파일이나 tools.js의 고유 ID를 수정해 주세요.\n`);
  }
  console.log("API 점수 수집을 시작합니다...");

  // 도메인 추출 (빈 값 제외)
  const validDomains = toolsList.map(t => t.domain).filter(d => d);
  
  // OPR API 수집 (50개 단위 청크 - 100개는 URL 쿼리가 너무 길어져서 Hang 발생 가능성 높음)
  let oprData = {};
  const chunkSize = 50;
  console.log("OPR(도메인) 점수 수집 중...");
  for (let i = 0; i < validDomains.length; i += chunkSize) {
    const chunk = validDomains.slice(i, i + chunkSize);
    const chunkResult = await getOprScore(chunk);
    oprData = { ...oprData, ...chunkResult };
    console.log(`  - OPR 수집 진행률: ${Math.min(i + chunkSize, validDomains.length)} / ${validDomains.length}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit 방지 보수적 대기
  }

  const toolsOutput = {};
  
  const rawNtvData = {};
  const rawSnsData = {};
  
  // 도구별 데이터 수집 (배치 처리)
  const BATCH_SIZE = 4; 
  for (let i = 0; i < toolsList.length; i += BATCH_SIZE) {
    const batch = toolsList.slice(i, i + BATCH_SIZE);
    const keywords = batch.map(t => t.name);
    
    // Naver 트렌드 원본 비율 수집 (ChatGPT를 연결 고리로 사용)
    const oprMap = {};
    batch.forEach(t => oprMap[t.name] = oprData[t.domain] || 30);
    const ntvBatch = await getNaverTrendsBatch(keywords, oprMap);
    
    // SNS 언급량 수집 (OPR 기반 안정적 보정)
    const snsBatch = await getXpozScoresBatch(keywords, oprMap);
    
    for (const name in ntvBatch) {
      rawNtvData[name] = ntvBatch[name];
    }
    for (const name in snsBatch) {
      rawSnsData[name] = snsBatch[name];
    }
    
    await Promise.all(batch.map(async (tool) => {
      if (!tool.id) return;
      
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
      
      tool.metrics_raw = {
        opr: oprData[tool.domain] || 0,
        ghs: ghScore
      };

    }));
    
    console.log(`수집 진행률: ${Math.min(i + BATCH_SIZE, toolsList.length)} / ${toolsList.length} 완료...`);
    // Naver API가 차단되지 않은 경우에만 짧게 대기, 차단 시에는 빠르게 진행
    await new Promise(resolve => setTimeout(resolve, isNaverBlocked ? 100 : 1500));
  }

  // --- 네이버/SNS 점수 전역 정규화 (최고점을 100으로) ---
  const allNtvValues = Object.values(rawNtvData);
  const maxNtvRatio = Math.max(...allNtvValues, 0.1);
  
  const allSnsValues = Object.values(rawSnsData);
  const maxSnsRatio = Math.max(...allSnsValues, 0.1);

  console.log(`\n📊 분석 완료 - NTV 최고점: ${maxNtvRatio}, SNS 최고점: ${maxSnsRatio}`);

  toolsList.forEach(tool => {
    const rawNtv = rawNtvData[tool.name] || 0;
    const normalizedNtv = Number(((rawNtv / maxNtvRatio) * 100).toFixed(2));
    
    const rawSns = rawSnsData[tool.name] || 0;
    const normalizedSns = Number(((rawSns / maxSnsRatio) * 100).toFixed(2));
    
    // OPR 점수는 getOprScore()에서 이미 0~100 범위로 변환됨 (pageRank * 10)
    const opr = tool.metrics_raw.opr;
    const ghs = tool.metrics_raw.ghs;
    
    const totalScore = Number(((opr * W_OPR) + (normalizedNtv * W_NTV) + (ghs * W_GHS) + (normalizedSns * W_SNS)).toFixed(2));
    
    toolsOutput[tool.id] = {
      score: totalScore,
      change: 0,
      metrics: {
        opr: Number(opr.toFixed(2)),
        ntv: normalizedNtv,
        ghs: Number(ghs.toFixed(2)),
        sns: normalizedSns
      }
    };
  });

  // 결과 생성 전, 어제 데이터(history 파일)를 읽어와서 change 변동폭 계산
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const historyDir = path.join(__dirname, '..', 'public', 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const yesterdayPath = path.join(historyDir, `scores-${yesterdayStr}.json`);
  let yesterdayData = null;
  
  // 어제 파일이 없으면 기존 메인 scores.json 이라도 읽어서 비교 시도 (최초 1회용 백업)
  const mainScoresPath = path.join(__dirname, '..', 'public', 'scores.json');
  if (fs.existsSync(yesterdayPath)) {
    try {
      yesterdayData = JSON.parse(fs.readFileSync(yesterdayPath, 'utf8'));
    } catch (e) { console.error("어제 히스토리 파일 읽기 실패:", e.message); }
  } else if (fs.existsSync(mainScoresPath)) {
    try {
      yesterdayData = JSON.parse(fs.readFileSync(mainScoresPath, 'utf8'));
    } catch (e) { /* 무시 */ }
  }

  // change (증감폭) 계산
  for (const toolId in toolsOutput) {
    if (yesterdayData && yesterdayData.tools && yesterdayData.tools[toolId]) {
      const oldScore = yesterdayData.tools[toolId].score || 0;
      const newScore = toolsOutput[toolId].score;
      // 소수점 2자리까지만 표현
      toolsOutput[toolId].change = Number((newScore - oldScore).toFixed(2));
    }
  }

  // 최종 결과 생성
  const result = {
    updated: new Date().toISOString(),
    source: "airank2602.csv + update_ranking.js",
    tools: toolsOutput
  };

  // 1. History 폴더에 오늘 날짜로 백업 저장
  const todayHistoryPath = path.join(historyDir, `scores-${todayStr}.json`);
  fs.writeFileSync(todayHistoryPath, JSON.stringify(result, null, 2), 'utf8');

  // 2. public/scores.json 에 최신본 덮어쓰기 저장 (기존 시스템 지원)
  fs.writeFileSync(mainScoresPath, JSON.stringify(result, null, 2), 'utf8');
  
  // 3. 엑셀(CSV) 리포트 생성 (OpenSource 컬럼 추가)
  const csvReportPath = path.join(__dirname, '..', 'ai_rank_full_report.csv');
  let csvHeader = '\uFEFF'; // Excel 한글 깨짐 방지 BOM
  csvHeader += '순위,ID,오픈소스,툴이름,도메인,종합점수,구글(50%),네이버(25%),SNS(15%),깃허브(10%)\n';
  
  const sortedList = toolsList.map(t => ({
    ...t,
    score: toolsOutput[t.id].score,
    metrics: toolsOutput[t.id].metrics
  })).sort((a, b) => b.score - a.score);

  const csvContent = sortedList.map((t, idx) => {
    return `${idx + 1},${t.id},${t.isOpenSource},"${t.name}","${t.domain}",${t.score},${t.metrics.opr},${t.metrics.ntv},${t.metrics.sns},${t.metrics.ghs}`;
  }).join('\n');

  try {
    fs.writeFileSync(csvReportPath, csvHeader + csvContent, 'utf8');
    console.log(`✅ [Excel 생성] ${csvReportPath} 생성 완료! (250개 도구 전수 리포트)`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const fallbackCsvPath = path.join(__dirname, '..', `ai_rank_full_report_${Date.now()}.csv`);
      fs.writeFileSync(fallbackCsvPath, csvHeader + csvContent, 'utf8');
      console.log(`⚠️ 원본 CSV 파일이 열려있어 새로운 파일로 저장했습니다: ${fallbackCsvPath}`);
    } else {
      console.error('CSV 생성 중 오류:', err);
    }
  }

  // 4. 원본 data/airank2602.csv 에도 OpenSource 속성 업데이트
  const updatedOriginalCsvLines = ['ID\tService Name\tAnalysis Domain\tRank\tScore\tOpenSource'];
  toolsList.forEach(t => {
    // 기존 포맷 유지하면서 마지막에 OpenSource 탭 추가
    updatedOriginalCsvLines.push(`${t.id}\t${t.name}\t${t.domain}\t${t.rank}\t${t.originalScore}\t${t.isOpenSource}`);
  });
  fs.writeFileSync(csvPath, updatedOriginalCsvLines.join('\n'), 'utf8');
  console.log(`✅ [원본 데이터 연동] data/airank2602.csv 오픈소스 속성 갱신 완료!`);
}

updateRanking();
