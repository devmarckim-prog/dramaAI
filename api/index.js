const express = require('express');
const cors = require('cors');

let apiRoutes;
let loadError = null;

try {
  apiRoutes = require('./routes/api');
} catch (err) {
  loadError = err;
  console.error('Failed to load apiRoutes:', err);
}

if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Diagnostic Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    loadError: loadError ? { message: loadError.message, stack: loadError.stack } : null,
    env_keys: {
      has_anthropic: !!process.env.ANTHROPIC_API_KEY,
      node_env: process.env.NODE_ENV
    }
  });
});

if (apiRoutes) {
  app.use('/api', apiRoutes);
} else {
  app.use('/api', (req, res) => {
    res.status(500).json({ 
      error: 'API Routes failed to load', 
      details: loadError ? loadError.message : 'Unknown error' 
    });
  });
}

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
