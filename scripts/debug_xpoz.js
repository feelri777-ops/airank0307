const XPOZ_API_KEY = process.env.XPOZ_API_KEY;

async function debug() {
  const keyword = 'ChatGPT';
  const response = await fetch('https://mcp.xpoz.ai/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XPOZ_API_KEY}`,
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'countTweets',
        arguments: { phrase: keyword, startDate: '2025-03-01', endDate: '2025-03-12' }
      }
    })
  });

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('--- START TEXT ---');
  console.log(text);
  console.log('--- END TEXT ---');
  
  const dataMatch = text.match(/data: ({.*})/);
  console.log('Data Match Found:', !!dataMatch);
  if (dataMatch) {
    console.log('Data Content:', dataMatch[1]);
  }
}

debug();
