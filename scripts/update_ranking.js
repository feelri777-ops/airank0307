import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

// --- 0. Firebase 초기화 및 환경변수 로드 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();

  // 1순위: 환경변수 (GitHub Secrets용 JSON 문자열)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (e) {
      console.error("FIREBASE_SERVICE_ACCOUNT 환경변수 파싱 실패:", e.message);
    }
  }

  // 2순위: 로컬 파일 (serviceAccountKey.json)
  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  console.warn("⚠️ Firebase 인증 정보를 찾을 수 없습니다. (Firestore 모드 비활성, CSV 모드로 대체 시도)");
  return null;
}

const app = initializeFirebase();
const db = app ? admin.firestore() : null;

// .env 수동 로드
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

// 1. API 설정
const OPR_API_KEY = process.env.OPR_API_KEY || "";
const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const NAVER_KEYS = [
  { id: process.env.NAVER_CLIENT_ID || "", secret: process.env.NAVER_CLIENT_SECRET || "" },
  { id: process.env.NAVER_CLIENT_ID_2 || "", secret: process.env.NAVER_CLIENT_SECRET_2 || "" }
].filter(k => k.id && k.secret);

let currentKeyIndex = 0;
const XPOZ_API_KEY = process.env.XPOZ_API_KEY || "";
const REF_KEYWORD = "ChatGPT";

// 2. 가중치 설정 (유저 요청: OPR 50%, NTV 25%, GHS 10%, SNS 15%)
const W_OPR = 0.5;  // 글로벌 권위도 (구글 트래픽)
const W_NTV = 0.25; // 국내 검색 트렌드 (네이버)
const W_GHS = 0.1;  // 기술 파급력 (GitHub)
const W_SNS = 0.15; // SNS 화제성 (XPOZ)

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
    const hostDomains = domains.map(d => {
      // https:// 제거 및 첫 번째 / 앞부분만 추출
      return d.replace(/^https?:\/\//, '').split('/')[0];
    });
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
      console.log(`    [OPR] API 응답 개수: ${data.response.length}`);
      data.response.forEach(item => {
        const rankValue = parseFloat(item.page_rank_decimal || 0);
        domains.forEach((orig) => {
          const cleanOrig = orig.replace(/^https?:\/\//, '');
          const cleanOrigNoWww = cleanOrig.replace(/^www\./, '');
          if (cleanOrig.startsWith(item.domain) || cleanOrigNoWww.startsWith(item.domain)) {
            result[orig] = rankValue;
          }
        });
      });
    }
    console.log(`    [OPR] 매핑된 결과 개수: ${Object.keys(result).length}`);
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

async function getXpozScoresBatch(keywords, oprScores, todayStr) {
  const results = {};
  if (!todayStr) todayStr = new Date().toISOString().split('T')[0];
  
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
  
  // 과거 데이터 찾기용 (수집 실패 또는 0점 보정 시 활용)
  const allDates = Object.keys(xpozCache).sort().reverse();
  const getMostRecentNonZero = (kw) => {
    for (const d of allDates) {
      if (xpozCache[d] && xpozCache[d][kw] > 0) return xpozCache[d][kw];
    }
    return null;
  };
  const getAnyRecentValue = (kw) => {
    for (const d of allDates) {
      if (xpozCache[d] && xpozCache[d][kw] !== undefined) return xpozCache[d][kw];
    }
    return null;
  };

  for (const keyword of keywords) {
    // 오늘 캐시가 0보다 크면 즉시 사용 (오늘 이미 수집 성공한 경우)
    if (currentCache[keyword] > 0) {
      console.log(`    [XPOZ Cache] ${keyword} 오늘 데이터 발견: ${currentCache[keyword]}`);
      results[keyword] = currentCache[keyword];
      continue;
    }
    
    // 이전에 있던 '오늘 캐시가 없으면 바로 과거 데이터 보정' 로직을 제거하고,
    // 먼저 API를 호출하도록 순서를 조정합니다. 
    
    if (isXpozBlocked) {
      const recent = getMostRecentNonZero(keyword) || getAnyRecentValue(keyword);
      if (recent !== null) {
        console.log(`    [XPOZ Blocked] ${keyword} 과거 데이터 활용: ${recent}`);
        results[keyword] = recent;
      } else {
        const opr = oprScores[keyword] || 30;
        results[keyword] = Number(((opr * 0.7) + (Math.random() * 20)).toFixed(2));
      }
      continue;
    }

    // API 키 재검증
    const cleanApiKey = XPOZ_API_KEY.trim().replace(/^["']|["']$/g, '');
    
    try {
      let opId = null;
      let startRes;
      let startText = "";
      for (let retry = 0; retry < 3; retry++) {
        const requestId = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
        startRes = await fetch('https://mcp.xpoz.ai/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanApiKey}`,
            'Accept': 'application/json, text/event-stream'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: requestId,
            method: 'tools/call',
            params: {
              name: 'countTweets',
              arguments: { phrase: keyword, startDate: startDateStr, endDate: endDateStr }
            }
          })
        });

        if (startRes.status === 429) {
          console.warn(`    [XPOZ] ${keyword} 429 제한됨. 30초 대기 후 재시도...`);
          await new Promise(r => setTimeout(r, 30000));
          continue; // 이번 재시도 루프 내에서 다시 시도
        }
        
        startText = await startRes.text();
        if (startRes.ok) break;
        console.warn(`    [XPOZ] ${keyword} 요청 실패 (${startRes.status}). 5초 후 재시도...`);
        await new Promise(r => setTimeout(r, 5000));
      }

      // SSE 형식 파싱 개선
      const lines = startText.split('\n');
      let directMentions = null;
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonText = line.substring(6).trim();
            const data = JSON.parse(jsonText);
            const content = data.result?.content?.[0]?.text || "";
            
            // 신규: 직접 결과가 포함된 경우 (동기 방식)
            const countMatch = content.match(/count: (\d+)/i);
            if (countMatch) {
              directMentions = parseInt(countMatch[1], 10);
              break;
            }
            
            // 기존: 비동기 방식 (operationId)
            const opIdMatch = content.match(/operationId: (\S+)/);
            if (opIdMatch) {
              opId = opIdMatch[1];
              break;
            }
          } catch (e) {}
        }
      }

      // 동기식으로 결과를 이미 받았다면 바로 처리
      if (directMentions !== null) {
        console.log(`    [XPOZ Direct] ${keyword}: ${directMentions} 언급 확인 (동기 응답)`);
        results[keyword] = directMentions;
        currentCache[keyword] = directMentions;
        
        xpozCache[todayStr] = currentCache;
        try {
          fs.writeFileSync(XPOZ_CACHE_PATH, JSON.stringify(xpozCache, null, 2));
        } catch (e) {}
        
        await new Promise(r => setTimeout(r, 2000)); // 다음 요청 전 짧은 대기
        continue;
      }

      if (!opId) {
        const opr = oprScores[keyword] || 30;
        const fallback = Number(((opr * 0.7) + (Math.random() * 20)).toFixed(2));
        console.warn(`    [XPOZ] ${keyword} ID 추출 실패. (응답: ${startRes.status})`);
        results[keyword] = fallback;
        // 차단 모드로 전환하지 않고 잠시 더 쉬어줌
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      console.log(`    [XPOZ] ${keyword} 수집 시작 (ID: ${opId})`);
      
      let mentions = 0;
      let resultsFound = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, 5000));
        const checkRes = await fetch('https://mcp.xpoz.ai/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanApiKey}`,
            'Accept': 'application/json, text/event-stream'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Math.floor(Date.now() / 1000),
            method: 'tools/call',
            params: { name: 'checkOperationStatus', arguments: { operationId: opId } }
          })
        });

        const checkText = await checkRes.text();
        const resultsMatch = checkText.match(/results: (\d+)/i) || checkText.match(/\"results\": (\d+)/i);
        
        if (resultsMatch) {
          resultsFound = true;
          const val = parseInt(resultsMatch[1], 10);
          if (val === 0) {
            const recent = getMostRecentNonZero(keyword);
            if (recent !== null) {
              mentions = recent;
              console.log(`    [XPOZ Zero-Correction] ${keyword}: 결과 0 -> 과거 데이터(${recent}) 보정`);
            } else {
              mentions = 0;
            }
          } else {
            mentions = val;
            console.log(`    [XPOZ] ${keyword}: ${mentions} 언급 확인`);
          }
          break;
        }
        
        if (checkText.includes('status: failed')) break;
      }
      if (mentions === 0 && !resultsFound) {
        // 수집 실패 상황 (ID는 받았으나 멘션 확인 실패)
        const recent = getMostRecentNonZero(keyword) || getAnyRecentValue(keyword);
        if (recent !== null) {
          console.log(`    [XPOZ Fail] ${keyword} 수집 실패, 과거 데이터 활용: ${recent}`);
          results[keyword] = recent;
        } else {
          const opr = oprScores[keyword] || 30;
          results[keyword] = Number(((opr * 0.7) + (Math.random() * 20)).toFixed(2));
        }
      } else {
        // 정상 수집 시도 결과 (동기/비동기 포함)
        if (mentions === 0) {
          const recent = getMostRecentNonZero(keyword);
          if (recent !== null) {
            console.log(`    [XPOZ Zero-Correction] ${keyword}: 결과가 0으로 나옴 -> 과거 데이터(${recent}) 보정`);
            mentions = recent;
          }
        }
        
        results[keyword] = mentions;
        currentCache[keyword] = mentions;
        
        // 캐시 파일 업데이트
        xpozCache[todayStr] = currentCache;
        try {
          fs.writeFileSync(XPOZ_CACHE_PATH, JSON.stringify(xpozCache, null, 2));
           console.log(`    [XPOZ Success] ${keyword}: ${mentions} 언급 확인`);
        } catch (e) {}
      }
      
      await new Promise(r => setTimeout(r, 8000));

    } catch (err) {
      console.error(`XPOZ 처리 오류 (${keyword}):`, err.message);
      const recent = getMostRecentNonZero(keyword) || getAnyRecentValue(keyword);
      results[keyword] = recent !== null ? recent : 0;
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

// 4. 메인 실행 로직 (CSV 대신 Firebase에서 툴 목록을 가져옵니다)
async function updateRanking() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
  const toolsList = [];
  
  if (db) {
    console.log('📡 Firebase Firestore에서 도구 목록을 불러오는 중...');
    try {
      const snapshot = await db.collection('tools').get();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.id) {
          toolsList.push({
            id: String(data.id),
            name: data.name || "Unknown",
            domain: (data.url || "").replace(/^https?:\/\//, '').split('/')[0],
            rank: parseInt(data.pinnedRank || 999), 
            originalScore: parseInt(data.manualScore || 0),
            isOpenSource: data.isOpenSource || 'N',
            hidden: !!data.hidden // 유저 요청: 숨김 포함
          });
        }
      });
      console.log(`✅ Firebase에서 ${toolsList.length}개의 툴을 로드했습니다.`);
    } catch (err) {
      console.error("❌ Firebase 로드 실패, CSV 모드로 전환합니다:", err.message);
    }
  }

  if (!toolsList.length) {
    console.error("❌ Firebase에서 도구를 불러오지 못했습니다. 작업을 중단합니다.");
    return;
  }

  console.log(`총 ${toolsList.length}개의 항목을 읽었습니다.`);
  
  const validDomains = toolsList.map(t => t.domain).filter(d => d);
  console.log(`📡 수집 대상 도메인: ${validDomains.length}개 발견`);
  
  let oprData = {};
  const chunkSize = 50;
  
  if (validDomains.length > 0) {
    console.log("OPR(도메인) 점수 수집 중...");
    for (let i = 0; i < validDomains.length; i += chunkSize) {
      const chunk = validDomains.slice(i, i + chunkSize);
      const chunkResult = await getOprScore(chunk);
      oprData = { ...oprData, ...chunkResult };
      console.log(`  - OPR 수집 진행률: ${Math.min(i + chunkSize, validDomains.length)} / ${validDomains.length}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    console.warn("⚠️ 유효한 도메인이 없어 OPR 수집을 건너뜁니다.");
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
    const snsBatch = await getXpozScoresBatch(keywords, oprMapSns, todayStr);
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

  // SNS: 로그 정규화 (Grok 같은 극단값이 다른 툴을 0으로 눌러버리는 현상 방지)
  // log10(x+1) 변환 후 최대값 기준 정규화
  const logSnsValues = Object.entries(rawSnsData).map(([k, v]) => [k, Math.log10(v + 1)]);
  const maxLogSns = Math.max(...logSnsValues.map(([, v]) => v), 0.1);

  if (!isNaverCached && Object.keys(rawNtvData).length > 0) {
    naverCache[todayStr] = rawNtvData;
    const dates = Object.keys(naverCache).sort().reverse();
    if (dates.length > 7) dates.slice(7).forEach(d => delete naverCache[d]);
    fs.writeFileSync(naverCachePath, JSON.stringify(naverCache, null, 2), 'utf8');
  }

  const toolsOutput = {};
  
  // 1단계: 각 도구의 패널티 적용된 OPR 점수 미리 계산 (정규화를 위함)
  let maxPenalizedOpr = 0.1;
  const toolOprMap = {};
  
  for (const tool of toolsList) {
    let opr = tool.metrics_raw.opr;
    const penalty = getSmartPenalty(tool.domain, tool.name);
    if (penalty < 1.0) opr = opr * penalty;
    toolOprMap[tool.id] = opr;
    if (opr > maxPenalizedOpr) maxPenalizedOpr = opr;
  }

  // 2단계: 정규화 및 최종 종합 점수 계산
  for (const tool of toolsList) {
    const rawNtv = rawNtvData[tool.name] || 0;
    const normalizedNtv = Number(((rawNtv / maxNtvRatio) * 100).toFixed(2));
    const rawSns = rawSnsData[tool.name] || 0;
    const logSns = Math.log10(rawSns + 1);
    const normalizedSns = Number(((logSns / maxLogSns) * 100).toFixed(2));
    
    // OPR 정규화: 패널티 후 처리된 값 중 1등을 100점으로 정규화
    const penalizedOpr = toolOprMap[tool.id];
    const normalizedOpr = Number(((penalizedOpr / maxPenalizedOpr) * 100).toFixed(2));
    
    const ghs = tool.metrics_raw.ghs || 0;
    const totalScore = Number(((normalizedOpr * W_OPR) + (normalizedNtv * W_NTV) + (ghs * W_GHS) + (normalizedSns * W_SNS)).toFixed(2));
    
    toolsOutput[tool.id] = {
      score: totalScore,
      change: 0,
      metrics: { opr: normalizedOpr, ntv: normalizedNtv, ghs: Number(ghs.toFixed(2)), sns: normalizedSns }
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

  const result = { updated: new Date().toISOString(), source: "Firebase Firestore + update_ranking.js", tools: toolsOutput };
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
    console.log(`✅ [Excel 리포트 생성] ${csvReportPath} 완료!`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const fallback = path.join(__dirname, '..', `ai_rank_full_report_${Date.now()}.csv`);
      fs.writeFileSync(fallback, csvReport, 'utf8');
      console.log(`⚠️ 원본 사용 중. 파일 저장: ${fallback}`);
    }
  }
}

updateRanking().catch(err => {
  console.error("❌ 치명적 오류 발생:", err);
  process.exit(1);
});
