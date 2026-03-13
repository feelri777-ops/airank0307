const XPOZ_API_KEY = process.env.XPOZ_API_KEY;

async function findToolSchema() {
  try {
    const response = await fetch('https://mcp.xpoz.ai/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XPOZ_API_KEY}`,
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
        params: {}
      })
    });

    const text = await response.text();
    const dataMatch = text.match(/data: ({.*})/);
    if (dataMatch) {
      const data = JSON.parse(dataMatch[1]);
      const tool = data.result.tools.find(t => t.name === 'checkOperationStatus');
      console.log('checkOperationStatus Schema:', JSON.stringify(tool, null, 2));
    }
  } catch (error) {
    console.error('Failed:', error.message);
  }
}

findToolSchema();
