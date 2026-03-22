import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const rawData = fs.readFileSync('src/data/tools.js', 'utf8');

// 정규식으로 TOOLS_DATA 문자열 덩어리를 추출하고 안전하게 eval (또는 정규식으로 추출) 한 뒤 처리하지 말고
// 차라리 Firestore 스크립트를 작성하여 GitHub Actions로 돌리는 게 낫습니다.
