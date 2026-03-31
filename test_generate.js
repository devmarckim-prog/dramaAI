const http = require('http');

const postData = JSON.stringify({
  type: 'core',
  content: {
    systemPrompt: "You are an expert drama writer.",
    userPrompt: "Write a short logline for a sci-fi drama.",
    maxTokens: 50
  }
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('RESPONSE:', data);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
