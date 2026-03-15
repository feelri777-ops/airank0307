import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '..', 'data', 'airank2602.csv');
const jsPath = path.join(__dirname, '..', 'src', 'data', 'tools.js');

// 1. Read CSV
const rawCsv = fs.readFileSync(csvPath, 'utf8');
const lines = rawCsv.split('\n');
const header = lines[0];

const csvItems = [];
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const cols = lines[i].split('\t');
  csvItems.push({
    lineIndex: i,
    oldId: cols[0].trim(),
    name: cols[1].trim(),
    domain: cols[2].trim(),
    rank: cols[3].trim(),
    score: cols[4].trim(),
    originalLine: lines[i]
  });
}

// 2. Read JS
let jsContent = fs.readFileSync(jsPath, 'utf8');

// We will reindex starting from 1
let nextId = 1;
const nameToNewId = new Map();

// Helper to normalize name for matching
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

const matchedJs = [];
const unmatchedCsv = [];

// Re-index logic: we iterate through CSV, assign new IDs, and update CSV lines
const newCsvLines = [header];

for (const item of csvItems) {
  const newId = nextId++;
  item.newId = newId;
  nameToNewId.set(normalize(item.name), newId);
  
  // Construct new line with new ID
  const newLine = `${newId}\t${item.name}\t${item.domain}\t${item.rank}\t${item.score}`;
  newCsvLines.push(newLine);
}

fs.writeFileSync(csvPath, newCsvLines.join('\n'), 'utf8');
console.log(`✅ Updated ${csvPath} with IDs 1 to ${nextId - 1}`);

// Now update the JS file
// The JS file has format: id: 1, or id:1, or id: 1
// We can use a regex to replace id but we need to know WHICH tool it is.
// Since we want to map them correctly, it's safer to find the name first.

// We will look for objects in tools.js and replace their id based on the name.
// A regex to match block: { ... id: X, ... name: "Name", ... }
// Let's do it by splitting into blocks or using replace with a function.

let missingInCsvCount = 0;
let updatedJsCount = 0;

jsContent = jsContent.replace(/\{\s*id:\s*\d+,[^}]*?name:\s*["']([^"']+)["']/gi, (match, name) => {
    const normName = normalize(name);
    if (nameToNewId.has(normName)) {
        updatedJsCount++;
        const newId = nameToNewId.get(normName);
        return match.replace(/id:\s*\d+/, `id: ${newId}`);
    } else {
        missingInCsvCount++;
        console.warn(`⚠️ Warning: Tool name "${name}" found in tools.js but NOT in CSV!`);
        return match; // keep original if not found
    }
});

// Second pass: some entries might be like  name: "Name", ... id: 1
jsContent = jsContent.replace(/name:\s*["']([^"']+)["'][^}]*?id:\s*\d+/gi, (match, name) => {
    const normName = normalize(name);
    if (nameToNewId.has(normName)) {
        const newId = nameToNewId.get(normName);
        return match.replace(/id:\s*\d+/, `id: ${newId}`);
    }
    return match;
});


fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log(`✅ Updated ${jsPath}: Matched and updated ${updatedJsCount} items.`);
if (missingInCsvCount > 0) console.log(`   (Found ${missingInCsvCount} tools in JS that were not in CSV)`);

