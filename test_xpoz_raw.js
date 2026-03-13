import fs from 'fs';
import path from 'path';

// .env 파일 로드 시도
const envPath = '.env';
let XPOZ_API_KEY = "";
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/^XPOZ_API_KEY=(.*)$/m);
    if (match) XPOZ_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
}

async function testXpoz() {
  const keyword = 'ChatGPT';
  const startDate = '2026-02-27';
  const endDate = '2026-03-13';

  console.log("Requesting XPOZ for:", keyword);
  console.log("API Key length:", XPOZ_API_KEY.length);
  
  try {
    const res = await fetch('https://mcp.xpoz.ai/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XPOZ_API_KEY}`,
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'countTweets',
          arguments: { phrase: keyword, startDate, endDate }
        }
      })
    });
    
    const text = await res.text();
    console.log("Raw Response Text:", text);
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testXpoz();
