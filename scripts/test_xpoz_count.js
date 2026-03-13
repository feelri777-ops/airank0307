const XPOZ_API_KEY = process.env.XPOZ_API_KEY;

async function pollResult(operationId) {
  console.log(`Polling status for ${operationId}...`);
  while (true) {
    const response = await fetch('https://mcp.xpoz.ai/mcp', {
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
          name: 'checkOperationStatus',
          arguments: { operationId }
        }
      })
    });
    const text = await response.text();
    const dataMatch = text.match(/data: ({.*})/);
    if (!dataMatch) {
      console.log('No data in response');
      break;
    }
    const data = JSON.parse(dataMatch[1]);
    
    // Check if there is an error
    if (data.error) {
       console.error('API Error:', data.error.message);
       break;
    }

    const contentText = data.result.content[0].text;
    console.log('Current Status Content:', contentText);

    if (contentText.includes('status: completed') || contentText.includes('status: failed')) {
      console.log('Operation Finished.');
      // Extract mentions if possible. Usually it's in the data section.
      // For countTweets, it might look like "Total posts: 1234"
      const totalMatch = contentText.match(/Total posts: (\d+)/i) || contentText.match(/\"total\": (\d+)/i);
      if (totalMatch) console.log('Final Result - Mentions:', totalMatch[1]);
      break;
    }

    console.log('Still running... waiting 5s');
    await new Promise(r => setTimeout(r, 5000));
  }
}

async function startTest() {
  console.log('Starting countTweets...');
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
        id: 1,
        method: 'tools/call',
        params: {
          name: 'countTweets',
          arguments: {
             phrase: 'ChatGPT',
             startDate: '2025-03-01',
             endDate: '2025-03-12'
          }
        }
      })
    });
    const text = await response.text();
    const dataMatch = text.match(/data: ({.*})/);
    if (dataMatch) {
      const data = JSON.parse(dataMatch[1]);
      const opIdMatch = data.result.content[0].text.match(/operationId: (\S+)/);
      if (opIdMatch) {
        await pollResult(opIdMatch[1]);
      } else {
        console.log('Operation ID not found in response');
      }
    }
  } catch (error) {
    console.error('Start failed:', error.message);
  }
}

startTest();
