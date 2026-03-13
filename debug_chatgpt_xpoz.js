
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

// 간단한 환경변수 로딩
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const XPOZ_API_KEY = process.env.XPOZ_API_KEY || "";
const cleanApiKey = XPOZ_API_KEY.trim().replace(/^["']|["']$/g, '');

async function testChatGPT() {
  const keyword = "ChatGPT";
  const todayStr = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = todayStr;

  console.log(`Testing keyword: ${keyword} (${startDateStr} ~ ${endDateStr})`);

  try {
    const requestId = Math.floor(Date.now() / 1000);
    const startRes = await fetch('https://mcp.xpoz.ai/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`,
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: 'countTweets',
          arguments: { phrase: keyword, startDate: startDateStr, endDate: endDateStr }
        }
      })
    });

    const startText = await startRes.text();
    console.log("Start Response Text:", startText);

    let opId = null;
    const lines = startText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonText = line.substring(6).trim();
          const data = JSON.parse(jsonText);
          const content = data.result?.content?.[0]?.text || "";
          console.log("Parsed content:", content);
          const opIdMatch = content.match(/operationId: (\S+)/);
          if (opIdMatch) opId = opIdMatch[1];
        } catch (e) {}
      }
    }

    if (!opId) {
      console.log("Failed to extract operationId");
      return;
    }

    console.log("Operation ID:", opId);
    
    for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 5000));
        console.log(`Checking status attempt ${i+1}...`);
        const checkRes = await fetch('https://mcp.xpoz.ai/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanApiKey}`,
            'Accept': 'application/json, text/event-stream'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Math.floor(Date.now() / 1000),
            method: 'tools/call',
            params: { name: 'checkOperationStatus', arguments: { operationId: opId } }
          })
        });

        const checkText = await checkRes.text();
        console.log("Check Response Text:", checkText);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

testChatGPT();
