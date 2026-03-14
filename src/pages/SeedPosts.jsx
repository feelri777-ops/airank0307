/**
 * 더미 게시물 시딩 페이지 (관리자 전용 일회성 사용)
 * URL: /seed  →  실행 후 App.jsx에서 라우트 제거 권장
 */
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const DUMMY_POSTS = [
  /* ── ChatGPT 게시판 ── */
  {
    board: "chatgpt", category: "tips",
    title: "ChatGPT로 이메일 10배 빠르게 쓰는 프롬프트 공유",
    content: `<h2>업무 이메일 작성 시간을 획기적으로 줄이는 방법</h2>
<p>안녕하세요! 회사에서 하루 평균 30~40개의 이메일을 써야 하는데, ChatGPT 덕분에 작성 시간이 <strong>80% 단축</strong>됐습니다.</p>
<h3>핵심 프롬프트</h3>
<pre><code>다음 상황에 맞는 전문적인 비즈니스 이메일을 작성해줘:
- 수신자: [상대방 역할]
- 목적: [이메일 목적]
- 톤: 정중하지만 간결하게
- 길이: 3문단 이내</code></pre>
<p>여기에 상황을 채워 넣으면 30초 안에 완성도 높은 이메일이 나옵니다. 특히 영문 이메일 작성할 때 더 효과적이에요!</p>
<blockquote>팁: "재작성해줘" 보다 "더 친근하게 바꿔줘", "더 간결하게 줄여줘" 처럼 구체적으로 피드백하면 훨씬 좋은 결과가 나옵니다.</blockquote>`,
  },
  {
    board: "chatgpt", category: "question",
    title: "GPT-4o 이미지 분석 기능 정확도가 어느 정도인가요?",
    content: `<p>안녕하세요. 최근 GPT-4o의 이미지 분석 기능을 업무에 활용하려고 하는데요.</p>
<p>주로 <strong>영수증 인식</strong>과 <strong>도면 해석</strong>에 사용하려고 합니다. 실제로 써보신 분들 경험 공유해주시면 감사하겠습니다!</p>
<ul>
  <li>영수증/청구서 텍스트 추출 정확도</li>
  <li>복잡한 도표나 차트 해석 능력</li>
  <li>한글 포함 이미지 인식률</li>
</ul>
<p>특히 한글 손글씨가 포함된 이미지 인식이 잘 되는지 궁금합니다 🙏</p>`,
  },
  {
    board: "chatgpt", category: "free",
    title: "ChatGPT 유료 구독 2년째 사용 후기",
    content: `<p>ChatGPT Plus를 2022년 말부터 쓰고 있는 장기 유저입니다.</p>
<h3>Good 👍</h3>
<ul>
  <li>코딩 작업 효율이 3배 이상 올랐습니다</li>
  <li>GPT-4o의 멀티모달 기능이 생각보다 강력함</li>
  <li>Custom Instructions로 개인화 설정 가능</li>
</ul>
<h3>아쉬운 점 👎</h3>
<ul>
  <li>사용량 제한이 생각보다 금방 차는 편</li>
  <li>긴 대화에서 컨텍스트를 잘 잊어버림</li>
</ul>
<p>그래도 월 20달러가 전혀 아깝지 않을 만큼 생산성 향상이 크네요. 특히 개발자분들께 강추합니다! 🚀</p>`,
  },
  {
    board: "chatgpt", category: "tips",
    title: "GPT에게 역할 부여하면 답변 품질이 달라진다",
    content: `<h2>Role Prompting 테크닉</h2>
<p>단순히 질문하는 것과 역할을 부여하는 것의 차이를 직접 비교해봤습니다.</p>
<h3>일반 질문</h3>
<pre><code>마케팅 전략을 알려줘</code></pre>
<h3>역할 부여 후 질문</h3>
<pre><code>당신은 10년 경력의 스타트업 CMO입니다.
초기 자본 500만원으로 B2B SaaS 제품의
첫 100명 고객을 확보하는 마케팅 전략을
단계별로 알려주세요.</code></pre>
<p>두 번째 방식이 <strong>훨씬 구체적이고 실용적인 답변</strong>을 줍니다. 역할, 제약 조건, 구체적 목표를 함께 제시하는 게 핵심이에요!</p>`,
  },
  {
    board: "chatgpt", category: "free",
    title: "ChatGPT API로 나만의 챗봇 만들어봤습니다",
    content: `<p>개발 공부 겸 ChatGPT API로 사내 FAQ 챗봇을 만들어봤어요.</p>
<h3>스택</h3>
<ul>
  <li>Backend: Python FastAPI</li>
  <li>Model: gpt-4o-mini (비용 효율적)</li>
  <li>Frontend: React</li>
</ul>
<p>월 API 비용이 팀 10명 기준 <strong>약 3~5달러</strong> 수준이라 매우 저렴합니다. 사내 문서를 RAG로 연결하니 정확도도 괜찮네요.</p>
<p>궁금하신 분들은 댓글 달아주시면 간단한 구현 코드 공유해드릴게요! 😊</p>`,
  },

  /* ── Gemini 게시판 ── */
  {
    board: "gemini", category: "tips",
    title: "Gemini 1.5 Pro 긴 문서 요약 완벽 활용법",
    content: `<h2>100만 토큰 컨텍스트의 힘</h2>
<p>Gemini 1.5 Pro의 가장 강력한 특징은 <strong>100만 토큰 컨텍스트 윈도우</strong>입니다. 이를 최대한 활용하는 방법을 공유합니다.</p>
<h3>활용 사례</h3>
<ul>
  <li>📄 200페이지 계약서 한 번에 분석</li>
  <li>📚 책 한 권 전체를 넣고 Q&A</li>
  <li>💻 대형 코드베이스 전체 리뷰</li>
</ul>
<h3>최적 프롬프트</h3>
<pre><code>다음 문서를 읽고:
1. 핵심 내용 3줄 요약
2. 주의해야 할 조항
3. 불분명한 부분
을 구분해서 정리해줘.</code></pre>
<p>GPT-4 대비 긴 문서 처리에서 확실히 우위에 있습니다!</p>`,
  },
  {
    board: "gemini", category: "question",
    title: "Gemini Advanced vs ChatGPT Plus 어떤 게 낫나요?",
    content: `<p>둘 다 비슷한 가격인데 어느 걸 써야 할지 고민입니다.</p>
<p>주요 사용 목적:</p>
<ul>
  <li>문서 작성 및 요약</li>
  <li>간단한 Python 코딩</li>
  <li>Google Workspace 연동</li>
</ul>
<p>Google Workspace를 많이 쓴다면 Gemini가 유리하다고 하던데, 실제 사용 경험 있으신 분들 의견 부탁드립니다! 특히 Google Docs, Gmail 연동이 얼마나 편리한지 궁금해요.</p>`,
  },
  {
    board: "gemini", category: "tips",
    title: "Gemini + Google Docs 연동으로 보고서 자동화하기",
    content: `<h2>Workspace 연동의 진가</h2>
<p>Gemini Advanced를 Google Workspace와 연동하면 정말 강력합니다. 실무에서 쓰는 방법 공유해요!</p>
<h3>보고서 자동화 플로우</h3>
<ol>
  <li>Google Sheets에 원본 데이터 정리</li>
  <li>Gemini에 "이 스프레드시트를 분석해서 주간 보고서 초안 작성해줘" 요청</li>
  <li>Google Docs에 자동 생성</li>
  <li>Gmail로 바로 발송</li>
</ol>
<p>이 과정이 <strong>수작업 대비 90% 시간 단축</strong>됩니다. Google 생태계를 많이 쓰시는 분들께 강력 추천!</p>`,
  },
  {
    board: "gemini", category: "free",
    title: "Gemini 이미지 생성 기능 써봤어요 (Imagen 3)",
    content: `<p>Gemini Advanced에서 Imagen 3으로 이미지를 생성해봤습니다.</p>
<h3>장점</h3>
<ul>
  <li>텍스트 렌더링이 Midjourney보다 훨씬 정확함</li>
  <li>한국어 프롬프트도 잘 이해함</li>
  <li>사실적인 사진 스타일이 강점</li>
</ul>
<h3>단점</h3>
<ul>
  <li>예술적/창의적 스타일은 Midjourney에 밀림</li>
  <li>하루 생성 횟수 제한 있음</li>
</ul>
<p>전반적으로 상업용 목적, 특히 <strong>텍스트가 포함된 이미지</strong> 제작엔 탁월합니다 👍</p>`,
  },
  {
    board: "gemini", category: "free",
    title: "Gemini 무료 버전으로 할 수 있는 것들 정리",
    content: `<p>돈 쓰기 아까운 분들을 위한 Gemini 무료 버전 활용 가이드입니다!</p>
<h3>무료로 되는 것 ✅</h3>
<ul>
  <li>기본 텍스트 대화 (Gemini 1.5 Flash)</li>
  <li>이미지 업로드 및 분석</li>
  <li>Google 검색 연동</li>
  <li>기본 코딩 지원</li>
</ul>
<h3>유료에서만 되는 것 💰</h3>
<ul>
  <li>Gemini 1.5 Pro (더 강력한 추론)</li>
  <li>Deep Research 기능</li>
  <li>Workspace 완전 통합</li>
</ul>
<p>가벼운 일상 용도라면 무료로도 충분합니다!</p>`,
  },

  /* ── Claude 게시판 ── */
  {
    board: "claude", category: "tips",
    title: "Claude가 코딩 리뷰에서 GPT보다 나은 이유",
    content: `<h2>코드 리뷰 품질 비교 후기</h2>
<p>6개월 동안 Claude Sonnet과 GPT-4o를 번갈아 쓰면서 코딩 작업에서 차이를 느꼈습니다.</p>
<h3>Claude가 앞서는 부분</h3>
<ul>
  <li><strong>맥락 이해력</strong>: 코드의 의도를 더 잘 파악함</li>
  <li><strong>설명 방식</strong>: 왜 틀렸는지 더 친절하게 설명</li>
  <li><strong>보안 이슈</strong>: SQL injection, XSS 등 보안 취약점 잘 잡아냄</li>
  <li><strong>긴 코드 처리</strong>: 200줄 이상에서도 일관성 유지</li>
</ul>
<pre><code>// 이런 식으로 요청하면 최고의 리뷰를 받을 수 있어요
"다음 코드를 리뷰해줘:
1. 버그 가능성
2. 성능 개선점
3. 보안 취약점
4. 더 Pythonic한 작성법"</code></pre>`,
  },
  {
    board: "claude", category: "question",
    title: "Claude Projects 기능 실제로 유용한가요?",
    content: `<p>Claude Pro의 Projects 기능을 써보려는데요, 실제로 효과가 있는지 궁금합니다.</p>
<p>특히 이런 용도로 쓰려고 합니다:</p>
<ul>
  <li>회사 내부 문서 업로드 후 QA</li>
  <li>특정 코딩 스타일 가이드 학습시키기</li>
  <li>장기 프로젝트 컨텍스트 유지</li>
</ul>
<p>혹시 쓰고 계신 분들 계신가요? 특히 <strong>컨텍스트가 얼마나 잘 유지되는지</strong> 알고 싶어요!</p>`,
  },
  {
    board: "claude", category: "tips",
    title: "Claude에게 글쓰기 맡길 때 이것만 알면 됩니다",
    content: `<h2>Claude 글쓰기 활용 팁</h2>
<p>Claude는 특히 <strong>글쓰기와 편집</strong>에서 탁월합니다. 실무에서 검증한 팁 공유해요.</p>
<h3>1. 페르소나 설정</h3>
<pre><code>당신은 10년 경력의 IT 전문 기자입니다.
독자는 30-40대 IT 업계 종사자입니다.</code></pre>
<h3>2. 구체적 제약 조건</h3>
<pre><code>- 분량: 800-1000자
- 소제목 3개 포함
- 데이터/수치 최소 2개 인용
- 마지막에 CTA 포함</code></pre>
<h3>3. 예시 스타일 제공</h3>
<p>참고할 글의 일부를 붙여넣으면 스타일을 잘 따라합니다. 이 세 가지만 지켜도 품질이 확 달라져요!</p>`,
  },
  {
    board: "claude", category: "free",
    title: "Claude vs GPT - 일주일 번갈아 쓴 솔직한 비교",
    content: `<p>두 AI를 일주일씩 메인으로 써보고 느낀 점을 솔직하게 공유합니다.</p>
<h3>Claude 승 🏆</h3>
<ul>
  <li>긴 글 분석 및 요약</li>
  <li>코드 리뷰 및 설명</li>
  <li>윤리적으로 민감한 주제 처리</li>
  <li>답변 신중함과 정확성</li>
</ul>
<h3>GPT 승 🏆</h3>
<ul>
  <li>DALL-E 이미지 생성 통합</li>
  <li>플러그인/GPT 생태계</li>
  <li>웹 검색 품질</li>
</ul>
<p>결론: 글쓰기·분석엔 Claude, 멀티미디어·검색엔 GPT가 유리한 것 같습니다 😊</p>`,
  },
  {
    board: "claude", category: "free",
    title: "Anthropic Claude의 Constitutional AI가 뭔가요?",
    content: `<p>Claude를 쓰다 보면 다른 AI보다 훨씬 신중하다는 느낌을 받았는데, 이유가 있더라고요.</p>
<h3>Constitutional AI란?</h3>
<p>Anthropic이 개발한 AI 안전 훈련 방법으로, AI가 <strong>스스로 자신의 답변을 평가</strong>하고 수정하도록 합니다.</p>
<ul>
  <li>해롭지 않고 (Harmless)</li>
  <li>도움이 되며 (Helpful)</li>
  <li>정직한 (Honest) 답변을 우선시</li>
</ul>
<p>이 때문에 Claude가 때로는 지나치게 조심스럽다고 느낄 수 있지만, 장기적으로 더 신뢰할 수 있는 AI 방향성이라고 생각합니다.</p>`,
  },

  /* ── 오픈소스 게시판 ── */
  {
    board: "opensource", category: "tips",
    title: "Llama 3.2 로컬에서 돌리는 가장 쉬운 방법 (Ollama)",
    content: `<h2>Ollama로 5분 만에 로컬 AI 세팅하기</h2>
<p>인터넷 없이, API 비용 없이 AI를 사용할 수 있습니다!</p>
<h3>설치 과정</h3>
<pre><code># 1. Ollama 설치 (macOS)
brew install ollama

# 2. Llama 3.2 다운로드 및 실행
ollama run llama3.2

# 3. 끝! 바로 대화 가능</code></pre>
<h3>시스템 요구사항</h3>
<ul>
  <li>RAM 8GB 이상 (8B 모델 기준)</li>
  <li>저장공간 5GB (모델 파일)</li>
  <li>M1 Mac 또는 NVIDIA GPU 권장</li>
</ul>
<p>개인 데이터를 AI에 넣기 부담스러웠던 분들께 강력 추천합니다! 🔒</p>`,
  },
  {
    board: "opensource", category: "question",
    title: "Mistral vs Llama 3 성능 차이 실제로 얼마나 나나요?",
    content: `<p>둘 다 오픈소스 LLM의 강자인데 실제 성능 차이가 궁금합니다.</p>
<p>주로 사용 목적:</p>
<ul>
  <li>한국어 텍스트 처리</li>
  <li>코드 생성 (Python 위주)</li>
  <li>로컬 환경 (8GB RAM 제한)</li>
</ul>
<p>벤치마크 수치가 아닌 <strong>실제 사용 경험</strong>으로 비교해주시면 감사하겠습니다. 특히 한국어 품질이 궁금해요!</p>`,
  },
  {
    board: "opensource", category: "tips",
    title: "Stable Diffusion로 일관된 캐릭터 생성하는 방법",
    content: `<h2>LoRA를 활용한 캐릭터 일관성 유지</h2>
<p>Stable Diffusion의 가장 큰 고민 중 하나인 캐릭터 일관성 문제를 해결하는 방법입니다.</p>
<h3>방법 1: LoRA 사용</h3>
<pre><code>Prompt: 1girl, blue hair, red eyes, school uniform,
&lt;lora:my_character:0.8&gt;, masterpiece, best quality</code></pre>
<h3>방법 2: IP-Adapter</h3>
<p>참조 이미지를 넣으면 얼굴과 스타일을 유지하면서 다양한 포즈/배경 생성이 가능합니다.</p>
<h3>추천 워크플로우</h3>
<ol>
  <li>캐릭터 LoRA 학습 (20~30장 이미지)</li>
  <li>IP-Adapter로 얼굴 고정</li>
  <li>ControlNet으로 포즈 조절</li>
</ol>
<p>이 세 가지를 조합하면 놀라운 일관성을 얻을 수 있어요! 🎨</p>`,
  },
  {
    board: "opensource", category: "free",
    title: "HuggingFace에서 좋은 모델 고르는 방법",
    content: `<p>HuggingFace에 수십만 개의 모델이 있어서 뭘 써야 할지 모르겠다는 분들을 위한 가이드입니다!</p>
<h3>좋은 모델 고르는 기준</h3>
<ol>
  <li><strong>Downloads 수</strong>: 많을수록 검증된 모델</li>
  <li><strong>업데이트 날짜</strong>: 최근 업데이트가 활발한지</li>
  <li><strong>Model Card</strong>: 상세한 설명이 있는지</li>
  <li><strong>라이선스</strong>: 상업적 사용 가능 여부 확인</li>
  <li><strong>커뮤니티 토론</strong>: 실제 사용자 피드백</li>
</ol>
<h3>분야별 추천 모델 (2025)</h3>
<ul>
  <li>텍스트 생성: Llama 3.2, Mistral 7B</li>
  <li>이미지: FLUX.1, SDXL</li>
  <li>음성: Whisper, Kokoro</li>
</ul>`,
  },
  {
    board: "opensource", category: "free",
    title: "오픈소스 AI가 결국 상용 AI를 따라잡을까요?",
    content: `<p>최근 오픈소스 AI의 발전 속도를 보면서 느끼는 점을 공유합니다.</p>
<h3>오픈소스의 강점</h3>
<ul>
  <li>커뮤니티의 빠른 혁신 속도</li>
  <li>파인튜닝으로 특정 도메인 특화 가능</li>
  <li>프라이버시·보안 측면의 우위</li>
  <li>비용 없음</li>
</ul>
<h3>아직 부족한 부분</h3>
<ul>
  <li>최상위 추론 능력 (GPT-4o, Claude Opus 수준)</li>
  <li>멀티모달 통합 완성도</li>
  <li>RL/RLHF 튜닝 인프라</li>
</ul>
<p>DeepSeek R1이 GPT-4급 성능을 오픈소스로 달성한 걸 보면, <strong>2~3년 내에 격차가 크게 줄어들 것</strong> 같습니다. 여러분의 생각은?</p>`,
  },
];

export default function SeedPosts() {
  const { user } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog((prev) => [...prev, msg]);

  const runSeed = async () => {
    if (!user) { alert("로그인이 필요합니다."); return; }
    setStatus("running");
    setProgress(0);
    setLog([]);

    for (let i = 0; i < DUMMY_POSTS.length; i++) {
      const post = DUMMY_POSTS[i];
      try {
        await addDoc(collection(db, "communityPosts"), {
          ...post,
          uid: user.uid,
          displayName: "AI머씀 관리자",
          photoURL: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          views: Math.floor(Math.random() * 120) + 10,
          likeCount: Math.floor(Math.random() * 30),
          commentCount: 0,
        });
        addLog(`✅ [${post.board}] ${post.title}`);
        setProgress(Math.round(((i + 1) / DUMMY_POSTS.length) * 100));
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        addLog(`❌ 실패: ${post.title} — ${e.message}`);
        setStatus("error");
        return;
      }
    }
    setStatus("done");
  };

  return (
    <div style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1.5rem", fontFamily: "Pretendard, sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>🌱 더미 게시물 시딩</h1>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        커뮤니티 게시판별 5개씩 총 20개의 더미 게시물을 생성합니다.<br />
        <strong>일회성 작업입니다. 완료 후 /seed 라우트를 제거해주세요.</strong>
      </p>

      {status === "idle" && (
        <button onClick={runSeed} style={{
          padding: "0.7rem 2rem", background: "#7c3aed", color: "#fff",
          border: "none", borderRadius: 8, fontSize: "0.95rem", fontWeight: 600, cursor: "pointer",
        }}>
          시딩 실행
        </button>
      )}

      {status === "running" && (
        <div>
          <div style={{ height: 8, background: "#e5e7eb", borderRadius: 8, marginBottom: "0.75rem" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#7c3aed", borderRadius: 8, transition: "width 0.3s" }} />
          </div>
          <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>{progress}% 완료...</p>
        </div>
      )}

      {status === "done" && (
        <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, color: "#166534", fontWeight: 600 }}>
          ✅ 시딩 완료! 총 {DUMMY_POSTS.length}개 게시물 생성됨
        </div>
      )}

      {log.length > 0 && (
        <div style={{ marginTop: "1rem", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "1rem", maxHeight: 300, overflowY: "auto" }}>
          {log.map((l, i) => <div key={i} style={{ fontSize: "0.8rem", color: "#374151", marginBottom: 4 }}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
