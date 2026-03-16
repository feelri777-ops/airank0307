const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const cors = require("cors")({origin: true});

// Firebase Admin 초기화
admin.initializeApp();

// 현재는 다른 기능이 없으므로 빈 파일로 두거나 기본 틀만 유지합니다.
// 향후 필요한 기능이 있으면 여기에 추가합니다.
