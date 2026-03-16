const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const cors = require("cors")({origin: true});
const axios = require("axios");

admin.initializeApp();

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
