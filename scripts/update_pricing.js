import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRICING_JSON_PATH = path.join(__dirname, '..', 'public', 'pricing-data.json');
const MODEL = "gemini-3-flash-preview";
const TODAY = new Date().toISOString().split('T')[0];

// ========================================
// 1. 환경 변수 로드
// ========================================
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0)
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  });
}

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) { console.error("❌ GEMINI_API_KEY가 없습니다."); process.exit(1); }

// ========================================
// 2. Firebase 초기화
// ========================================
if (admin.apps.length === 0) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } else {
    const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
    } else { console.error("❌ Firebase 인증 키를 찾을 수 없습니다."); process.exit(1); }
  }
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ========================================
// 3. JSON 추출 유틸
// ========================================
function extractJSON(text) {
  const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) return JSON.parse(match[0]);
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// ========================================
// 4. 프롬프트 빌더
// ========================================
function buildPrompt(tools, strategy) {
  const toolList = tools
    .map(t => `- ID: ${t.id}, 이름: ${t.name}, URL: ${t.url || "없음"}`)
    .join('\n');

  const strategyGuide = {
    url: `각 도구의 URL을 직접 방문하여 가격 정보를 수집하라.
메인 페이지에 가격이 없으면 /pricing, /plans, /billing, /upgrade 등 하위 페이지도 확인하라.
출처는 "공식 사이트"로 표기하라.`,

    search: `Google 검색으로 각 도구의 최신 가격 정보를 수집하라.
검색어 예시: "[서비스명] pricing 2026", "[서비스명] subscription plans", "[서비스명] pro vs free"
G2(g2.com), Capterra(capterra.com) 등 IT 리뷰 사이트의 최근 3~6개월 데이터를 우선 참조하라.
출처는 "search_estimated"로 표기하라.`,

    fallback: `위 방법으로 정보를 얻을 수 없으므로 학습 데이터를 기반으로 최선의 추정치를 제공하라.
반드시 출처를 "내부 지식"으로 표기하고 신뢰도를 "Low"로 설정하라.`,
  };

  return `너는 AI 시장 분석 전문가이다. 아래 AI 도구들의 최신 결제 플랜 정보를 수집하여 JSON으로 반환하라.

[수집 대상]
${toolList}

[수집 전략]
${strategyGuide[strategy]}

[예외 처리]
- 서비스가 폐업했거나 Enterprise-only인 경우: note 필드에 구체적 사유 기재
- 가격이 "문의하기(Contact Sales)"만 있는 경우: price 필드에 "Contact Sales" 표기
- 사이트가 차단되거나 접근 불가인 경우: 다음 단계(search → fallback)로 넘어갈 것

[출력 형식 - JSON 배열만 반환, 앞뒤 설명 없이]
[
  {
    "id": "제공된 ID를 절대 변경하지 말 것",
    "pricing": {
      "free": {
        "available": true,
        "details": "무료 플랜 주요 혜택 및 제한사항을 한국어로 설명. 없으면 null"
      },
      "pro": {
        "monthly": "$XX",
        "yearly": "$XX/yr",
        "details": "Pro 플랜 핵심 기능을 한국어로 설명. 없으면 null"
      },
      "business": {
        "price": "$XX/월 per user 또는 Contact Sales",
        "details": "팀/비즈니스 플랜 협업 기능 및 보안 정책을 한국어로 설명. 없으면 null"
      }
    },
    "reliability": {
      "score": "High 또는 Mid 또는 Low",
      "source": "공식 사이트 또는 search_estimated 또는 내부 지식"
    },
    "last_updated": "${TODAY}",
    "note": "예외 사항이 있을 경우 한국어로 기재. 없으면 빈 문자열"
  }
]

[절대 규칙]
- "id" 값은 반드시 위에서 제공한 값 그대로 사용할 것 (절대 변경 금지)
- 모든 설명(details, note)은 한국어로 작성할 것
- 플랜이 존재하지 않는 경우 해당 필드를 null로 설정할 것`;
}

// ========================================
// 5. 3단계 수집 전략
// ========================================
async function tryUrlContext(tools) {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      tools: [{ urlContext: {} }],
    });
    const result = await model.generateContent(buildPrompt(tools, 'url'));
    const parsed = extractJSON(result.response.text());
    if (parsed && parsed.length > 0) {
      console.log(`  ✅ URL Context 성공 (${parsed.length}개)`);
      return parsed;
    }
    return null;
  } catch (e) {
    console.log(`  ⚠️  URL Context 실패: ${e.message.substring(0, 100)}`);
    return null;
  }
}

async function tryGoogleSearch(tools) {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      tools: [{ googleSearch: {} }],
    });
    const result = await model.generateContent(buildPrompt(tools, 'search'));
    const parsed = extractJSON(result.response.text());
    if (parsed && parsed.length > 0) {
      console.log(`  ✅ Google Search 성공 (${parsed.length}개)`);
      return parsed;
    }
    return null;
  } catch (e) {
    console.log(`  ⚠️  Google Search 실패: ${e.message.substring(0, 100)}`);
    return null;
  }
}

async function tryFallback(tools) {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(buildPrompt(tools, 'fallback'));
    const parsed = extractJSON(result.response.text());
    if (parsed && parsed.length > 0) {
      console.log(`  ✅ 내부 지식 Fallback 성공 (${parsed.length}개)`);
      return parsed.map(p => ({
        ...p,
        reliability: { score: "Low", source: "내부 지식" },
      }));
    }
    return [];
  } catch (e) {
    console.log(`  ❌ Fallback도 실패: ${e.message.substring(0, 100)}`);
    return [];
  }
}

async function processBatch(tools) {
  console.log(`  🔍 1단계: URL 직접 방문 시도...`);
  let result = await tryUrlContext(tools);

  if (!result || result.length === 0) {
    console.log(`  🔍 2단계: Google Search 시도...`);
    result = await tryGoogleSearch(tools);
  }

  if (!result || result.length === 0) {
    console.log(`  🔍 3단계: 내부 지식 Fallback...`);
    result = await tryFallback(tools);
  }

  return result || [];
}

// ========================================
// 6. 메인 실행
// ========================================
async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const limit = parseInt(
    process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '100'
  );

  console.log(`\n🚀 AI 요금제 자동 수집 시작`);
  console.log(`   모델: ${MODEL}`);
  console.log(`   대상: 상위 ${limit}개 툴`);
  console.log(`   모드: ${isDryRun ? '시뮬레이션 (DB 미반영)' : '실제 업데이트'}\n`);

  const snapshot = await db.collection("tools").orderBy("score", "desc").limit(limit).get();
  const allTools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`✅ Firestore에서 ${allTools.length}개 툴 로드 완료\n`);

  const existingData = fs.existsSync(PRICING_JSON_PATH)
    ? JSON.parse(fs.readFileSync(PRICING_JSON_PATH, 'utf8'))
    : {};

  const allUpdates = { ...existingData };
  const BATCH_SIZE = 10;

  for (let i = 0; i < allTools.length; i += BATCH_SIZE) {
    const chunk = allTools.slice(i, i + BATCH_SIZE);
    const rangeEnd = Math.min(i + BATCH_SIZE, allTools.length);
    console.log(`━━━ [${i + 1}~${rangeEnd}번] ${chunk.map(t => t.name).join(', ')} ━━━`);

    const updates = await processBatch(chunk);

    if (isDryRun) {
      updates.forEach(u => {
        const t = chunk.find(c => c.id === u.id);
        if (t) {
          const freeStatus = u.pricing?.free?.available ? '무료 있음' : '무료 없음';
          const proPrice = u.pricing?.pro?.monthly || '정보 없음';
          console.log(`  📝 [${t.name}] ${freeStatus} | Pro: ${proPrice} | 신뢰도: ${u.reliability?.score} (${u.reliability?.source})`);
        }
      });
    } else if (updates.length > 0) {
      const batch = db.batch();
      let count = 0;

      for (const u of updates) {
        const original = chunk.find(c => c.id === u.id);
        if (!original) {
          console.log(`  ⚠️  ID 미일치로 건너뜀: ${u.id}`);
          continue;
        }
        batch.set(db.collection("tools").doc(u.id), {
          pricingData: u.pricing,
          pricingReliability: u.reliability,
          pricingNote: u.note || "",
          last_pricing_update: u.last_updated,
        }, { merge: true });
        allUpdates[u.id] = u;
        count++;
      }

      if (count > 0) {
        await batch.commit();
        console.log(`  ✨ ${count}개 Firestore 업데이트 완료`);
      }
    }

    // 다음 배치 전 딜레이 (API 레이트 리밋 방지)
    if (i + BATCH_SIZE < allTools.length) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (!isDryRun) {
    try {
      fs.writeFileSync(PRICING_JSON_PATH, JSON.stringify(allUpdates, null, 2));
      console.log(`\n💾 pricing-data.json 저장 완료: ${PRICING_JSON_PATH}`);
    } catch (err) {
      console.error("❌ JSON 파일 저장 실패:", err);
    }
  }

  console.log(`\n🎉 요금제 자동 수집 완료! ${isDryRun ? '(시뮬레이션 - 실제 반영 없음)' : ''}`);
  process.exit(0);
}

main().catch(e => { console.error("❌ 오류:", e); process.exit(1); });
