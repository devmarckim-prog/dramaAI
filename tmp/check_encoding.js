const fs = require('fs');
const path = 'c:\\Users\\happy\\Downloads\\Gravity APP\\디렉터즈 아레나\\js\\modules\\samples.js';

try {
  const content = fs.readFileSync(path);
  console.log('File size:', content.length);
  console.log('First 100 bytes (hex):', content.slice(0, 100).toString('hex'));
  const utf8Text = content.toString('utf8');
  console.log('First 500 chars (utf8):', utf8Text.slice(0, 500));
} catch (err) {
  console.error(err);
}
