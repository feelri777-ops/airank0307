const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const cors = require("cors")({origin: true});
const axios = require("axios");

admin.initializeApp();

const db = admin.firestore();

exports.verifyKakaoToken = onRequest(async (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "Missing accessToken" });
    }

    try {
      // 1. 카카오 API로 사용자 정보 확인
      const kakaoResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      const kakaoUser = kakaoResponse.data;
      const kakaoId = `kakao:${kakaoUser.id}`;

      // 2. Firebase Custom Token 생성
      const firebaseToken = await admin.auth().createCustomToken(kakaoId);

      logger.info(`Successfully created custom token for Kakao user: ${kakaoId}`);
      return res.json({ firebaseToken });

    } catch (error) {
      const errorDetail = error.response?.data || error.message;
      logger.error("Error verifying Kakao token:", errorDetail);
      
      return res.status(500).json({ 
        error: "Failed to verify token", 
        detail: errorDetail 
      });
    }
  });
});

// RSS Feed for Community Posts
exports.rss = onRequest(async (req, res) => {
  try {
    // Firestore에서 최신 커뮤니티 게시글 20개 가져오기
    const postsSnapshot = await db.collection("communityPosts")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const posts = [];
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        title: data.title || "제목 없음",
        content: data.content || "",
        authorName: data.authorName || data.displayName || "익명",
        board: data.board || "general",
        createdAt: data.createdAt?.toDate() || new Date(),
        upvoteCount: data.upvoteCount || 0,
        commentCount: data.commentCount || 0,
      });
    });

    // 사이트 정보 (실제 도메인으로 변경 필요)
    const siteUrl = "https://airank0307.web.app"; // 여기에 실제 도메인 입력
    const siteTitle = "AIRANK - AI 이미지 생성 커뮤니티";
    const siteDescription = "AI 이미지 생성 기술을 공유하고 소통하는 커뮤니티";

    // RSS XML 생성
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/community/${post.board}/${post.id}</link>
      <guid isPermaLink="true">${siteUrl}/community/${post.board}/${post.id}</guid>
      <pubDate>${post.createdAt.toUTCString()}</pubDate>
      <author>${escapeXml(post.authorName)}</author>
      <description><![CDATA[${stripHtml(post.content).substring(0, 300)}...]]></description>
      <category>${post.board}</category>
    </item>`).join('')}
  </channel>
</rss>`;

    // RSS XML 응답
    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=600"); // 10분 캐시
    res.send(rssXml);

    logger.info("RSS feed generated successfully");
  } catch (error) {
    logger.error("Error generating RSS feed:", error);
    res.status(500).send("Error generating RSS feed");
  }
});

// XML 특수문자 이스케이프
function escapeXml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// HTML 태그 제거
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
