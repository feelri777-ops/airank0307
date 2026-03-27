import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 환경 변수 로드 ---
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

// --- Firebase Admin 초기화 ---
function initializeFirebase() {
  if (admin.apps.length > 0) return admin.app();
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  }
  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    return admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
  }
  throw new Error("⚠️ Firebase 인증 정보를 찾을 수 없습니다.");
}

const db = initializeFirebase().firestore();

// --- Perplexity API (OpenAI 호환) ---
const perplexityKey = process.env.PERPLEXITY_API_KEY;
if (!perplexityKey) {
  console.error("❌ [치명적 오류]: PERPLEXITY_API_KEY가 설정되지 않았습니다.");
  process.exit(1);
}
const perplexity = new OpenAI({
  apiKey: perplexityKey,
  baseURL: 'https://api.perplexity.ai',
});

// --- Perplexity 호출 헬퍼 ---
async function askPerplexity(systemPrompt, userPrompt, model = "sonar-pro") {
  const response = await perplexity.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.0,
  });
  return response.choices[0].message.content;
}

// --- 날짜 헬퍼 ---
function getWeekLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const week = Math.ceil(now.getDate() / 7);
  return `${year}년 ${month}월 ${week}주차`;
}

function getSearchDateRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - day);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return `${fmt(lastMonday)} ~ ${fmt(lastSunday)}`;
}

// --- Firestore에서 현재 1~100위 랭킹 데이터 가져오기 ---
async function getCurrentRanking() {
  console.log("📡 Firestore에서 현재 1~100위 데이터를 가져오는 중...");
  const snapshot = await db.collection("tools").orderBy("rank", "asc").limit(100).get();
  if (snapshot.empty) {
    console.log("⚠️ 기존 데이터가 없습니다. 신규로 생성합니다.");
    return "현재 등록된 툴이 없습니다.";
  }

  const currentList = snapshot.docs.map(doc => {
    const data = doc.data();
    return `#${data.rank} ${data.name} (URL: ${data.url || 'N/A'})`;
  }).join("\n");

  console.log(`✅ 기존 데이터 ${snapshot.size}개 로드 완료`);
  return currentList;
}

// --- JSON 클렌징 ---
function extractJsonArray(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error("JSON 배열을 찾을 수 없습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// --- 업계 표준 백업 도구 리스트 (최후의 수단) ---
const FALLBACK_POOL = [
  { name: "Jasper", url: "https://www.jasper.ai", cat: "text" },
  { name: "Copy.ai", url: "https://www.copy.ai", cat: "text" },
  { name: "Descript", url: "https://www.descript.com", cat: "video" },
  { name: "InVideo", url: "https://invideo.io", cat: "video" },
  { name: "Synthesia", url: "https://www.synthesia.io", cat: "video" },
  { name: "Looka", url: "https://looka.com", cat: "image" },
  { name: "Canva Magic Edit", url: "https://www.canva.com", cat: "image" },
  { name: "Gamma", url: "https://gamma.app", cat: "etc" },
  { name: "Notion AI", url: "https://notion.so", cat: "text" },
  { name: "Otter.ai", url: "https://otter.ai", cat: "audio" },
  { name: "ElevenLabs", url: "https://elevenlabs.io", cat: "audio" },
  { name: "Stable Diffusion", url: "https://stability.ai", cat: "image" },
  { name: "Runway Gen-3", url: "https://runwayml.com", cat: "video" },
  { name: "Luma AI", url: "https://lumalabs.ai", cat: "video" },
  { name: "Perplexity", url: "https://perplexity.ai", cat: "search" },
  { name: "Grok", url: "https://x.ai", cat: "text" },
  { name: "DeepSeek", url: "https://deepseek.com", cat: "code" },
  { name: "Cursor", url: "https://cursor.com", cat: "code" },
  { name: "Tabnine", url: "https://tabnine.com", cat: "code" },
  { name: "Framer AI", url: "https://framer.com", cat: "etc" }
];

// --- AI 기반 중복 판별 (Perplexity 실시간 판단) ---
const duplicateCheckCache = new Map(); // 캐시로 중복 API 호출 방지

async function isSameProduct(name1, name2) {
  // 1단계: 완전 동일한 경우 빠른 반환
  const clean1 = name1.toLowerCase().trim();
  const clean2 = name2.toLowerCase().trim();
  if (clean1 === clean2) return true;

  // 2단계: 캐시 확인
  const cacheKey = [clean1, clean2].sort().join('|||');
  if (duplicateCheckCache.has(cacheKey)) {
    return duplicateCheckCache.get(cacheKey);
  }

  // 3단계: Perplexity AI 판별
  try {
    const systemPrompt = `당신은 AI 제품 분류 전문가입니다. 두 AI 도구가 같은 제품/서비스의 다른 버전이거나 같은 회사의 동일 제품군인지 판단하세요.`;

    const userPrompt = `다음 두 AI 도구를 비교하세요:

도구 A: "${name1}"
도구 B: "${name2}"

[판단 기준]
1. 같은 회사의 같은 제품 → YES
   예: "ChatGPT"와 "GPT-4", "Claude"와 "Sonnet 4.6", "Midjourney"와 "Midjourney v6"

2. 같은 회사의 동일 제품군/브랜드 → YES
   예: "Opus 4.6"과 "Claude Code", "DALL-E"와 "ChatGPT"

3. 이름만 비슷하지만 다른 회사/제품 → NO
   예: "Midjourney"와 "Stable Diffusion", "Cursor"와 "Copilot"

4. 완전히 다른 제품 → NO

[중요] 반드시 YES 또는 NO만 한 단어로 출력하세요. 다른 설명은 절대 금지입니다.`;

    const response = await askPerplexity(systemPrompt, userPrompt, "sonar");
    const answer = response.trim().toUpperCase();
    const result = answer.includes("YES");

    // 캐시 저장
    duplicateCheckCache.set(cacheKey, result);

    if (result) {
      console.log(`      🔍 AI 판별: "${name1}" ≈ "${name2}" → 같은 제품`);
    }

    return result;
  } catch (err) {
    console.error(`      ❌ 중복 판별 실패 (${name1} vs ${name2}):`, err.message);
    // 에러 시 보수적으로 다른 제품으로 간주
    return false;
  }
}

// --- 핵심 로직: 10개 단위 정밀 호출 (재시도 로직 포함) ---
async function fetchRankingChunk(range, weekLabel, dateRange, currentRankingContext, retryCount = 0) {
  const isRetry = retryCount > 0;
  const model = retryCount >= 2 ? "sonar-reasoning-pro" : "sonar-pro";
  const startRank = parseInt(range.match(/\d+/)[0]);
  
  // 3회차 최종 시도: 검색 결과가 없어도 무조건 도구를 지적하여 생성하도록 강제
  const isFinalFallback = retryCount === 3;

  const systemPrompt = `당신은 고도로 훈련된 'AI 시장 데이터 매핑 엔진'입니다. 
당신의 임무는 실시간 웹 검색 결과를 바탕으로 지정된 순위 구간의 AI 도구들을 추출하고, 이를 정해진 JSON 스키마로 변환하는 것입니다. 
수치(Score) 데이터는 검색 결과에 나타난 각 도구의 상대적 위상(트래픽, 인지도, 기술력)을 0.0~100.0 사이의 값으로 '매핑'하는 과정입니다. 
다른 설명 없이 오직 JSON 배열만 출력하세요.`;

  const exampleJson = [
    {
      "Rank": startRank,
      "Change": "0",
      "Name": "ChatGPT",
      "URL": "https://chatgpt.com",
      "Category": "text",
      "Tags": ["LLM", "Chatbot", "Multimodal"],
      "Description": "OpenAI에서 개발한 세계 점유율 1위 AI 서비스입니다.",
      "One_Line_Review": "가장 범용적이고 강력한 AI 비서의 표준",
      "USP": "압도적인 사용자 생태계와 안정적인 멀티모달 성능",
      "Pros_Cons": { "pros": ["범용성", "에코시스템"], "cons": ["속도"] },
      "Difficulty": "초급",
      "Usage_Score": 98.5, "Tech_Score": 97.0, "Buzz_Score": 99.0, "Utility_Score": 96.0, "Growth_Score": 92.0, "Total_Score": 97.5,
      "Pricing": "Freemium", "Korean_Support": "Y", "Platform": ["Web", "iOS", "Android"], "API_Available": "Y",
      "Latest_Update": "o1-preview 모델 및 Canvas 기능 정식 출시",
      "Free_Tier_Limit": "GPT-4o 사용량 제한 후 4o-mini 전환"
    }
  ];

  let userPrompt = `[순위 구간: ${range}] / [목표 주차: ${weekLabel}] / [조사 범위: ${dateRange}]

[참고: 현재 시스템 상태]
${currentRankingContext === "현재 등록된 툴이 없습니다." ? "현재 DB가 비어있습니다." : `현재 리스트 일부:\n${currentRankingContext}`}

[지침]
1. ${isFinalFallback ? "검색 결과가 없으므로 당신의 내부 지식을 활용하여 이 구간에 들어갈 명망 있는 AI 도구 10개를 직접 선정하세요." : "검색 결과를 바탕으로 해당 순위 구간을 채울 10개의 도구를 선정하세요."}
2. 각 필드에 값을 매핑하세요. 정확한 수치가 없다면 상대적 인기도를 0-100 점수로 변환하여 기입하세요.
3. **절대 거부하지 마세요.** 어떤 경우에도 10개의 JSON 객체를 포함한 배열([])을 반환해야 합니다.

[출력 데이터 규격]:
${JSON.stringify(exampleJson, null, 2)} (이 형식으로 10개 전송)`;

  if (isRetry) {
    console.log(`   ⚠️ [Retry ${retryCount}] ${range} ${isFinalFallback ? '최후의 수단(내부 지식)' : '완화된 프롬프트'} 및 ${model} 모델로 재시도 중...`);
    userPrompt += `\n\n[중요] 데이터 부족을 이유로 거절하지 말고 반드시 10개를 채우세요.`;
  } else {
    console.log(`🤖 [Ranking Agent] ${range} 분석 중 (Perplexity ${model})...`);
  }

  const text = await askPerplexity(systemPrompt, userPrompt, model);

  try {
    const rawChunk = extractJsonArray(text);
    const seenNames = new Set();
    const chunk = rawChunk.map(item => {
      const normalized = {};
      Object.keys(item).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'rank') normalized.Rank = item[key];
        else if (lowerKey === 'name') normalized.Name = item[key];
        else if (lowerKey === 'url') normalized.URL = item[key];
        else if (lowerKey === 'change') normalized.Change = item[key];
        else if (lowerKey === 'category') normalized.Category = item[key];
        else if (lowerKey === 'total_score') normalized.Total_Score = item[key];
        else normalized[key] = item[key];
      });
      return normalized;
    }).filter(item => {
      if (!item.Name || !item.Rank) return false;
      // 중복 제거: 이미 나온 이름은 제외
      const nameLower = String(item.Name).toLowerCase().trim();
      if (seenNames.has(nameLower)) {
        console.log(`   ⚠️ 중복 툴 제외: ${item.Name}`);
        return false;
      }
      seenNames.add(nameLower);
      return true;
    });

    if (chunk.length < 10 && retryCount < 3) throw new Error("10개를 다 채우지 못함");
    
    console.log(`   ✅ ${range}: ${chunk.length}개 항목 매핑 완료`);
    return chunk;
  } catch (err) {
    if (retryCount < 3) {
      return fetchRankingChunk(range, weekLabel, dateRange, currentRankingContext, retryCount + 1);
    }
    
    console.error(`\n❌ [최종 실패]: ${range} 구간을 수동 폴백 데이터로 대체합니다.`);
    // 최후의 수단: FALLBACK_POOL에서 10개를 뽑아 Rank 부여
    const fallbackChunk = FALLBACK_POOL.slice(0, 10).map((tool, idx) => ({
      Rank: startRank + idx,
      Change: "0",
      Name: tool.name,
      URL: tool.url,
      Category: tool.cat,
      Tags: ["AI Service", "Recommended"],
      Description: `${tool.name}은(는) 해당 분야에서 널리 사용되는 선도적인 AI 솔루션입니다.`,
      One_Line_Review: "시장 인지도가 높은 안정적인 서비스",
      USP: "안정적인 서비스 운영과 검증된 사용자 피드백",
      Pros_Cons: { pros: ["높은 인지도", "안정성"], cons: ["상대적으로 늦은 업데이트"] },
      Difficulty: "중급",
      Usage_Score: 70, Tech_Score: 75, Buzz_Score: 65, Utility_Score: 80, Growth_Score: 60, Total_Score: 70,
      Pricing: "Freemium", Korean_Support: "Y", Platform: ["Web"], API_Available: "Y"
    }));
    return fallbackChunk;
  }
}

async function runRankingAgent() {
  try {
    const weekLabel = getWeekLabel();
    const dateRange = getSearchDateRange();
    console.log(`\n🚀 [Ranking Agent] ${weekLabel} (${dateRange} 기준) 글로벌 AI 툴 정밀 랭킹 생성 시작...\n`);

    const currentRankingContext = await getCurrentRanking();
    const allTools = [];
    const globalSeenNames = new Set(); // 전체 구간 중복 체크용

    // 10개씩 10번 호출 (총 100개) - 정밀도 극대화 전략
    for (let i = 1; i <= 100; i += 10) {
      const start = i;
      const end = i + 9;
      const rangeStr = `${start}위부터 ${end}위`;

      const chunk = await fetchRankingChunk(rangeStr, weekLabel, dateRange, currentRankingContext);

      // 구간 간 중복 제거 (AI 기반 판별)
      const uniqueChunk = [];
      for (const tool of chunk) {
        const toolName = String(tool.Name).trim();
        let isDuplicate = false;

        // 기존 툴들과 AI 기반 중복 검사
        for (const existingName of globalSeenNames) {
          if (await isSameProduct(toolName, existingName)) {
            console.log(`   ⚠️ AI 중복 감지: "${tool.Name}" (기존: "${existingName}")`);
            isDuplicate = true;
            break;
          }
        }

        if (!isDuplicate) {
          globalSeenNames.add(toolName);
          uniqueChunk.push(tool);
        }
      }

      allTools.push(...uniqueChunk);

      // 진행률 표시
      console.log(`   📊 진행률: ${allTools.length}/100 완료 (이번 구간 ${uniqueChunk.length}개 추가)`);
    }

    console.log(`\n✅ 총 ${allTools.length}개 도구 정밀 수집 완료 (중복 제거됨)`);

    // 100개 미만이면 추가 요청
    if (allTools.length < 100) {
      const needed = 100 - allTools.length;
      console.log(`\n⚠️  ${needed}개 부족 → 추가 AI 툴 수집 시작...`);

      const excludeList = Array.from(globalSeenNames).join(", ");
      const extraPrompt = `다음 툴들은 이미 포함되어 있으니 절대 중복하지 말고, 새로운 AI 툴 ${needed}개를 추천하세요:\n${excludeList}`;

      try {
        const extraChunk = await fetchRankingChunk(
          `추가 ${needed}개`,
          weekLabel,
          dateRange,
          extraPrompt,
          0
        );

        const extraUnique = [];
        for (const tool of extraChunk) {
          if (extraUnique.length >= needed) break;

          const toolName = String(tool.Name).trim();
          let isDuplicate = false;

          for (const existingName of globalSeenNames) {
            if (await isSameProduct(toolName, existingName)) {
              console.log(`   ⚠️ 추가 요청에서도 AI 중복 감지: "${tool.Name}"`);
              isDuplicate = true;
              break;
            }
          }

          if (!isDuplicate) {
            globalSeenNames.add(toolName);
            extraUnique.push(tool);
          }
        }

        // Rank 재조정
        extraUnique.forEach((tool, idx) => {
          tool.Rank = allTools.length + idx + 1;
        });

        allTools.push(...extraUnique);
        console.log(`   ✅ 추가 수집 완료: ${extraUnique.length}개 (총 ${allTools.length}개)`);
      } catch (err) {
        console.error(`   ❌ 추가 수집 실패:`, err.message);
        console.log(`   ⚠️  ${allTools.length}개로 계속 진행합니다.`);
      }
    }

    // Firestore adminReports에 pending 상태로 저장
    const reportRef = await db.collection("adminReports").add({
      type: "ranking_update",
      summary: `[${weekLabel}] 글로벌 AI 툴 랭킹 정밀 갱신 제안 (${allTools.length}개)`,
      data: {
        tools: allTools.sort((a,b) => a.Rank - b.Rank),
        weekLabel,
        totalCount: allTools.length,
        generatedAt: new Date().toISOString(),
      },
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n🏆 [완료] adminReports에 정밀 보고서 저장: ${reportRef.id}`);
    console.log(`   ⚠️  관리자 에이전트 제어실에서 최종 컨펌 후 랭킹이 갱신됩니다.\n`);

  } catch (error) {
    console.error("❌ Ranking Agent 오류:", error);
    process.exit(1);
  }
}

runRankingAgent();
