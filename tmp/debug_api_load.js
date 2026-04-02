try {
  console.log('Attempting to require api routes (absolute)...');
  const path = require('path');
  const apiFile = path.resolve(__dirname, '../api/routes/api.js');
  console.log('Target file:', apiFile);
  const api = require(apiFile);
  console.log('Successfully loaded api routes');
} catch (err) {
  console.error('CRITICAL LOAD ERROR:');
  console.error(err.message);
  console.error(err.stack);
}
