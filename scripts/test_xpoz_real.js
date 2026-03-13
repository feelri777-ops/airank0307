const XPOZ_API_KEY = process.env.XPOZ_API_KEY;

async function testXpoz() {
  if (!XPOZ_API_KEY) {
    console.error('XPOZ_API_KEY missing in environment. Use --env-file=.env');
    return;
  }

  console.log('Connecting to XPOZ MCP Server (SSE Transport)...');
  
  try {
    console.log('--- Step 1: Listing Tools (POST tools/list) ---');
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
        method: 'tools/list',
        params: {}
      })
    });

    const text = await response.text();
    console.log('Raw Response Content:', text);
    
    // Parse SSE data
    const dataMatch = text.match(/data: ({.*})/);
    if (dataMatch) {
      const data = JSON.parse(dataMatch[1]);
      console.log('Parsed Tools:', JSON.stringify(data, null, 2));
      
      // If we found tools, try calling one if it looks relevant
      if (data.result && data.result.tools) {
        const hasCountTweets = data.result.tools.some(t => t.name === 'countTweets');
        if (hasCountTweets) {
          console.log('\n--- Step 2: Testing countTweets Tool ---');
          const callResponse = await fetch('https://mcp.xpoz.ai/mcp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${XPOZ_API_KEY}`,
              'Accept': 'application/json, text/event-stream'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'countTweets',
                arguments: {
                   query: 'ChatGPT',
                   start_date: '2025-03-01',
                   end_date: '2025-03-12'
                }
              }
            })
          });
          const callText = await callResponse.text();
          console.log('Call Result:', callText);
        }
      }
    }

  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testXpoz();
