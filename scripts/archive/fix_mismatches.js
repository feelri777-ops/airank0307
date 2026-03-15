import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
const jsPath = path.join(__dirname, '..', 'src', 'data', 'tools.js');

// 별칭 맵핑 (JS 이름 -> CSV 이름)
const aliases = {
  "github copilot": "github copilot", // 실제 CSV에 어떻게 있는지 확인 필요
  "perplexity ai": "perplexity",
  "microsoft copilot": "ms copilot",
  "amazon q developer": "amazon q",
  "adobe podcast ai": "adobe podcast",
  "speechify": "speechify tts", // 예시
  "veed.io": "veed",
  "kapwing": "kapwing ai",
  "whisper": "openai whisper",
  "kittl": "kittl ai",
  "cohere": "cohere ai",
  "veed.io ai": "veed.io"
};

const rawCsv = fs.readFileSync(csvPath, 'utf8');
const lines = rawCsv.split('\n');
const nameToId = new Map();

// Helper
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const cols = lines[i].split('\t');
  const id = cols[0].trim();
  const name = cols[1].trim();
  nameToId.set(normalize(name), id);
}

let jsContent = fs.readFileSync(jsPath, 'utf8');

let fixedCount = 0;
jsContent = jsContent.replace(/\{\s*id:\s*\d+,[^}]*?name:\s*["']([^"']+)["']/gi, (match, name) => {
    let normName = normalize(name);
    
    // 별칭 확인
    const lowerName = name.toLowerCase();
    if (aliases[lowerName]) {
        normName = normalize(aliases[lowerName]);
    } else {
        // 이름에 AI가 붙은 경우 떼고도 검색
        if (normName.endsWith('ai')) {
             const withoutAi = normName.slice(0, -2);
             if (nameToId.has(withoutAi)) {
                 normName = withoutAi;
             }
        }
    }

    if (nameToId.has(normName)) {
        const newId = nameToId.get(normName);
        // 이미 새 ID와 같으면 패스하지만, 다르면 갱신
        const currentIdMatch = match.match(/id:\s*(\d+)/);
        if (currentIdMatch && currentIdMatch[1] !== newId) {
            fixedCount++;
            return match.replace(/id:\s*\d+/, `id: ${newId}`);
        }
    } else {
        // 완전 매칭 실패 시 부분 매칭 시도
        for (const [csvNorm, csvId] of nameToId.entries()) {
            if (csvNorm.includes(normName) || normName.includes(csvNorm)) {
                 const currentIdMatch = match.match(/id:\s*(\d+)/);
                 if (currentIdMatch && currentIdMatch[1] !== csvId) {
                     fixedCount++;
                     return match.replace(/id:\s*\d+/, `id: ${csvId}`);
                 }
            }
        }
        console.warn(`여전히 매칭 실패: ${name}`);
    }
    return match;
});

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log(`✅ 추가 매칭을 통해 ${fixedCount}개 도구의 ID를 수정했습니다.`);
