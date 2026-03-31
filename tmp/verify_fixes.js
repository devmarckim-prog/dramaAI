const http = require('http');

async function testDeletion() {
  console.log('\n--- Testing Project Deletion Endpoints ---');
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8081,
      path: '/api/projects/999999', // Non-existent numeric ID
      method: 'DELETE',
      headers: {
        'x-guest-fingerprint': 'test-fingerprint-123'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve();
      });
    });
    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve();
    });
    req.end();
  });
}

async function testGenerationMapping() {
  console.log('\n--- Testing AI Model Mapping (Claude 4.6 Sonnet) ---');
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      type: 'script',
      content: {
        userPrompt: 'Hello',
        maxTokens: 10
      }
    });

    const options = {
      hostname: 'localhost',
      port: 8081,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-guest-fingerprint': 'test-fingerprint-123'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        // We don't necessarily need a successful AI call (might fail due to credits/API key)
        // But we want to check the server logs for the mapping message.
        console.log(`Response Snippet: ${data.substring(0, 100)}`);
        resolve();
      });
    });
    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve();
    });
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  await testDeletion();
  await testGenerationMapping();
  console.log('\nTests completed. Check api/server.log for detailed mapping and deletion logs.');
}

runTests();
