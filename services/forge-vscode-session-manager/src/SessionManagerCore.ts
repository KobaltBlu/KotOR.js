import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export type SessionStatus = 'active' | 'warning' | 'saving' | 'expired' | 'closed';

export interface ForgeSession {
  id: string;
  token: string;
  userId: string;
  game: 'kotor' | 'tsl';
  createdAt: number;
  lastHeartbeatAt: number;
  warningAt: number;
  expiresAt: number;
  workspacePath: string;
  status: SessionStatus;
  warningSentAt?: number;
  saveRequestedAt?: number;
  saveCompletedAt?: number;
}

export type SessionEventType =
  | 'session_created'
  | 'session_warning'
  | 'session_save_requested'
  | 'session_expired'
  | 'session_closed';

export interface SessionEvent {
  type: SessionEventType;
  at: number;
  sessionId: string;
  payload?: Record<string, unknown>;
}

export interface SessionManagerOptions {
  dataRoot: string;
  maxSessions: number;
  sessionTtlMs: number;
  warningLeadMs: number;
}

export class SessionManagerCore {
  private readonly sessions = new Map<string, ForgeSession>();
  private readonly events: SessionEvent[] = [];
  private readonly dataRoot: string;
  private readonly maxSessions: number;
  private readonly sessionTtlMs: number;
  private readonly warningLeadMs: number;

  constructor(options: SessionManagerOptions) {
    this.dataRoot = options.dataRoot;
    this.maxSessions = options.maxSessions;
    this.sessionTtlMs = options.sessionTtlMs;
    this.warningLeadMs = options.warningLeadMs;

    fs.mkdirSync(this.getWorkspacesRoot(), { recursive: true });
    fs.mkdirSync(this.getMetadataRoot(), { recursive: true });
  }

  listSessions(): ForgeSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(sessionId: string): ForgeSession | undefined {
    return this.sessions.get(sessionId);
  }

  createSession(userId: string, game: 'kotor' | 'tsl' = 'kotor', now = Date.now()): ForgeSession {
    const activeCount = this.listSessions().filter((s) => s.status !== 'expired' && s.status !== 'closed').length;
    if (activeCount >= this.maxSessions) {
      throw new Error('Session capacity reached');
    }

    const id = randomUUID();
    const workspacePath = path.join(this.getWorkspacesRoot(), id);
    fs.mkdirSync(workspacePath, { recursive: true });

    const session: ForgeSession = {
      id,
      token: randomUUID().replace(/-/g, ''),
      userId,
      game,
      createdAt: now,
      lastHeartbeatAt: now,
      warningAt: now + Math.max(0, this.sessionTtlMs - this.warningLeadMs),
      expiresAt: now + this.sessionTtlMs,
      workspacePath,
      status: 'active',
    };

    this.sessions.set(id, session);
    this.appendEvent({ type: 'session_created', at: now, sessionId: id, payload: { userId, game } });
    this.persistSession(session);
    return session;
  }

  heartbeat(sessionId: string, token: string, now = Date.now()): ForgeSession {
    const session = this.requireAuthorizedSession(sessionId, token);
    session.lastHeartbeatAt = now;
    this.persistSession(session);
    return session;
  }

  markSaveCompleted(sessionId: string, token: string, now = Date.now()): ForgeSession {
    const session = this.requireAuthorizedSession(sessionId, token);
    session.saveCompletedAt = now;
    if (session.status === 'saving') {
      session.status = 'warning';
    }
    this.persistSession(session);
    return session;
  }

  closeSession(sessionId: string, token: string, now = Date.now()): ForgeSession {
    const session = this.requireAuthorizedSession(sessionId, token);
    session.status = 'closed';
    this.appendEvent({ type: 'session_closed', at: now, sessionId });
    this.persistSession(session);
    return session;
  }

  getAuthorizedSession(sessionId: string, token: string): ForgeSession {
    return this.requireAuthorizedSession(sessionId, token);
  }

  /**
   * Evaluate timeout lifecycle with hard persistence semantics:
   * - warn before expiry,
   * - request save at expiry,
   * - expire only after save completion was confirmed.
   */
  evaluateTimeouts(now = Date.now()): SessionEvent[] {
    for (const session of this.sessions.values()) {
      if (session.status === 'expired' || session.status === 'closed') {
        continue;
      }

      if (!session.warningSentAt && now >= session.warningAt) {
        session.warningSentAt = now;
        session.status = 'warning';
        this.appendEvent({
          type: 'session_warning',
          at: now,
          sessionId: session.id,
          payload: { expiresAt: session.expiresAt },
        });
      }

      if (now < session.expiresAt) {
        this.persistSession(session);
        continue;
      }

      if (!session.saveRequestedAt) {
        session.saveRequestedAt = now;
        session.status = 'saving';
        this.appendEvent({
          type: 'session_save_requested',
          at: now,
          sessionId: session.id,
          payload: { reason: 'ttl_elapsed' },
        });
      }

      if (session.saveCompletedAt && session.saveCompletedAt >= session.saveRequestedAt) {
        session.status = 'expired';
        this.appendEvent({ type: 'session_expired', at: now, sessionId: session.id });
      }

      this.persistSession(session);
    }

    return this.drainEvents();
  }

  drainEvents(): SessionEvent[] {
    if (!this.events.length) return [];
    const copy = this.events.slice();
    this.events.length = 0;
    return copy;
  }

  private appendEvent(event: SessionEvent): void {
    this.events.push(event);
  }

  private requireSession(sessionId: string): ForgeSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  private requireAuthorizedSession(sessionId: string, token: string): ForgeSession {
    const session = this.requireSession(sessionId);
    if (!token || token !== session.token) {
      throw new Error(`Unauthorized session token for session ${sessionId}`);
    }
    return session;
  }

  private persistSession(session: ForgeSession): void {
    const metadataPath = path.join(this.getMetadataRoot(), `${session.id}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(session, null, 2), 'utf-8');
  }

  private getWorkspacesRoot(): string {
    return path.join(this.dataRoot, 'workspaces');
  }

  private getMetadataRoot(): string {
    return path.join(this.dataRoot, 'sessions');
  }
}
