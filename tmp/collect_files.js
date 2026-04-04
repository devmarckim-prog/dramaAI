const fs = require('fs');
const path = 'c:\\Users\\happy\\Downloads\\Gravity APP\\디렉터즈 아레나\\js\\modules\\samples.js';
const seedPath = 'c:\\Users\\happy\\Downloads\\Gravity APP\\디렉터즈 아레나\\tmp\\seed_samples.js';

try {
  const samplesContent = fs.readFileSync(path, 'utf8');
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  
  // Save both to a temp file I can read easily
  fs.writeFileSync('C:\\Users\\happy\\Downloads\\Gravity APP\\디렉터즈 아레나\\tmp\\debug_samples_sync.json', JSON.stringify({
    samples: samplesContent,
    seed: seedContent
  }));
  console.log('Saved both files to tmp/debug_samples_sync.json');
} catch (err) {
  console.error(err);
}
