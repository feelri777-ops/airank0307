import fs from 'fs';
import path from 'path';

// 파일 경로 설정
const DOMEIN_CSV = 'domein260313.csv';
const TOOLS_JS = 'src/data/tools.js';
const AIRANK_CSV = 'data/airank2602.csv';

function updateData() {
    console.log('--- 도메인 데이터 일괄 업데이트 시작 ---');

    // 1. domein260313.csv 읽기 및 파싱
    if (!fs.existsSync(DOMEIN_CSV)) {
        console.error('domein260313.csv 파일이 없습니다.');
        return;
    }
    const domeinRaw = fs.readFileSync(DOMEIN_CSV, 'utf8');
    const domeinLines = domeinRaw.split('\n').filter(l => l.trim());
    
    // { name: newUrl } 맵 생성 (이름 기준 매칭)
    const urlMap = {};
    domeinLines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 4) {
            const name = parts[1].trim();
            const newUrl = parts[3].trim();
            urlMap[name] = newUrl;
        }
    });

    console.log(`CSV에서 ${Object.keys(urlMap).length}개의 업데이트 정보를 읽었습니다.`);

    // 2. src/data/tools.js 업데이트
    if (fs.existsSync(TOOLS_JS)) {
        let toolsContent = fs.readFileSync(TOOLS_JS, 'utf8');
        let updatedCount = 0;
        
        for (const [name, newUrl] of Object.entries(urlMap)) {
            // name: "ChatGPT", ... url: "..." 형태를 찾아서 교체
            // 정규식 설명: name: "[이름]" 으로 시작하는 객체 내부의 url: "[값]" 을 새 URL로 교체
            // 주의: 완벽한 파이싱은 아니므로 간단한 문자열 치환 로직 사용
            
            // 특정 이름의 도구를 찾기 위해 텍스트 스캔
            const nameEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(`name:\\s*["']${nameEscaped}["'].*?url:\\s*["']([^"']+)["']`, 's');
            
            if (searchRegex.test(toolsContent)) {
                toolsContent = toolsContent.replace(searchRegex, (match, oldUrl) => {
                    return match.replace(`url: "${oldUrl}"`, `url: "${newUrl}"`)
                                .replace(`url: '${oldUrl}'`, `url: "${newUrl}"`);
                });
                updatedCount++;
            }
        }
        
        fs.writeFileSync(TOOLS_JS, toolsContent, 'utf8');
        console.log(`tools.js 완료: ${updatedCount}개 도구의 URL이 업데이트되었습니다.`);
    }

    // 3. data/airank2602.csv 업데이트 (탭 구분 형식)
    if (fs.existsSync(AIRANK_CSV)) {
        const airankRaw = fs.readFileSync(AIRANK_CSV, 'utf8');
        const lines = airankRaw.split('\n');
        const header = lines[0];
        const newLines = [header];
        let updatedCsvCount = 0;

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split('\t');
            if (cols.length < 3) {
                newLines.push(lines[i]);
                continue;
            }

            const name = cols[1].trim();
            const oldDomain = cols[2].trim();

            if (urlMap[name]) {
                // URL에서 도메인 부분만 추출 (https:// 제거 등)
                let cleanDomain = urlMap[name].replace(/^https?:\/\//, '').replace(/\/$/, '');
                cols[2] = cleanDomain;
                newLines.push(cols.join('\t'));
                updatedCsvCount++;
            } else {
                newLines.push(lines[i]);
            }
        }

        fs.writeFileSync(AIRANK_CSV, newLines.join('\n'), 'utf8');
        console.log(`airank2602.csv 완료: ${updatedCsvCount}행의 도메인이 업데이트되었습니다.`);
    }

    console.log('--- 업데이트 작업 완료 ---');
}

updateData();
