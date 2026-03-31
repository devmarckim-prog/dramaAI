const https = require('https');

const data = JSON.stringify({
  model: "claude-3-5-haiku-20241022",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Hello" }
  ]
});

const options = {
  hostname: 'api.anthropic.com',
  port: 443,
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY || "YOUR_API_KEY",
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let responseBody = '';

  res.on('data', d => {
    responseBody += d;
  });
  
  res.on('end', () => {
    console.log(responseBody);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
