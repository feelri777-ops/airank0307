#!/usr/bin/env node
/**
 * CSV → scores.json 변환 스크립트
 *
 * 사용법:
 *   node scripts/convert-csv.js
 *   node scripts/convert-csv.js data/other.csv
 *
 * 입력: data/airank2602.csv (탭 구분, 헤더 포함)
 *   컬럼: ID  Service Name  Analysis Domain  Rank  Score
 *
 * 출력: public/scores.json
 *   { updated, source, tools: { "id": { score, change, prevRank } } }
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT   = resolve(__dir, '..');
const INPUT  = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : resolve(ROOT, 'data/airank2602.csv');
const OUTPUT = resolve(ROOT, 'public/scores.json');

const raw   = readFileSync(INPUT, 'utf8');
const lines = raw.split('\n').filter(l => l.trim());

// 컬럼: ID  Service Name  Analysis Domain  Rank  Score
const tools = {};
const seen  = new Set();
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const cols  = lines[i].split('\t');
  if (cols.length < 5) continue;

  const id    = cols[0].trim();
  const name  = cols[1].trim();
  const rank  = parseInt(cols[3].trim());
  const score = parseInt(cols[4].trim());

  if (!id || isNaN(rank) || isNaN(score)) continue;

  if (seen.has(id)) {
    console.log(`  ⚠ 중복 ID:${id.padStart(3)} (${name}) rank:${rank} → 스킵`);
    skipped++;
    continue;
  }
  seen.add(id);

  tools[id] = { score, change: 0, prevRank: null };
}

const output = {
  updated: new Date().toISOString(),
  source:  INPUT.split('/').pop(),
  tools,
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2));

console.log(`\n✅ scores.json 생성 완료`);
console.log(`   입력: ${INPUT.split('/').pop()} | 도구: ${Object.keys(tools).length}개 | 중복 스킵: ${skipped}개`);
console.log(`   출력: ${OUTPUT}`);

// TOP 10 출력
const top10 = Object.entries(tools)
  .sort(([, a], [, b]) => b.score - a.score)
  .slice(0, 10);
console.log('\n── TOP 10 ──');
top10.forEach(([id, v], i) => {
  console.log(`  ${String(i + 1).padStart(2)}위 | id:${id.padStart(3)} | score:${v.score}`);
});
