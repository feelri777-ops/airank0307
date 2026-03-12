import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
const jsPath = path.join(__dirname, '..', 'src', 'data', 'tools.js');

// 1. Read CSV and create mapping by Domain
const rawCsv = fs.readFileSync(csvPath, 'utf8');
const lines = rawCsv.split('\n');

const domainToId = new Map();
const nameToId = new Map(); // Fallback

// Extract domain helper
const cleanDomain = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    }
};

const normalizeName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const cols = lines[i].split('\t');
  const id = cols[0].trim();
  const name = cols[1].trim();
  const domain = cleanDomain(cols[2].trim());
  
  domainToId.set(domain, id);
  nameToId.set(normalizeName(name), id);
}

// 2. Read JS
let jsContent = fs.readFileSync(jsPath, 'utf8');

// Match block: { id: ..., name: "...", url: "..." }
let fixedCount = 0;

jsContent = jsContent.replace(/\{\s*id:\s*(\d+),([^}]*?)name:\s*["']([^"']+)["']([^}]*?)url:\s*["']([^"']+)["']/gi, (match, currentId, part1, name, part2, url) => {
    const jsDomain = cleanDomain(url);
    const normName = normalizeName(name);
    
    let targetId = null;

    if (domainToId.has(jsDomain)) {
        targetId = domainToId.get(jsDomain);
    } else if (nameToId.has(normName)) {
        targetId = nameToId.get(normName);
    } else {
        // Fallbacks for known mismatches if domain fails
        if (normName === 'amazonqdeveloper' && domainToId.has('aws.amazon.com')) targetId = domainToId.get('aws.amazon.com');
        if (normName === 'githubcopilot' && domainToId.has('github.com')) targetId = domainToId.get('github.com');
    }

    if (targetId && currentId !== targetId) {
        fixedCount++;
        return match.replace(/id:\s*\d+/, `id: ${targetId}`);
    }
    return match;
});

// Some JS entries might have url before name
jsContent = jsContent.replace(/\{\s*id:\s*(\d+),([^}]*?)url:\s*["']([^"']+)["']([^}]*?)name:\s*["']([^"']+)["']/gi, (match, currentId, part1, url, part2, name) => {
    const jsDomain = cleanDomain(url);
    const normName = normalizeName(name);
    let targetId = null;

    if (domainToId.has(jsDomain)) targetId = domainToId.get(jsDomain);
    else if (nameToId.has(normName)) targetId = nameToId.get(normName);

    if (targetId && currentId !== targetId) {
        fixedCount++;
        return match.replace(/id:\s*\d+/, `id: ${targetId}`);
    }
    return match;
});

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log(`✅ URL(도메인) 기반 매칭을 통해 ${fixedCount}개 도구의 ID를 완벽하게 재정렬 및 수정했습니다.`);
