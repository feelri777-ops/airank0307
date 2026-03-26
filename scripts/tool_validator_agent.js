import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey || apiKey.length < 10) {
  console.error("❌ [치명적 오류]: 유효한 GEMINI API 키가 필요합니다.");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

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
  // 복합 인덱스 불필요하도록 단순 쿼리 후 필터링
  const snapshot = await db.collection("adminReports")
    .where("type", "==", "ranking_update")
    .where("status", "==", "pending")
    .get();

  // createdAt 기준 최신 1개만 선택
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

// --- Phase 2-1: AI 툴 진위 확인 (Gemini 배치) ---
async function validateAiTools(model, tools) {
  console.log("\n🔍 [검증 1/3] AI 툴 진위 확인 중...");

  const toolList = tools.map((t, i) => `${i + 1}. "${t.Name}" — ${t.URL} — ${t.Description}`).join("\n");

  const prompt = `
당신은 AI 툴 검증 전문가입니다.
아래 목록의 각 도구가 **실제로 존재하는 글로벌 상용 AI 서비스**인지 판별하세요.

[판별 기준]
- 누구나 가입/사용할 수 있는 상용 AI 서비스여야 합니다
- 공공기관 챗봇, 기업 사내용 AI, 보도자료용 사례는 제외
- URL이 실제 해당 서비스의 공식 홈페이지여야 합니다
- 서비스가 종료(shutdown)된 경우 false

[도구 목록]
${toolList}

[출력 규격]
반드시 아래 형식의 JSON 배열만 출력하세요. 다른 텍스트 금지.
[
  { "index": 1, "name": "도구명", "isValid": true, "reason": "판별 근거 한 줄" }
]
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  try {
    return extractJsonArray(text);
  } catch (err) {
    console.error("❌ AI 진위 확인 JSON 파싱 실패:", text.slice(0, 500));
    return tools.map((t, i) => ({ index: i + 1, name: t.Name, isValid: true, reason: "파싱 실패로 기본 통과" }));
  }
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
      headers: { "User-Agent": "AIRank-Validator/1.0" },
    });
    clearTimeout(timer);
    return { statusCode: res.status, accessible: res.status < 400, redirectedUrl: res.url !== url ? res.url : null };
  } catch (err) {
    clearTimeout(timer);
    // HEAD 차단 시 GET으로 재시도
    try {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), timeout);
      const res = await fetch(url, {
        method: "GET",
        signal: controller2.signal,
        redirect: "follow",
        headers: { "User-Agent": "AIRank-Validator/1.0" },
      });
      clearTimeout(timer2);
      return { statusCode: res.status, accessible: res.status < 400, redirectedUrl: res.url !== url ? res.url : null };
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
  // 기본 지구본 아이콘의 Content-Length (약 726 bytes)
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

    // AI 툴 진위
    if (!ai.isValid) issues.push({ type: "not_ai_tool", detail: ai.reason });

    // URL 접속
    if (!url.accessible) {
      issues.push({ type: "url_unreachable", detail: `status: ${url.statusCode}, error: ${url.error || "N/A"}` });
    } else if (url.redirectedUrl) {
      // 자동 수정: 리다이렉트 URL로 교체
      autoFixed.URL = url.redirectedUrl;
    }

    // HTTP → HTTPS 자동 수정
    if (tool.URL && tool.URL.startsWith("http://")) {
      autoFixed.URL = tool.URL.replace("http://", "https://");
    }

    // 로고 확인
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

// --- Phase 4: 최신 정보 업데이트 (Gemini + google_search) ---
async function updateToolInfo(model, validatedTools) {
  const passedTools = validatedTools.filter(t => t._validation.validated);
  console.log(`\n📝 [정보 업데이트] 검증 통과 ${passedTools.length}개 툴의 최신 정보 수집 중...`);

  if (passedTools.length === 0) return validatedTools;

  const CHUNK_SIZE = 50;
  const updatedMap = new Map();

  for (let i = 0; i < passedTools.length; i += CHUNK_SIZE) {
    const chunk = passedTools.slice(i, i + CHUNK_SIZE);
    const range = `${i + 1}~${Math.min(i + CHUNK_SIZE, passedTools.length)}`;
    console.log(`   ${range}번째 툴 정보 업데이트 호출 중...`);

    const toolList = chunk.map((t, idx) => `${idx + 1}. "${t.Name}" (${t.URL})`).join("\n");

    const prompt = `
당신은 AI 툴 정보 전문 조사원입니다.
google_search를 활용하여 아래 AI 도구들의 **최신 정보**를 조사하세요.

[조사 대상]
${toolList}

[조사 항목]
각 도구에 대해 다음을 조사하세요:
1. Description: 현재 시점의 정확한 설명 (2-3문장, 최신 기능 반영)
2. One_Line_Review: 한줄 요약 (한국어)
3. Pricing: 현재 요금 모델 (Free/Freemium/Paid)
4. Korean_Support: 한국어 지원 여부 (Y/N)
5. Platform: 지원 플랫폼 (Web/iOS/Android/Desktop 중 해당하는 것들)

[출력 규격]
반드시 JSON 배열만 출력하세요. 다른 텍스트 금지.
[
  {
    "index": 1,
    "name": "도구명",
    "Description": "최신 설명",
    "One_Line_Review": "한줄평",
    "Pricing": "Free/Freemium/Paid",
    "Korean_Support": "Y/N",
    "Platform": ["Web"]
  }
]
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
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

  // 업데이트 병합
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
    console.log("\n🔍 [Tool Validator Agent] 시작...\n");

    // Phase 1: 데이터 로드
    const { reportId, tools, weekLabel } = await loadPendingReport();

    // Phase 2: 3가지 검증 (AI 진위 + URL + 로고)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: [{ google_search: {} }]
    });

    const [aiResults, urlResults, logoResults] = await Promise.all([
      validateAiTools(model, tools),
      validateUrls(tools),
      validateLogos(tools),
    ]);

    // Phase 3: 결과 종합
    const validatedTools = aggregateResults(tools, aiResults, urlResults, logoResults);

    const passCount = validatedTools.filter(t => t._validation.validated).length;
    const failCount = validatedTools.length - passCount;
    console.log(`\n✅ 검증 결과: ${passCount}개 통과 / ${failCount}개 실패`);

    // 실패 항목 상세 출력
    const failedTools = validatedTools.filter(t => !t._validation.validated);
    if (failedTools.length > 0) {
      console.log("\n❌ 검증 실패 항목:");
      failedTools.forEach(t => {
        const issueStr = t._validation.issues.map(i => `${i.type}: ${i.detail}`).join(", ");
        console.log(`   - ${t.Name} (${t.URL}) → ${issueStr}`);
      });
    }

    // 로고 경고 출력
    const logoWarnings = validatedTools.filter(t => t._validation.issues.some(i => i.type === "logo_missing") && t._validation.validated);
    if (logoWarnings.length > 0) {
      console.log(`\n⚠️  로고 미확인 (경고): ${logoWarnings.length}개`);
      logoWarnings.slice(0, 10).forEach(t => console.log(`   - ${t.Name}`));
      if (logoWarnings.length > 10) console.log(`   ... 외 ${logoWarnings.length - 10}개`);
    }

    // Phase 4: 최신 정보 업데이트
    const finalTools = await updateToolInfo(model, validatedTools);

    // Phase 5: 보고서 저장 (pending — 관리자 컨펌 필수)
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
