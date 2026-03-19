import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * AI 컨시어지의 판단 함수: 추가 질문이 필요한지, 아니면 답변이 가능한지 결정
 */
export const getAIConciergeDecision = async (initialPrompt, history, step) => {
  if (!API_KEY) throw new Error("API Key missing");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');

  const prompt = `
당신은 AIRANK.KR의 AI 컨시어지 전문가입니다.
사용자의 니즈를 정확히 파악하여 최적의 도구를 추천하는 것이 목표입니다.

[사용자 최초 질문]
"${initialPrompt}"

[대화 내역]
${historyText}

[현재 질문 횟수]
${step}회 (최대 3회까지 질문 가능)

[판단 규칙]
1. 사용자의 답변이 구체적이어어 즉체 추천이 가능하다면 "COMPLETE" 상태로 판단하세요.
2. 정보가 부족하다면 "ASK" 상태로 판단하고, 다음 질문을 작성하세요.
3. 이미 질문을 3번 넘게 했다면 강제로 "COMPLETE" 상태로 판단하세요.

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요. (마크다운 없이)
{
  "status": "ASK" 또는 "COMPLETE",
  "content": "..."
}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Format error");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      status: parsed.status || "COMPLETE",
      content: parsed.content || "분석을 계속합니다."
    };
  } catch (error) {
    console.error("AI Decision error:", error);
    return { status: "COMPLETE", content: "서버 응답 지연으로 즉시 추천을 진행합니다." };
  }
};

/**
 * 최종 AI 컨시어지 답변 생성 함수
 */
export const getAIConciergeResponse = async (initialPrompt, history, tools) => {
  if (!API_KEY) throw new Error("Gemini API Key missing");

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    tools: [{ google_search: {} }] 
  });

  const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content}`).join('\n');
  const contextTools = tools.map(t => ({
    id: t.id,
    name: t.name,
    desc: t.desc,
    cat: t.cat,
    tags: t.tags
  }));

  const prompt = `
당신은 AIRANK.KR의 전문 'AI 컨시어지'입니다.
심층 문답을 통해 파악한 정보를 바탕으로 최적의 도구 조합 리포트를 작성해 주세요.

[대화 내역]
${historyText}

[추천 가능한 도구 리스트]
${JSON.stringify(contextTools)}

[요구사항]
1. 한국어로 답변, 결과는 JSON 형식으로만 응답
2. 'message': 분석 결과 및 공감 멘트
3. 'recommendations': 도구 ID(id)와 추천 이유(reason)
4. 'combinationTip': 도구 시너지 조합(A+B) 가이드
5. 'communityIntro': 커뮤니티 권장 멘트

{
  "message": "...",
  "recommendations": [ { "id": "1", "reason": "..." } ],
  "combinationTip": "...",
  "communityIntro": "..."
}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      message: parsed.message || "추천 결과를 분석했습니다.",
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      combinationTip: parsed.combinationTip || "",
      communityIntro: parsed.communityIntro || "커뮤니티에서 더 많은 정보를 확인해 보세요!"
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
