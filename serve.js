const app = require('./api/index');
const port = 8081;

const server = app.listen(port, () => {
    console.log(`
DramaScript AI Unified Server Running!
--------------------------------------
Frontend: http://localhost:${port}/
API Root: http://localhost:${port}/api
--------------------------------------
`);
});

server.timeout = 300000; // 5 minutes

// Persistence & Error Management
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  // Keep the server alive instead of crashing the whole process
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
  // Keep the server alive
});

process.on('SIGINT', () => {
  console.log('[Server] Terminating gracefully...');
  server.close(() => process.exit(0));
});
