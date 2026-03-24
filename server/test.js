const http = require('http');

const req = http.request('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Login Response:', data));
});

req.on('error', console.error);
req.write(JSON.stringify({ email: 'test@example.com', password: 'pw' }));
req.end();
