import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const getAIConciergeResponse = async (userPrompt, tools) => {
  if (!API_KEY) {
    throw new Error("Gemini API Key가 설정되지 않았습니다. .env 파일을 확인해 주세요.");
  }

  // API 버전을 v1으로 강제 지정하여 404 에러 방지
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  // 구글 검색(Grounding) 기능을 도구로 추가 (API 서버 권장 명칭으로 수정)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    tools: [{ google_search: {} }] 
  });

  // 도구 리스트 요약 (AI에게 전달할 컨텍스트)
  const contextTools = tools.map(t => ({
    id: t.id,
    name: t.name,
    desc: t.desc,
    cat: t.cat,
    tags: t.tags
  }));

  const prompt = `
당신은 대한민국 AI 도구 랭킹 사이트 'AIRANK.KR'의 'AI 컨시어지'입니다.
사용자의 질문(상황)을 분석하여, 제공된 도구 리스트 중에서 가장 적합한 5가지를 추천해 주세요.

[중요 지시사항]
1. 구글 검색을 활용하여 최신 트렌드를 파악한 후, 도구들을 매칭해 주세요.
2. **[A+B 조합 추천]**: 개별 도구만 추천하지 말고, "A 도구로 초안을 잡고 B 도구로 완성하라"는 식으로 두 가지 이상의 도구를 섞어서 시너지를 내는 최강의 조합(Best Mix)을 최소 하나 이상 제안해 주세요.
3. 각 도구의 카테고리(cat) 정보를 확인하여 관련 게시판을 유추하여 언급해 주세요.

[사용자 상황]
"${userPrompt}"

[추천 가능한 도구 리스트]
${JSON.stringify(contextTools)}

[요구사항]
1. 반드시 한국어로 답변해 주세요.
2. 결과는 반드시 JSON 형식으로만 응답해 주세요. (Markdown 블록 금지)
3. 'message'에는 실시간 트렌드 분석과 사용자 상황 공감 멘트를 적어주세요.
4. 'recommendations' 배열에는 선택한 도구들의 ID(id)와 추천 이유(reason)를 포함해 주세요.
5. 'combinationTip' 필드를 새로 만들어, 도구들을 섞어 쓰는 시너지 조합(A+B)에 대한 구체적인 가이드를 제공해 주세요.
6. 'communityIntro'에는 게시판 이용을 권장해 주세요.

[응답 JSON 구조 예시]
{
  "message": "...",
  "recommendations": [ { "id": "1", "reason": "..." } ],
  "combinationTip": "💡 추천 조합: 'ChatGPT'로 대본을 쓰고 'Vrew'로 영상을 만들면 10분 만에 제작이 가능합니다!",
  "communityIntro": "..."
}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON 추출 정제
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
