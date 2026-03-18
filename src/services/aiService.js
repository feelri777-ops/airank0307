import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const getAIConciergeResponse = async (userPrompt, tools) => {
  if (!API_KEY) {
    throw new Error("Gemini API Key가 설정되지 않았습니다. .env 파일을 확인해 주세요.");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

[사용자 상황]
"${userPrompt}"

[추천 가능한 도구 리스트]
${JSON.stringify(contextTools)}

[요구사항]
1. 반드시 한국어로 답변해 주세요.
2. 결과는 반드시 브라우저에서 JSON.parse()가 가능한 순수 JSON 형식으로만 응답해 주세요. (Markdown 코드 블록 없이 데이터만)
3. 'message'에는 사용자 상황에 대한 공감 섞인 분석 결과를 적어주세요.
4. 'recommendations' 배열에는 선택한 5개 도구의 ID(id)와 추천 이유(reason)를 포함해 주세요.
5. 'communityIntro'에는 자연스럽게 게시판 이용을 권장하는 멘트를 적어주세요.

[응답 JSON 구조 예시]
{
  "message": "사용자님은 ~한 상황이시군요. 이에 딱 맞는 도구들을 찾아보았습니다.",
  "recommendations": [
    { "id": "1", "reason": "~해서 이 도구가 사용자님께 가장 효율적입니다." },
    ...
  ],
  "communityIntro": "다른 작가들의 창작물이 궁금하다면 갤러리 게시판을 확인해 보세요!"
}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSON 추출 (Markdown 코드 블록 등이 포함될 수 있으므로 정제)
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
