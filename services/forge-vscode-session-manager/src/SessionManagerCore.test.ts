import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SessionManagerCore } from './SessionManagerCore';

describe('SessionManagerCore', () => {
  it('requests save at expiry and expires only after save confirmation', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-session-manager-'));
    const manager = new SessionManagerCore({
      dataRoot: tempRoot,
      maxSessions: 2,
      sessionTtlMs: 1000,
      warningLeadMs: 200,
    });

    const start = 10_000;
    const session = manager.createSession('user-1', 'kotor', start);

    const warningEvents = manager.evaluateTimeouts(start + 900);
    expect(warningEvents.some((event) => event.type === 'session_warning' && event.sessionId === session.id)).toBe(true);
    expect(manager.getSession(session.id)?.status).toBe('warning');

    const saveRequestEvents = manager.evaluateTimeouts(start + 1_050);
    expect(saveRequestEvents.some((event) => event.type === 'session_save_requested' && event.sessionId === session.id)).toBe(true);
    expect(manager.getSession(session.id)?.status).toBe('saving');

    // should not expire before explicit save-complete acknowledgement
    const stillSavingEvents = manager.evaluateTimeouts(start + 1_150);
    expect(stillSavingEvents.some((event) => event.type === 'session_expired')).toBe(false);
    expect(manager.getSession(session.id)?.status).toBe('saving');

    manager.markSaveCompleted(session.id, session.token, start + 1_200);
    const expiredEvents = manager.evaluateTimeouts(start + 1_250);
    expect(expiredEvents.some((event) => event.type === 'session_expired' && event.sessionId === session.id)).toBe(true);
    expect(manager.getSession(session.id)?.status).toBe('expired');
  });

  it('enforces max session capacity', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-session-manager-'));
    const manager = new SessionManagerCore({
      dataRoot: tempRoot,
      maxSessions: 1,
      sessionTtlMs: 10_000,
      warningLeadMs: 2_000,
    });

    manager.createSession('user-1', 'kotor', 1);
    expect(() => manager.createSession('user-2', 'tsl', 2)).toThrow('Session capacity reached');
  });

  it('requires matching session token for mutating actions', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-session-manager-'));
    const manager = new SessionManagerCore({
      dataRoot: tempRoot,
      maxSessions: 2,
      sessionTtlMs: 10_000,
      warningLeadMs: 2_000,
    });

    const session = manager.createSession('user-1', 'kotor', 100);
    expect(() => manager.heartbeat(session.id, 'bad-token', 200)).toThrow('Unauthorized session token');
    expect(() => manager.closeSession(session.id, 'bad-token', 300)).toThrow('Unauthorized session token');

    expect(manager.heartbeat(session.id, session.token, 200).lastHeartbeatAt).toBe(200);
  });
});
