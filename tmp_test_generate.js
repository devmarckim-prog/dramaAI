
async function testGeneration() {
  const proxyHost = 'http://localhost:8081';

  console.log(`[Test] 1. Creating a new guest project...`);
  const createResp = await fetch(`${proxyHost}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-fingerprint': 'test-guest-123' },
    body: JSON.stringify({ title: 'Test Drama', logline: 'A mysterious event unfolds.' })
  });
  if (!createResp.ok) {
     console.error('Failed to create project', await createResp.text());
     return;
  }
  const createResult = await createResp.json();
  const projectId = createResult.project.id;
  console.log(`[Test] Project Created: ${projectId}`);
  
  console.log(`[Test] 2. Starting Generation...`);
  const startResp = await fetch(`${proxyHost}/api/generate/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-guest-fingerprint': 'test-guest-123' },
    body: JSON.stringify({ projectId, input: { genre: 'Thriller', logline: 'A mysterious event unfolds.' } })
  });
  if (!startResp.ok) {
     console.error('Failed to start generation', await startResp.text());
     return;
  }
  console.log(`[Test] Generate Start Response:`, await startResp.json());
  
  console.log(`[Test] 3. Polling status for 30 seconds...`);
  let attempts = 0;
  while (attempts < 15) {
     await new Promise(r => setTimeout(r, 2000));
     const checkResp = await fetch(`${proxyHost}/api/projects?id=${projectId}`, {
        headers: { 'x-guest-fingerprint': 'test-guest-123' }
     });
     const checkData = await checkResp.json();
     if (checkData.data && checkData.data.length > 0) {
        const proj = checkData.data[0];
        console.log(`[Polling ${attempts+1}] Status: ${proj.status}, Pct: ${proj.pct}% (Step: ${proj.stepIdx})`);
        if (proj.status === 'done') {
            console.log('[Test] Final Data:', Object.keys(proj));
            break;
        } else if (proj.status === 'error') {
            console.error('[Test] Ended in error!', proj.error_msg);
            break;
        }
     }
     attempts++;
  }
}

testGeneration();
