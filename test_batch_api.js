require('dotenv').config();
const fetch = require('node-fetch');

async function testBatch() {
  const API_URL = 'http://localhost:3000/api/admin/samples/batch';
  const token = 'mock_token'; // Or get a real one?
  
  // Since I can't easily get a real token in this environment, I'll check the server logs instead.
  console.log('Test manually by checking server status or running a curl command if the server is up');
}
