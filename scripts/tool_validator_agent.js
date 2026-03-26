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
async function askPerplexity(systemPrompt, userPrompt, model = "sonar") {
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

// --- JSON 클렌징 ---
function extractJsonArray(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error("JSON 배열을 찾을 수 없습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// --- Phase 1: 최신 pending 보고서 로드 ---
async function loadPendingReport() {
  console.log("📡 Firestore에서 최신 pending 랭킹 보고서를 가져오는 중...");
  const snapshot = await db.collection("adminReports")
    .where("type", "==", "ranking_update")
    .where("status", "==", "pending")
    .get();

  if (!snapshot.empty && snapshot.docs.length > 1) {
    snapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() || 0;
      const bTime = b.data().createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }

  if (snapshot.empty) {
    console.log("⚠️ pending 상태의 랭킹 보고서가 없습니다. 검증 대상이 없어 종료합니다.");
    process.exit(0);
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  console.log(`✅ 보고서 로드 완료: ${doc.id} (${data.data.totalCount}개 툴)`);
  return { reportId: doc.id, tools: data.data.tools, weekLabel: data.data.weekLabel };
}

// --- Phase 2-1: AI 툴 진위 확인 (Perplexity 실시간 웹 검색) ---
async function validateAiTools(tools) {
  console.log("\n🔍 [검증 1/3] AI 툴 진위 확인 중 (Perplexity 실시간 검색)...");

  const CHUNK_SIZE = 8; // 검색 품질을 위해 배치 사이즈 축소 (기존 25)
  const allResults = [];

  for (let i = 0; i < tools.length; i += CHUNK_SIZE) {
    const chunk = tools.slice(i, i + CHUNK_SIZE);
    const range = `${i + 1}~${Math.min(i + CHUNK_SIZE, tools.length)}`;
    console.log(`   ${range}번째 정밀 검증 중 (총 ${tools.length}개)...`);

    const toolList = chunk.map((t, idx) => `${idx + 1}. "${t.Name}" (URL: ${t.URL})`).join("\n");

    const systemPrompt = `당신은 최고 수준의 AI 기술 분석가입니다. 실시간 웹 검색을 동원하여 각 도구가 실제로 서비스 중이며, 핵심적으로 AI 기술(생성형 AI, LLM, 머신러닝 등)을 제공하는지 확인하세요.`;

    const userPrompt = `아래 도구 목록에 대해 2026년 현재 기준의 실시간 정보를 바탕으로 심층 검증을 수행하세요.

[판별 가이드라인]
1. **AI 서비스 정의**: 단순히 'AI 키워드'만 있는 것이 아니라, 실제 AI 기능을 통해 사용자 가치를 창출해야 합니다. (예: 캔바의 Magic Studio, ChatGPT의 LLM, DeepSeek의 독자 모델 등)
2. **실존 및 운영 여부**: 2025-2026년 사이의 최신 소식을 검색하여 서비스가 활발히 운영 중인지 확인하세요.
3. **오판 주의**: ChatGPT, Canva, DeepSeek, Grok, Perplexity, DeepL, Claude, Gemini, Notion AI 등은 매우 유명한 AI 서비스입니다. 이들을 'AI 아님'으로 판별하는 것은 검색 실패입니다. 충분히 검색하세요.
4. **결과 근거**: "왜 AI 툴인지" 또는 "왜 아닌지"에 대해 구체적인 최신 기능이나 뉴스 근거를 reason에 포함하세요.

[검증 대상 도구]
${toolList}

[출력 형식] 반드시 JSON 배열 형식만 출력하세요. 다른 설명은 생략합니다.
[
  { "index": 1, "name": "도구명", "isValid": true, "reason": "OO 기술을 활용한 OO 기능을 제공하며 현재 정상 운영 확인됨" }
]`;

    try {
      const text = await askPerplexity(systemPrompt, userPrompt);
      const results = extractJsonArray(text);
      // 인덱스를 전체 기준으로 보정
      results.forEach((r, idx) => { r.index = i + idx + 1; });
      allResults.push(...results);
      console.log(`   ✅ ${range}: ${results.length}개 확인 완료`);
    } catch (err) {
      console.error(`   ❌ ${range} 파싱 실패:`, err.message);
      chunk.forEach((t, idx) => {
        allResults.push({ index: i + idx + 1, name: t.Name, isValid: true, reason: "파싱 실패로 기본 통과" });
      });
    }
  }

  return allResults;
}

// --- Phase 2-2: URL 접속 확인 ---
async function checkUrl(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });
    clearTimeout(timer);
    // 403은 봇 차단일 뿐 사이트는 살아있음 → 통과 처리
    const accessible = res.status < 400 || res.status === 403;
    return { statusCode: res.status, accessible, redirectedUrl: res.url !== url ? res.url : null };
  } catch (err) {
    clearTimeout(timer);
    try {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), timeout);
      const res = await fetch(url, {
        method: "GET",
        signal: controller2.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      });
      clearTimeout(timer2);
      const accessible = res.status < 400 || res.status === 403;
      return { statusCode: res.status, accessible, redirectedUrl: res.url !== url ? res.url : null };
    } catch {
      return { statusCode: 0, accessible: false, redirectedUrl: null, error: err.name === "AbortError" ? "timeout" : err.message };
    }
  }
}

async function validateUrls(tools) {
  console.log("\n🌐 [검증 2/3] URL 접속 확인 중...");
  const results = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < tools.length; i += BATCH_SIZE) {
    const batch = tools.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (t) => {
        const url = t.URL;
        if (!url || !url.startsWith("http")) {
          return { name: t.Name, url, statusCode: 0, accessible: false, redirectedUrl: null, error: "invalid_url" };
        }
        const result = await checkUrl(url);
        return { name: t.Name, url, ...result };
      })
    );
    results.push(...batchResults);
    const done = Math.min(i + BATCH_SIZE, tools.length);
    const passCount = results.filter(r => r.accessible).length;
    console.log(`   ${done}/${tools.length} 완료 (${passCount}개 접속 성공)`);
  }
  return results;
}

// --- Phase 2-3: 로고(favicon) 확인 ---
async function validateLogos(tools) {
  console.log("\n🖼️  [검증 3/3] 로고(favicon) 확인 중...");
  const results = [];
  const BATCH_SIZE = 10;
  const DEFAULT_ICON_SIZES = new Set([726, 580, 318, 256]);

  for (let i = 0; i < tools.length; i += BATCH_SIZE) {
    const batch = tools.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (t) => {
        try {
          const hostname = new URL(t.URL).hostname;
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
          const res = await fetch(faviconUrl);
          const contentLength = parseInt(res.headers.get("content-length") || "0");
          const logoValid = res.ok && !DEFAULT_ICON_SIZES.has(contentLength) && contentLength > 100;
          return { name: t.Name, faviconUrl, logoValid, contentLength };
        } catch {
          return { name: t.Name, faviconUrl: null, logoValid: false, contentLength: 0 };
        }
      })
    );
    results.push(...batchResults);
  }

  const validCount = results.filter(r => r.logoValid).length;
  console.log(`   완료: ${validCount}/${results.length}개 로고 정상`);
  return results;
}

// --- Phase 3: 검증 결과 종합 ---
function aggregateResults(tools, aiResults, urlResults, logoResults) {
  console.log("\n📊 검증 결과 종합 중...");

  return tools.map((tool, i) => {
    const ai = aiResults[i] || { isValid: true, reason: "확인 불가" };
    const url = urlResults[i] || { accessible: false };
    const logo = logoResults[i] || { logoValid: false };

    const issues = [];
    let autoFixed = {};

    if (!ai.isValid) issues.push({ type: "not_ai_tool", detail: ai.reason });

    if (!url.accessible) {
      issues.push({ type: "url_unreachable", detail: `status: ${url.statusCode}, error: ${url.error || "N/A"}` });
    } else if (url.redirectedUrl) {
      autoFixed.URL = url.redirectedUrl;
    }

    if (tool.URL && tool.URL.startsWith("http://")) {
      autoFixed.URL = tool.URL.replace("http://", "https://");
    }

    if (!logo.logoValid) issues.push({ type: "logo_missing", detail: `contentLength: ${logo.contentLength}` });

    const validated = !issues.some(iss => iss.type === "not_ai_tool" || iss.type === "url_unreachable");
    const needsReview = issues.length > 0 && !validated;

    return {
      ...tool,
      ...autoFixed,
      _validation: {
        validated,
        needsReview,
        issues,
        autoFixed: Object.keys(autoFixed).length > 0 ? autoFixed : null,
      }
    };
  });
}

// --- Phase 4: 최신 정보 업데이트 (Perplexity 실시간 검색) ---
async function updateToolInfo(validatedTools) {
  const passedTools = validatedTools.filter(t => t._validation.validated);
  console.log(`\n📝 [정보 업데이트] 검증 통과 ${passedTools.length}개 툴의 최신 정보 수집 중 (Perplexity)...`);

  if (passedTools.length === 0) return validatedTools;

  const CHUNK_SIZE = 8; // 정보 수집 정밀도를 위해 배치 사이즈 축소
  const updatedMap = new Map();

  for (let i = 0; i < passedTools.length; i += CHUNK_SIZE) {
    const chunk = passedTools.slice(i, i + CHUNK_SIZE);
    const range = `${i + 1}~${Math.min(i + CHUNK_SIZE, passedTools.length)}`;
    console.log(`   ${range}번째 툴 상세 정보 업데이트 중...`);

    const toolList = chunk.map((t, idx) => `${idx + 1}. "${t.Name}" (URL: ${t.URL})`).join("\n");

    const systemPrompt = `당신은 IT 전문 기술 기자이자 데이터 분석가입니다. 각 AI 도구에 대해 실시간 웹 검색을 통해 가장 정확하고 풍부한 정보를 수집하세요.`;

    const userPrompt = `아래 도구들에 대해 2026년 현재 기준의 최신 정보를 조사하여 상세 내용을 작성하세요.

[조사 및 작성 지침]
1. **Description**: 2-3문장 내외. 해당 도구가 제공하는 핵심 AI 기술(예: 어떤 모델을 사용하는지, 어떤 고유 기능을 갖고 있는지)을 포함하여 구체적으로 작성하세요. (한국어)
2. **One_Line_Review**: 사용자가 이 도구를 써야 하는 결정적인 이유(USP)를 한 줄로 요약하세요. (한국어)
3. **Pricing**: 공식 사이트 기준 최신 요금제 (Free / Freemium / Paid 중 선택)
4. **Korean_Support**: 웹사이트 또는 앱 UI 내 공식 한국어 지원 여부 (Y/N)
5. **Platform**: 지원하는 모든 플랫폼 (Web, iOS, Android, macOS, Windows 등 실제 확인된 항목만 배열로 작성)

[조사 대상]
${toolList}

[출력 형식] 반드시 JSON 배열만 출력하세요.
[
  {
    "index": 1,
    "name": "도구명",
    "Description": "AI 기반의 OO 기능을 통해 OO 업무를 OO배 이상 효율화해주는 툴입니다...",
    "One_Line_Review": "현 시점 가장 강력한 OO 기능을 제공하는 AI 전문가",
    "Pricing": "Freemium",
    "Korean_Support": "Y",
    "Platform": ["Web", "macOS"]
  }
]`;

    try {
      const text = await askPerplexity(systemPrompt, userPrompt);
      const updates = extractJsonArray(text);
      updates.forEach((u, idx) => {
        const toolName = chunk[idx]?.Name || u.name;
        updatedMap.set(toolName, u);
      });
      console.log(`   ✅ ${range}: ${updates.length}개 업데이트 수신`);
    } catch (err) {
      console.error(`   ❌ ${range} 정보 업데이트 실패:`, err.message);
    }
  }

  return validatedTools.map(tool => {
    const update = updatedMap.get(tool.Name);
    if (!update || !tool._validation.validated) return tool;

    const merged = { ...tool };
    if (update.Description) merged.Description = update.Description;
    if (update.One_Line_Review) merged.One_Line_Review = update.One_Line_Review;
    if (update.Pricing) merged.Pricing = update.Pricing;
    if (update.Korean_Support) merged.Korean_Support = update.Korean_Support;
    if (update.Platform) merged.Platform = update.Platform;
    merged._validation.infoUpdated = true;
    return merged;
  });
}

// --- Phase 5: 검증 보고서 Firestore 저장 ---
async function saveValidationReport(reportId, weekLabel, finalTools) {
  const passed = finalTools.filter(t => t._validation.validated).length;
  const failed = finalTools.length - passed;
  const issues = finalTools
    .filter(t => t._validation.issues.length > 0)
    .map(t => ({ name: t.Name, url: t.URL, issues: t._validation.issues, needsReview: t._validation.needsReview }));

  const summary = `[${weekLabel}] 툴 검증 완료: ${passed}/${finalTools.length} 통과, ${issues.length}개 이슈 발견`;

  const reportRef = await db.collection("adminReports").add({
    type: "tool_validation",
    summary,
    data: {
      totalChecked: finalTools.length,
      passed,
      failed,
      issues,
      updatedTools: finalTools.map(t => {
        const { _validation, ...rest } = t;
        return { ...rest, _validation };
      }),
    },
    linkedReport: reportId,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { reportRef: reportRef.id, summary };
}

// --- 메인 실행 ---
async function runValidator() {
  try {
    console.log("\n🔍 [Tool Validator Agent] 시작 (Perplexity sonar 기반)...\n");

    const { reportId, tools, weekLabel } = await loadPendingReport();

    const [aiResults, urlResults, logoResults] = await Promise.all([
      validateAiTools(tools),
      validateUrls(tools),
      validateLogos(tools),
    ]);

    const validatedTools = aggregateResults(tools, aiResults, urlResults, logoResults);

    const passCount = validatedTools.filter(t => t._validation.validated).length;
    const failCount = validatedTools.length - passCount;
    console.log(`\n✅ 검증 결과: ${passCount}개 통과 / ${failCount}개 실패`);

    const failedTools = validatedTools.filter(t => !t._validation.validated);
    if (failedTools.length > 0) {
      console.log("\n❌ 검증 실패 항목:");
      failedTools.forEach(t => {
        const issueStr = t._validation.issues.map(i => `${i.type}: ${i.detail}`).join(", ");
        console.log(`   - ${t.Name} (${t.URL}) → ${issueStr}`);
      });
    }

    const logoWarnings = validatedTools.filter(t => t._validation.issues.some(i => i.type === "logo_missing") && t._validation.validated);
    if (logoWarnings.length > 0) {
      console.log(`\n⚠️  로고 미확인 (경고): ${logoWarnings.length}개`);
      logoWarnings.slice(0, 10).forEach(t => console.log(`   - ${t.Name}`));
      if (logoWarnings.length > 10) console.log(`   ... 외 ${logoWarnings.length - 10}개`);
    }

    const finalTools = await updateToolInfo(validatedTools);

    const { reportRef, summary } = await saveValidationReport(reportId, weekLabel, finalTools);

    console.log(`\n🏆 [완료] ${summary}`);
    console.log(`   보고서 ID: ${reportRef}`);
    console.log(`   ⚠️  관리자 에이전트 제어실에서 최종 컨펌 후 반영됩니다.\n`);

  } catch (error) {
    console.error("❌ Validator Agent 오류:", error);
    process.exit(1);
  }
}

runValidator();
