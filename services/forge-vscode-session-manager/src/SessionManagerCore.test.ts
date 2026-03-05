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
    expect(expiredEvents.some((event) => event.type === 'session_container_stop_requested' && event.sessionId === session.id)).toBe(true);
    expect(manager.getSession(session.id)?.status).toBe('expired');
    expect(manager.getSession(session.id)?.containerStatus).toBe('stop_requested');
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

  it('resumes existing active session for same user and game', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-session-manager-'));
    const manager = new SessionManagerCore({
      dataRoot: tempRoot,
      maxSessions: 4,
      sessionTtlMs: 30_000,
      warningLeadMs: 5_000,
    });

    const created = manager.createSession('resume-user', 'kotor', 1000);
    const resumed = manager.createOrResumeSession('resume-user', 'kotor', 1500);
    expect(resumed.id).toBe(created.id);
    expect(resumed.lastHeartbeatAt).toBe(1500);
  });

  it('queues container lifecycle events and supports container acknowledgements', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-session-manager-'));
    const manager = new SessionManagerCore({
      dataRoot: tempRoot,
      maxSessions: 2,
      sessionTtlMs: 20_000,
      warningLeadMs: 2_000,
    });

    const session = manager.createSession('user-container', 'kotor', 1000);
    const createdEvents = manager.drainEvents();
    expect(createdEvents.some((event) => event.type === 'session_container_start_requested' && event.sessionId === session.id)).toBe(true);
    expect(manager.getSession(session.id)?.containerStatus).toBe('start_requested');

    manager.markContainerReady(session.id, session.token, 'container-123', { now: 1200, upstreamUrl: 'http://127.0.0.1:19999' });
    expect(manager.getSession(session.id)?.containerStatus).toBe('ready');
    expect(manager.getSession(session.id)?.containerId).toBe('container-123');
    expect(manager.getSession(session.id)?.containerUpstreamUrl).toBe('http://127.0.0.1:19999');

    manager.closeSession(session.id, session.token, 1500);
    const closeEvents = manager.drainEvents();
    expect(closeEvents.some((event) => event.type === 'session_container_stop_requested' && event.sessionId === session.id)).toBe(true);
    expect(manager.getSession(session.id)?.containerStatus).toBe('stop_requested');

    manager.markContainerStopped(session.id, session.token, 1700);
    expect(manager.getSession(session.id)?.containerStatus).toBe('stopped');
  });

  it('marks container failure reason for orchestration errors', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-session-manager-'));
    const manager = new SessionManagerCore({
      dataRoot: tempRoot,
      maxSessions: 2,
      sessionTtlMs: 20_000,
      warningLeadMs: 2_000,
    });

    const session = manager.createSession('user-failed', 'kotor', 1000);
    manager.markContainerFailed(session.id, session.token, 'docker run failed: image not found', 1100);
    expect(manager.getSession(session.id)?.containerStatus).toBe('failed');
    expect(manager.getSession(session.id)?.containerError).toContain('image not found');
  });
});
