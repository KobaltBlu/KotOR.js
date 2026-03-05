const sessionBaseUrl = process.env.FORGE_SESSION_MANAGER_BASE_URL || 'http://127.0.0.1:8090';
const openVsCodeUrl = process.env.OPENVSCODE_BASE_URL || 'http://127.0.0.1:18080';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) {
    headers['content-type'] = 'application/json';
  }
  if (token) {
    headers['x-session-token'] = token;
  }
  const response = await fetch(`${sessionBaseUrl}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForOpenVsCode() {
  const response = await fetch(openVsCodeUrl);
  assert(response.ok, `OpenVSCode should respond at ${openVsCodeUrl}`);
}

async function main() {
  console.log(`[e2e] checking OpenVSCode at ${openVsCodeUrl}`);
  await waitForOpenVsCode();

  console.log(`[e2e] checking session manager health at ${sessionBaseUrl}`);
  const health = await requestJson('/healthz');
  assert(health.ok === true, 'healthz response should be ok=true');

  console.log('[e2e] creating session');
  const session = await requestJson('/api/sessions', {
    method: 'POST',
    body: { userId: 'ci-user', game: 'kotor' },
  });
  const sessionId = session.id;
  const sessionToken = session.token;
  assert(typeof sessionId === 'string' && sessionId.length > 0, 'session id should be returned');
  assert(typeof sessionToken === 'string' && sessionToken.length > 0, 'session token should be returned');

  await requestJson(`/api/sessions/${sessionId}/heartbeat`, { method: 'POST', token: sessionToken });

  // warning window
  await sleep(1300);
  const warningEval = await requestJson('/api/timeouts/evaluate', { method: 'POST' });
  assert(
    Array.isArray(warningEval.events) && warningEval.events.some((event) => event.type === 'session_warning' && event.sessionId === sessionId),
    'warning event should be emitted before expiry'
  );

  // save request at/after expiry
  await sleep(1100);
  const saveEval = await requestJson('/api/timeouts/evaluate', { method: 'POST' });
  assert(
    Array.isArray(saveEval.events) && saveEval.events.some((event) => event.type === 'session_save_requested' && event.sessionId === sessionId),
    'save request event should be emitted at expiry'
  );

  const sessionAfterSaveRequest = await requestJson(`/api/sessions/${sessionId}`, { token: sessionToken });
  assert(sessionAfterSaveRequest.status === 'saving', 'session should remain in saving state before save-complete');

  await requestJson(`/api/sessions/${sessionId}/save-complete`, { method: 'POST', token: sessionToken });
  const expiredEval = await requestJson('/api/timeouts/evaluate', { method: 'POST' });
  assert(
    Array.isArray(expiredEval.events) && expiredEval.events.some((event) => event.type === 'session_expired' && event.sessionId === sessionId),
    'session should expire only after save-complete'
  );

  const finalSession = await requestJson(`/api/sessions/${sessionId}`, { token: sessionToken });
  assert(finalSession.status === 'expired', 'session status should be expired at end of lifecycle');

  console.log('[e2e] session manager lifecycle checks passed');
}

main().catch((error) => {
  console.error('[e2e] failed', error);
  process.exit(1);
});
