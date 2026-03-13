import fs from 'fs';
import path from 'path';

// .env 파일 로드 시도
const envPath = '.env';
let OPR_API_KEY = "";
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/^OPR_API_KEY=(.*)$/m);
    if (match) OPR_API_KEY = match[1].trim();
}

async function testOpr() {
  const domains = ['https://chatgpt.com', 'https://claude.ai'];
  const url = new URL("https://openpagerank.com/api/v1.0/getPageRank");
  
  const hostDomains = domains.map(d => d.replace(/^https?:\/\//, '').split('/')[0]);
  hostDomains.forEach(d => url.searchParams.append("domains[]", d));

  console.log("Requesting URL:", url.toString());
  console.log("API Key length:", OPR_API_KEY.length);
  
  try {
    const response = await fetch(url, {
        headers: { "API-OPR": OPR_API_KEY }
    });
    
    const data = await response.json();
    console.log("Response Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testOpr();
