const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");
const logger = require("firebase-functions/logger");

// Firebase Admin 초기화
admin.initializeApp();

// 네이버 사용자 정보 조회
async function getNaverUserInfo(accessToken) {
  logger.info("Requesting user profile from Naver API");

  const response = await axios.get("https://openapi.naver.com/v1/nid/me", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

// Firebase 사용자 생성 또는 업데이트
async function updateOrCreateUser(userId, email, displayName, photoURL) {
  logger.info("Updating or creating Firebase user:", userId);

  const updateParams = {
    displayName: displayName || email || "네이버 사용자",
  };

  if (photoURL) {
    updateParams.photoURL = photoURL;
  }

  try {
    // 기존 사용자 업데이트 시도
    return await admin.auth().updateUser(userId, updateParams);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      // 사용자가 없으면 새로 생성
      const createParams = {
        uid: userId,
        ...updateParams,
      };
      if (email) {
        createParams.email = email;
      }
      return await admin.auth().createUser(createParams);
    }
    throw error;
  }
}

// 네이버 커스텀 인증
exports.naverAuth = onRequest({
  cors: true, // CORS 허용
}, async (req, res) => {
  try {
    // POST 요청에서 accessToken 받기
    const {token} = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Access token is required",
      });
    }

    logger.info("Processing Naver authentication");

    // 1. 네이버 사용자 정보 조회
    const naverData = await getNaverUserInfo(token);

    if (!naverData.response || !naverData.response.id) {
      return res.status(401).json({
        error: "Invalid Naver access token",
      });
    }

    const naverUser = naverData.response;
    const userId = `naver:${naverUser.id}`;
    const email = naverUser.email;
    const displayName = naverUser.name || naverUser.nickname;
    const photoURL = naverUser.profile_image;

    // 2. Firebase 사용자 생성/업데이트
    await updateOrCreateUser(userId, email, displayName, photoURL);

    // 3. Firebase Custom Token 생성
    const customToken = await admin.auth().createCustomToken(userId, {
      provider: "NAVER",
      email: email,
      name: displayName,
    });

    logger.info("Successfully created custom token for user:", userId);

    // 4. 토큰 반환
    return res.status(200).json({
      token: customToken,
      user: {
        uid: userId,
        email: email,
        displayName: displayName,
        photoURL: photoURL,
      },
    });
  } catch (error) {
    logger.error("Error in Naver authentication:", error);
    return res.status(500).json({
      error: "Authentication failed",
      message: error.message,
    });
  }
});
