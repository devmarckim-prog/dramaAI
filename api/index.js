const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const logFile = path.resolve(__dirname, 'server.log');
const log = (msg) => {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    // Only attempt to write if we are not in a known restricted environment
    if (process.env.NODE_ENV !== 'production') {
      fs.appendFileSync(logFile, entry);
    }
  } catch (e) {
    // Ignore FS errors in serverless/read-only environments
  }
  console.log(msg);
};

log('SERVER STARTING...');
// Admin Routes Updated - Column fix

let apiRoutes;
let adminRoutes;
let loadError = null;

try {
  log(`[System] Loading API routes from ${path.join(__dirname, 'routes/api.js')}`);
  apiRoutes = require('./routes/api');
  log(`[System] Loading Admin routes from ${path.join(__dirname, 'routes/admin.js')}`);
  adminRoutes = require('./routes/admin');
  log('[System] All modules loaded successfully.');
} catch (err) {
  loadError = err;
  log(`CRITICAL MODULE LOAD ERROR: ${err.message}`, 'error');
  console.error(err.stack);
}

// 2. Environment (Load after logging helper)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Global Request Logger with Header Debugging
app.use((req, res, next) => {
  const guestHeader = req.headers['x-guest-fingerprint'];
  const authHeader = req.headers['authorization'];
  log(`[REQUEST] ${req.method} ${req.url} | Auth: ${authHeader ? 'YES' : 'NO'} | Guest: ${guestHeader ? 'YES' : 'NO'}`);
  if (guestHeader) log(`[DEBUG] Guest ID: ${guestHeader}`);
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Permissive CSP for Development UI (Allows inline styles/scripts used by the app)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: gap: content:; style-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval'; img-src * data: blob:; font-src * data:; frame-src *; connect-src *;"
  );
  next();
});

// Diagnostic Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    routers: {
      admin: !!adminRoutes,
      user: !!apiRoutes,
      admin: !!adminRoutes
    },
    loadError: loadError ? loadError.message : null
  });
});

if (apiRoutes) {
  log('[Mount] User API Routes -> /api');
  app.use('/api', apiRoutes);
}

if (adminRoutes) {
  log('[Mount] Admin API Routes -> /api/admin');
  app.use('/api/admin', adminRoutes);
}
if (!apiRoutes) {
  app.use('/api', (req, res) => {
    res.status(500).json({ 
      error: 'API Routes failed to load', 
      details: loadError ? loadError.message : 'Unknown error' 
    });
  });
}

// Static files (must be after API routes to avoid matching /api paths)
app.use(express.static(path.join(__dirname, '..')));

// SPA Fallback: Serve index.html for any other GET route
app.get('/*', (req, res) => {
  const isApiRequest = req.path.startsWith('/api');
  if (isApiRequest) {
    log(`[API 404 Error] Unhandled API request : ${req.method} ${req.path}`);
    return res.status(404).json({ error: 'API route not found', path: req.path });
  }

  const indexPath = path.resolve(__dirname, '..', 'index.html');
  const isDocRequest = req.path === '/admin' || req.path === '/admin/';
  
  if (isDocRequest) {
    log(`[Route Admin] Redirecting to SPA: ${req.path}`);
  } else {
    log(`[SPA Fallback] Serving index.html for unknown path: ${req.path}`);
  }

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    log(`[SPA Fallback CRITICAL] index.html missing at: ${indexPath}`);
    res.status(500).send('Application critical error: index.html not found');
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  log(`[CRITICAL ERROR] ${err.message}`);
  log(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    details: err.message,
    stack: err.stack 
  });
});

module.exports = app;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[DramaScript AI] Server v2.0.1 (Stable) running on http://localhost:${PORT}`);
  });
  server.timeout = 300000; // 5 minutes
}
