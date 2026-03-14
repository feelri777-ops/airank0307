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

  /* ── Stable Diffusion 게시판 ── */
  {
    board: "stablediffusion", category: "tips",
    title: "FLUX.1로 고퀄리티 이미지 뽑는 프롬프트 공식",
    content: `<h2>FLUX.1 최적 프롬프트 구조</h2>
<p>Stable Diffusion 최신 모델 FLUX.1을 제대로 활용하는 프롬프트 공식을 공유합니다.</p>
<h3>기본 구조</h3>
<pre><code>[주제] + [스타일] + [조명] + [카메라] + [퀄리티 태그]

예시:
a female warrior in silver armor,
digital painting style, cinematic lighting,
85mm portrait lens, ultra detailed, 8k</code></pre>
<h3>핵심 팁</h3>
<ul>
  <li>네거티브 프롬프트는 FLUX에서 효과가 줄어듦 — 포지티브에 집중</li>
  <li>Steps: 20~25로도 충분 (이전보다 효율적)</li>
  <li>CFG Scale: 3~5 권장 (너무 높으면 아티팩트 발생)</li>
</ul>`,
  },
  {
    board: "stablediffusion", category: "tips",
    title: "ControlNet으로 포즈 완벽하게 제어하는 방법",
    content: `<h2>ControlNet OpenPose 활용 가이드</h2>
<p>원하는 포즈를 정확하게 잡는 게 SD의 핵심 스킬입니다.</p>
<h3>워크플로우</h3>
<ol>
  <li>참조할 포즈 이미지 준비</li>
  <li>ControlNet OpenPose 모델 활성화</li>
  <li>Preprocessor: openpose_full 선택</li>
  <li>Control Weight: 0.8~1.0</li>
</ol>
<h3>추천 모델 조합</h3>
<ul>
  <li>실사 인물: RealisticVision + OpenPose</li>
  <li>애니 캐릭터: AnythingXL + OpenPose</li>
</ul>
<p>포즈 스켈레톤이 보이면 제대로 작동 중입니다. 손가락 표현은 <strong>HandRefiner</strong>도 함께 쓰면 완벽합니다!</p>`,
  },
  {
    board: "stablediffusion", category: "question",
    title: "VRAM 8GB로 SDXL 돌릴 수 있나요?",
    content: `<p>RTX 3070 (VRAM 8GB)을 사용 중인데 SDXL이 돌아가는지 궁금합니다.</p>
<ul>
  <li>현재 SD 1.5는 문제없이 사용 중</li>
  <li>SDXL 1.0 시도했더니 OOM 에러 발생</li>
</ul>
<p>혹시 8GB에서 SDXL 쓰는 분 계신가요? <strong>--medvram</strong> 옵션이나 다른 최적화 방법이 있는지 알려주세요!</p>`,
  },
  {
    board: "stablediffusion", category: "free",
    title: "Civitai에서 모델 고르는 팁 공유",
    content: `<h2>좋은 모델 찾는 방법</h2>
<p>Civitai에 수천 개의 모델이 있어 처음엔 뭘 써야 할지 막막합니다. 제가 쓰는 기준을 공유합니다!</p>
<h3>체크리스트</h3>
<ol>
  <li><strong>예시 이미지 확인</strong> — 실제 결과물이 내가 원하는 스타일인지</li>
  <li><strong>다운로드 수 + 좋아요 비율</strong> — 10만 이상이면 검증된 모델</li>
  <li><strong>베이스 모델 버전</strong> — SD1.5 / SDXL / FLUX 확인 필수</li>
  <li><strong>트리거 워드</strong> — 모델 카드에서 반드시 확인</li>
</ol>
<p>제 추천: 실사는 <strong>Realistic Vision</strong>, 애니는 <strong>Pony Diffusion</strong>, 일러스트는 <strong>DreamShaper XL</strong>!</p>`,
  },
  {
    board: "stablediffusion", category: "free",
    title: "ComfyUI vs A1111 어떤 걸 써야 하나요?",
    content: `<p>두 UI 모두 써본 경험을 바탕으로 추천드립니다.</p>
<h3>A1111 (AUTOMATIC1111)</h3>
<ul>
  <li>👍 초보자 친화적, 직관적 UI</li>
  <li>👍 확장 플러그인 엄청나게 많음</li>
  <li>👎 복잡한 워크플로우 구성 어려움</li>
</ul>
<h3>ComfyUI</h3>
<ul>
  <li>👍 노드 기반으로 무한한 커스텀 가능</li>
  <li>👍 FLUX 등 최신 모델 지원 빠름</li>
  <li>👎 초보자에게 진입장벽 높음</li>
</ul>
<p><strong>결론</strong>: 처음엔 A1111, 익숙해지면 ComfyUI로 갈아타는 걸 추천합니다!</p>`,
  },

  /* ── Runway 게시판 ── */
  {
    board: "runway", category: "tips",
    title: "Runway Gen-3로 시네마틱 영상 만드는 프롬프트",
    content: `<h2>Gen-3 Alpha 영상 프롬프트 공식</h2>
<p>Runway Gen-3로 영화 같은 영상을 만드는 프롬프트 구조를 공유합니다.</p>
<h3>기본 구조</h3>
<pre><code>[카메라 무브먼트], [피사체 + 행동], [배경/환경], [조명], [스타일]

예시:
Slow dolly shot, a young woman walking through
a neon-lit Tokyo street at night, rain reflecting
on the pavement, cinematic, 4K film grain</code></pre>
<h3>카메라 무브먼트 키워드</h3>
<ul>
  <li>Slow dolly in/out — 서서히 당기기/빼기</li>
  <li>Aerial drone shot — 드론 샷</li>
  <li>Handheld shaky — 핸드헬드 감성</li>
</ul>`,
  },
  {
    board: "runway", category: "tips",
    title: "Runway 영상 + CapCut 조합으로 유튜브 쇼츠 만들기",
    content: `<h2>AI 영상 제작 워크플로우</h2>
<p>Runway로 소스 영상 생성 → CapCut으로 편집하는 실전 플로우입니다.</p>
<h3>단계별 과정</h3>
<ol>
  <li>ChatGPT로 스크립트 작성</li>
  <li>Runway Gen-3으로 장면별 5초 클립 생성</li>
  <li>ElevenLabs로 AI 나레이션 생성</li>
  <li>CapCut에서 클립 + 나레이션 편집</li>
  <li>자막 자동 생성 후 내보내기</li>
</ol>
<p>이 플로우로 <strong>1시간 안에 60초 쇼츠</strong> 완성 가능합니다. 촬영 장비 없이도 퀄리티 있는 콘텐츠가 나와요!</p>`,
  },
  {
    board: "runway", category: "question",
    title: "Runway vs Sora vs Kling 중 뭐가 제일 잘 나오나요?",
    content: `<p>AI 영상 생성 툴을 비교해보고 싶은데 다 써보기엔 비용이 부담됩니다.</p>
<p>주로 만들려는 콘텐츠:</p>
<ul>
  <li>인물 중심 영상 (얼굴 일관성 중요)</li>
  <li>풍경/자연 영상</li>
  <li>제품 광고용 클립</li>
</ul>
<p>각 툴별 장단점 경험해보신 분 계신가요? 특히 <strong>얼굴 일관성</strong>이 어느 툴이 가장 좋은지 궁금합니다!</p>`,
  },
  {
    board: "runway", category: "free",
    title: "Runway 크레딧 효율적으로 쓰는 방법",
    content: `<p>Runway 크레딧이 생각보다 빨리 소진돼서 효율적으로 쓰는 팁을 공유합니다.</p>
<h3>크레딧 절약 팁</h3>
<ul>
  <li><strong>프롬프트를 먼저 충분히 다듬기</strong> — 첫 시도에 만족하는 게 최고의 절약</li>
  <li><strong>5초 먼저 테스트</strong> — 10초짜리 바로 만들지 말고 5초로 방향 확인</li>
  <li><strong>이미지 to 비디오 활용</strong> — 텍스트 to 비디오보다 안정적이고 크레딧 효율 좋음</li>
  <li><strong>Standard 플랜 연간 결제</strong> — 월 결제 대비 약 35% 절약</li>
</ul>`,
  },
  {
    board: "runway", category: "free",
    title: "크리에이터가 Runway를 써야 하는 이유",
    content: `<p>영상 편집자/유튜버 관점에서 Runway가 왜 게임체인저인지 정리해봤습니다.</p>
<h3>실무에서 가장 유용한 기능</h3>
<ul>
  <li><strong>Remove Background</strong> — 초록 스크린 없이 배경 제거</li>
  <li><strong>Inpainting</strong> — 영상 속 특정 요소 삭제/변경</li>
  <li><strong>Gen-3 Text to Video</strong> — B롤 촬영 비용 대폭 절감</li>
</ul>
<p>B롤 한 번 찍으러 가면 반나절인데, Runway면 10분입니다. 유튜브 채널 운영하시는 분들께 강력 추천!</p>`,
  },

  /* ── Suno 게시판 ── */
  {
    board: "suno", category: "tips",
    title: "Suno v4 최고 품질 뽑는 프롬프트 작성법",
    content: `<h2>Suno v4 Style Prompt 완전 가이드</h2>
<p>Suno v4에서 진짜 듣기 좋은 음악 뽑는 방법을 공유합니다.</p>
<h3>스타일 프롬프트 구조</h3>
<pre><code>[장르] + [분위기] + [악기] + [BPM/템포] + [특징]

예시:
Korean indie pop, melancholic and dreamy,
acoustic guitar and soft piano,
mid-tempo 85bpm, breathy female vocals,
reverb-heavy production</code></pre>
<h3>꿀팁</h3>
<ul>
  <li>악기를 구체적으로 나열할수록 좋음</li>
  <li>BPM 숫자를 직접 명시하면 더 정확함</li>
  <li>레퍼런스 아티스트 언급: "in the style of IU"</li>
</ul>`,
  },
  {
    board: "suno", category: "tips",
    title: "Suno로 유튜브 배경음악 만들어서 저작권 걱정 없애기",
    content: `<h2>저작권 Free 배경음악 제작 가이드</h2>
<p>유튜브 영상에 배경음악 쓰다가 저작권 경고 받으신 분들! Suno로 해결하세요.</p>
<h3>콘텐츠 유형별 추천 스타일</h3>
<ul>
  <li>브이로그: <code>lo-fi hip hop, chill, relaxing, 75bpm</code></li>
  <li>테크 리뷰: <code>electronic, futuristic, upbeat, minimal</code></li>
  <li>요리 영상: <code>acoustic, warm, cozy, bossa nova feel</code></li>
  <li>게임: <code>epic orchestral, intense, dramatic, cinematic</code></li>
</ul>
<p>Pro 플랜이면 상업적 이용 가능! 월 8달러로 무제한 생성입니다 🎵</p>`,
  },
  {
    board: "suno", category: "question",
    title: "Suno로 만든 음악 멜론/스포티파이에 올릴 수 있나요?",
    content: `<p>Suno Pro 사용 중인데, 생성한 음악을 음원 플랫폼에 배포할 수 있는지 궁금합니다.</p>
<p>확인하고 싶은 것들:</p>
<ul>
  <li>Suno Pro 플랜에서 상업적 이용 범위</li>
  <li>DistroKid 같은 배포 서비스 이용 가능 여부</li>
  <li>저작권 귀속이 나에게 완전히 오는지</li>
</ul>
<p>약관을 읽어봤는데 해석이 애매해서요. 실제로 배포해보신 분 계신가요?</p>`,
  },
  {
    board: "suno", category: "free",
    title: "Suno vs Udio 비교 후기 (2025 기준)",
    content: `<p>두 AI 음악 생성 툴을 3개월 써본 솔직한 비교입니다.</p>
<h3>Suno v4</h3>
<ul>
  <li>👍 보컬 품질이 압도적으로 자연스러움</li>
  <li>👍 다양한 장르 처리 능력</li>
  <li>👎 가사 발음이 가끔 뭉개짐</li>
</ul>
<h3>Udio</h3>
<ul>
  <li>👍 악기 편성이 더 정교함</li>
  <li>👍 클래식/재즈 장르에서 강점</li>
  <li>👎 보컬 스타일이 제한적</li>
</ul>
<p><strong>결론</strong>: 팝/힙합/인디는 Suno, 클래식/재즈/악기 위주는 Udio가 유리합니다!</p>`,
  },
  {
    board: "suno", category: "free",
    title: "AI 음악으로 월 100만원 버는 방법 실제로 가능할까?",
    content: `<p>유튜브에서 'Suno로 돈 버는 방법' 영상들이 많던데 실제로 검증해봤습니다.</p>
<h3>현실적인 수익 모델</h3>
<ul>
  <li><strong>유튜브 채널</strong>: AI 음악 스트리밍 채널 (로파이, 집중 음악 등) — 실제로 수익 나는 채널 있음</li>
  <li><strong>라이선스 판매</strong>: Pond5, AudioJungle 등에 배포 — 심사 통과가 관건</li>
  <li><strong>유튜버 의뢰</strong>: 개인 채널용 BGM 제작 서비스</li>
</ul>
<h3>현실적인 기대치</h3>
<p>월 100만원은 상당히 어렵습니다. 하지만 <strong>월 10~30만원 부수입</strong>은 꾸준히 하면 가능한 수준이에요. 과장 광고에 주의하세요!</p>`,
  },

  /* ── Windsurf 게시판 ── */
  {
    board: "windsurf", category: "tips",
    title: "Windsurf Cascade로 대규모 리팩토링 하는 방법",
    content: `<h2>Cascade Flow 활용 가이드</h2>
<p>Windsurf의 핵심 기능인 Cascade를 사용해 레거시 코드를 리팩토링하는 방법입니다.</p>
<h3>효과적인 프롬프트 예시</h3>
<pre><code>"이 프로젝트의 모든 클래스 컴포넌트를
함수형 컴포넌트 + hooks로 변환해줘.
기존 로직은 유지하면서 코드 스타일은
Airbnb 가이드라인을 따라줘."</code></pre>
<h3>핵심 팁</h3>
<ul>
  <li>파일 단위보다 <strong>폴더 단위로 컨텍스트</strong>를 주면 더 일관된 리팩토링이 됨</li>
  <li>변경 후 "테스트 코드도 업데이트해줘" 이어서 요청</li>
  <li>대규모 변경은 브랜치 따서 진행 권장</li>
</ul>`,
  },
  {
    board: "windsurf", category: "tips",
    title: "Cursor vs Windsurf 실무에서 6개월 써본 비교",
    content: `<h2>두 AI 코딩 에디터 완전 비교</h2>
<p>스타트업에서 풀스택 개발자로 둘 다 써본 솔직한 비교입니다.</p>
<h3>Windsurf가 앞서는 부분</h3>
<ul>
  <li><strong>Flows</strong>: 멀티파일 동시 수정이 더 자연스러움</li>
  <li><strong>가격</strong>: Pro 플랜이 Cursor보다 저렴</li>
  <li><strong>속도</strong>: 자동완성 응답 속도 더 빠름</li>
</ul>
<h3>Cursor가 앞서는 부분</h3>
<ul>
  <li>에코시스템과 커뮤니티 규모</li>
  <li>Claude/GPT 모델 선택 폭</li>
  <li>@ 참조 기능의 완성도</li>
</ul>
<p>주니어 개발자는 Cursor, 멀티파일 작업이 많은 시니어는 Windsurf를 추천합니다!</p>`,
  },
  {
    board: "windsurf", category: "question",
    title: "Windsurf에서 기존 VSCode 확장 그대로 쓸 수 있나요?",
    content: `<p>VSCode에서 Windsurf로 넘어가고 싶은데 확장 프로그램 호환이 걱정됩니다.</p>
<p>현재 필수로 쓰는 확장들:</p>
<ul>
  <li>ESLint, Prettier</li>
  <li>GitLens</li>
  <li>Thunder Client</li>
  <li>Remote - SSH</li>
</ul>
<p>이것들이 Windsurf에서 다 작동하는지 써보신 분 계신가요? 특히 <strong>Remote SSH</strong> 호환 여부가 제일 궁금합니다.</p>`,
  },
  {
    board: "windsurf", category: "free",
    title: "Windsurf로 React 프로젝트 처음부터 만들어봤습니다",
    content: `<p>AI 코딩 에디터로 제로베이스부터 풀 프로젝트를 만들어본 후기입니다.</p>
<h3>프로젝트 스펙</h3>
<ul>
  <li>React + TypeScript + Tailwind</li>
  <li>Firebase 백엔드</li>
  <li>총 20개 컴포넌트</li>
</ul>
<h3>결과</h3>
<p>혼자 코딩했으면 <strong>2주 걸릴 프로젝트</strong>를 3일 만에 완성했습니다. 물론 버그 수정에 시간을 많이 썼지만, 전체적인 생산성은 5배 이상 향상된 느낌입니다.</p>
<p>특히 Cascade가 "이 컴포넌트 구조를 다른 컴포넌트에도 적용해줘"라는 요청을 정말 잘 처리했어요!</p>`,
  },
  {
    board: "windsurf", category: "free",
    title: "AI 코딩 툴 때문에 개발자가 사라질까요?",
    content: `<p>Windsurf, Cursor 같은 AI 코딩 툴을 쓰다 보면 드는 생각을 공유합니다.</p>
<h3>제 생각</h3>
<p>단순 반복 코딩은 확실히 줄어들고 있습니다. 하지만 AI가 생성한 코드를 <strong>리뷰하고 아키텍처를 설계하는 능력</strong>은 오히려 더 중요해지고 있어요.</p>
<ul>
  <li>AI가 잘하는 것: 보일러플레이트, 간단한 함수, 테스트 작성</li>
  <li>아직 사람이 필요한 것: 요구사항 분석, 아키텍처 설계, 비즈니스 로직 판단</li>
</ul>
<p>개발자가 사라지는 게 아니라 <strong>역할이 바뀌는 것</strong>이라고 생각합니다. 여러분은 어떻게 생각하세요?</p>`,
  },

  /* ── Notion AI 게시판 ── */
  {
    board: "notion", category: "tips",
    title: "Notion AI로 회의록 자동 정리하는 워크플로우",
    content: `<h2>회의록 자동화 완전 가이드</h2>
<p>회의할 때마다 회의록 정리에 30분씩 쓰던 걸 Notion AI로 5분으로 줄였습니다!</p>
<h3>워크플로우</h3>
<ol>
  <li>회의 중 Notion 페이지에 키워드/메모만 빠르게 입력</li>
  <li>회의 후 AI 버튼 클릭 → "회의록 형식으로 정리해줘"</li>
  <li>자동으로 <strong>안건 / 결정사항 / 액션아이템 / 담당자</strong> 분류</li>
  <li>슬랙 채널에 요약본 바로 공유</li>
</ol>
<h3>팁</h3>
<p>회의 중에 ⭐ 표시로 중요한 포인트를 마킹해두면 AI가 더 정확하게 요약합니다!</p>`,
  },
  {
    board: "notion", category: "tips",
    title: "Notion AI Q&A 기능으로 팀 지식베이스 구축하기",
    content: `<h2>AI 기반 팀 지식베이스</h2>
<p>Notion AI Q&A는 워크스페이스의 모든 문서에서 답을 찾아주는 기능입니다.</p>
<h3>활용 사례</h3>
<ul>
  <li>"온보딩 절차가 어떻게 되지?" → 온보딩 문서에서 자동 답변</li>
  <li>"지난 분기 OKR이 뭐였지?" → KPI 문서에서 즉시 검색</li>
  <li>"A 프로젝트 담당자가 누구야?" → 프로젝트 페이지에서 추출</li>
</ul>
<h3>효과적인 구조 만들기</h3>
<p>Q&A 품질을 높이려면 각 페이지 상단에 <strong>한 줄 요약 + 태그</strong>를 달아두는 게 핵심입니다!</p>`,
  },
  {
    board: "notion", category: "question",
    title: "Notion AI 플러스 플랜 실제로 쓸 만한가요?",
    content: `<p>Notion AI를 추가 구독할지 고민 중입니다. 월 10달러 추가 비용이 아깝지 않은지요.</p>
<p>주로 쓰는 용도:</p>
<ul>
  <li>프로젝트 문서 작성</li>
  <li>아이디어 정리 및 구조화</li>
  <li>팀 회의록 관리</li>
</ul>
<p>무료 AI 기능(가끔 쓰는 수준)과 유료의 차이가 실제로 체감될 만큼 큰지 궁금합니다. 특히 Q&A 기능이 얼마나 정확한지 알고 싶어요!</p>`,
  },
  {
    board: "notion", category: "free",
    title: "Notion + AI로 혼자 사이드 프로젝트 관리하는 법",
    content: `<h2>솔로 프로젝트 관리 시스템</h2>
<p>풀타임 직장 다니면서 사이드 프로젝트 3개를 동시에 관리하는 제 Notion 구조를 공유합니다.</p>
<h3>기본 구조</h3>
<ul>
  <li><strong>Master DB</strong>: 모든 태스크 통합 관리</li>
  <li><strong>Weekly Review</strong>: AI가 이번 주 완료 항목 자동 요약</li>
  <li><strong>Idea Dump</strong>: 떠오르는 아이디어 → AI가 구조화</li>
</ul>
<h3>AI 활용 포인트</h3>
<p>"이번 주 완료된 태스크를 보고서 형식으로 정리해줘" 한 줄로 주간 회고 완성. 혼자 해도 팀처럼 체계적으로 관리가 됩니다!</p>`,
  },
  {
    board: "notion", category: "free",
    title: "Notion이 Obsidian보다 팀 협업에 좋은 이유",
    content: `<p>개인 노트는 Obsidian, 팀 협업은 Notion을 쓰는 이유를 정리해봤습니다.</p>
<h3>Notion의 강점</h3>
<ul>
  <li>실시간 멀티 편집이 자연스러움</li>
  <li>데이터베이스 + 다양한 뷰 (갤러리, 캘린더, 보드)</li>
  <li>Notion AI가 팀 문서 전체를 컨텍스트로 활용</li>
  <li>비개발자도 쉽게 접근 가능</li>
</ul>
<h3>Obsidian의 강점</h3>
<ul>
  <li>로컬 마크다운 파일, 완전한 데이터 소유권</li>
  <li>그래프 뷰로 지식 연결 시각화</li>
  <li>플러그인 생태계</li>
</ul>`,
  },

  /* ── Sora 게시판 ── */
  {
    board: "sora", category: "tips",
    title: "Sora로 1분짜리 단편 영상 만드는 프롬프트 전략",
    content: `<h2>Sora 장편 영상 제작 가이드</h2>
<p>Sora의 최대 강점은 최대 1분 영상을 일관성 있게 생성할 수 있다는 점입니다.</p>
<h3>씬 분할 전략</h3>
<pre><code>씬 1 (0-15초): 도입부 — 배경과 분위기 설정
씬 2 (15-40초): 전개 — 주요 행동/이벤트
씬 3 (40-60초): 마무리 — 감정적 마무리</code></pre>
<h3>일관성 유지 팁</h3>
<ul>
  <li>캐릭터 외모를 첫 씬에서 매우 구체적으로 묘사</li>
  <li>같은 색상 팔레트 키워드를 모든 씬에 반복</li>
  <li>"Consistent with previous scene" 문구 추가</li>
</ul>`,
  },
  {
    board: "sora", category: "tips",
    title: "Sora 물리 시뮬레이션이 진짜 놀라운 장면들",
    content: `<h2>Sora의 물리 법칙 이해 능력</h2>
<p>다른 AI 영상 툴과 Sora가 가장 차별화되는 부분은 물리 시뮬레이션 품질입니다.</p>
<h3>Sora가 잘 만드는 장면</h3>
<ul>
  <li>물결, 파도, 액체 흐름</li>
  <li>천/옷감의 자연스러운 움직임</li>
  <li>불, 연기, 먼지 파티클</li>
  <li>유리 깨짐, 물체 충돌</li>
</ul>
<h3>최적 프롬프트</h3>
<pre><code>"물리적으로 정확한" 또는 "physically realistic"
키워드를 추가하면 더 자연스러운 결과가 나옵니다.</code></pre>`,
  },
  {
    board: "sora", category: "question",
    title: "Sora 한국에서 정식으로 쓸 수 있나요?",
    content: `<p>Sora가 일부 지역에서 제한된다고 들었는데 한국에서 정상적으로 이용 가능한지 궁금합니다.</p>
<ul>
  <li>ChatGPT Plus 구독 중인데 Sora 접근 가능한지</li>
  <li>월 사용 한도가 얼마인지</li>
  <li>생성 해상도와 최대 길이</li>
</ul>
<p>공식 페이지 확인해봤는데 한국 관련 내용이 명확하지 않아서요. 실제로 사용 중이신 분 계신가요?</p>`,
  },
  {
    board: "sora", category: "free",
    title: "Sora로 만든 영상 유튜브에 올려도 되나요? (저작권 이슈)",
    content: `<p>Sora로 만든 영상을 수익화 채널에 업로드하려는데 저작권 관계가 복잡하더라고요.</p>
<h3>현재 OpenAI 정책 요약</h3>
<ul>
  <li>Plus/Pro 플랜: 상업적 이용 허용</li>
  <li>생성된 영상의 저작권은 사용자에게 귀속</li>
  <li>단, AI 생성 콘텐츠임을 명시해야 하는 플랫폼 정책 별도 확인 필요</li>
</ul>
<h3>유튜브 정책</h3>
<p>2024년부터 AI 생성 콘텐츠는 영상 설명에 AI 생성 여부를 <strong>반드시 표시</strong>해야 합니다. 수익화 자체는 가능하나 미표시 시 제재 가능.</p>`,
  },
  {
    board: "sora", category: "free",
    title: "Sora가 영상 제작 업계를 바꿀 수 있을까?",
    content: `<p>영상 PD로 일하면서 Sora를 써본 입장에서 솔직하게 얘기해봅니다.</p>
<h3>현재 수준으로 대체 가능한 것</h3>
<ul>
  <li>간단한 B롤 촬영</li>
  <li>컨셉/무드보드 영상</li>
  <li>소규모 유튜브 콘텐츠</li>
</ul>
<h3>아직 한계인 것</h3>
<ul>
  <li>인물 연기와 감정 표현의 미세함</li>
  <li>정확한 브랜드 가이드라인 적용</li>
  <li>실제 제품 광고 (클로즈업, 텍스트 정확도)</li>
</ul>
<p>당장 업계가 무너지진 않겠지만, <strong>3~5년 안에 독립 크리에이터 시장은 크게 재편</strong>될 것 같습니다.</p>`,
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
