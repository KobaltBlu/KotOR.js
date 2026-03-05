import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export type SessionStatus = 'active' | 'warning' | 'saving' | 'expired' | 'closed';
export type SessionContainerStatus = 'start_requested' | 'ready' | 'stop_requested' | 'stopped' | 'failed';

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
  sessionPath: string;
  status: SessionStatus;
  containerStatus: SessionContainerStatus;
  containerId?: string;
  containerUpstreamUrl?: string;
  containerError?: string;
  containerReadyAt?: number;
  containerStopRequestedAt?: number;
  containerStoppedAt?: number;
  warningSentAt?: number;
  saveRequestedAt?: number;
  saveCompletedAt?: number;
}

export type SessionEventType =
  | 'session_created'
  | 'session_resumed'
  | 'session_container_start_requested'
  | 'session_container_ready'
  | 'session_container_stop_requested'
  | 'session_container_stopped'
  | 'session_container_failed'
  | 'session_workspace_quota_exceeded'
  | 'session_pruned'
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
  maxWorkspaceBytes?: number;
  closedSessionRetentionMs?: number;
  eventLogPath?: string;
  onEvent?: (event: SessionEvent) => void;
}

export class SessionManagerCore {
  private readonly sessions = new Map<string, ForgeSession>();
  private readonly events: SessionEvent[] = [];
  private readonly eventCounts = new Map<SessionEventType, number>();
  private readonly dataRoot: string;
  private readonly maxSessions: number;
  private readonly sessionTtlMs: number;
  private readonly warningLeadMs: number;
  private readonly maxWorkspaceBytes: number;
  private readonly closedSessionRetentionMs: number;
  private readonly eventLogPath?: string;
  private readonly onEvent?: (event: SessionEvent) => void;

  constructor(options: SessionManagerOptions) {
    this.dataRoot = options.dataRoot;
    this.maxSessions = options.maxSessions;
    this.sessionTtlMs = options.sessionTtlMs;
    this.warningLeadMs = options.warningLeadMs;
    this.maxWorkspaceBytes = Math.max(0, Number(options.maxWorkspaceBytes || 0));
    this.closedSessionRetentionMs = Math.max(0, Number(options.closedSessionRetentionMs ?? (72 * 60 * 60 * 1000)));
    this.eventLogPath = options.eventLogPath ? path.resolve(options.eventLogPath) : undefined;
    this.onEvent = options.onEvent;

    fs.mkdirSync(this.getWorkspacesRoot(), { recursive: true });
    fs.mkdirSync(this.getMetadataRoot(), { recursive: true });
    if (this.eventLogPath) {
      fs.mkdirSync(path.dirname(this.eventLogPath), { recursive: true });
    }
    this.loadPersistedSessions();
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
      sessionPath: `/sessions/${id}`,
      status: 'active',
      containerStatus: 'start_requested',
    };

    this.sessions.set(id, session);
    this.appendEvent({ type: 'session_created', at: now, sessionId: id, payload: { userId, game } });
    this.appendEvent({
      type: 'session_container_start_requested',
      at: now,
      sessionId: id,
      payload: {
        workspacePath: session.workspacePath,
        sessionPath: session.sessionPath,
      },
    });
    this.persistSession(session);
    return session;
  }

  createOrResumeSession(userId: string, game: 'kotor' | 'tsl' = 'kotor', now = Date.now()): ForgeSession {
    const existing = this.findLatestActiveSessionByUser(userId, game);
    if (existing) {
      existing.lastHeartbeatAt = now;
      if (existing.containerStatus === 'stopped' || existing.containerStatus === 'failed') {
        existing.containerStatus = 'start_requested';
        existing.containerId = undefined;
        existing.containerUpstreamUrl = undefined;
        existing.containerError = undefined;
        existing.containerStoppedAt = undefined;
        existing.containerStopRequestedAt = undefined;
        this.appendEvent({
          type: 'session_container_start_requested',
          at: now,
          sessionId: existing.id,
          payload: {
            workspacePath: existing.workspacePath,
            sessionPath: existing.sessionPath,
            reason: 'resume',
          },
        });
      }
      this.appendEvent({
        type: 'session_resumed',
        at: now,
        sessionId: existing.id,
        payload: { userId, game },
      });
      this.persistSession(existing);
      return existing;
    }

    return this.createSession(userId, game, now);
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
    this.requestContainerStop(session, now, 'session_closed');
    this.persistSession(session);
    return session;
  }

  getAuthorizedSession(sessionId: string, token: string): ForgeSession {
    return this.requireAuthorizedSession(sessionId, token);
  }

  markContainerReady(
    sessionId: string,
    token: string,
    containerId: string,
    options: { upstreamUrl?: string; now?: number } = {}
  ): ForgeSession {
    const session = this.requireAuthorizedSession(sessionId, token);
    const now = options.now ?? Date.now();
    session.containerId = containerId || session.containerId;
    session.containerStatus = 'ready';
    session.containerUpstreamUrl = options.upstreamUrl || session.containerUpstreamUrl;
    session.containerError = undefined;
    session.containerReadyAt = now;
    this.appendEvent({
      type: 'session_container_ready',
      at: now,
      sessionId: session.id,
      payload: {
        containerId: session.containerId,
        upstreamUrl: session.containerUpstreamUrl,
      },
    });
    this.persistSession(session);
    return session;
  }

  markContainerStopped(sessionId: string, token: string, now = Date.now()): ForgeSession {
    const session = this.requireAuthorizedSession(sessionId, token);
    session.containerStatus = 'stopped';
    session.containerError = undefined;
    session.containerStoppedAt = now;
    this.appendEvent({
      type: 'session_container_stopped',
      at: now,
      sessionId: session.id,
      payload: { containerId: session.containerId },
    });
    this.persistSession(session);
    return session;
  }

  markContainerFailed(sessionId: string, token: string, reason: string, now = Date.now()): ForgeSession {
    const session = this.requireAuthorizedSession(sessionId, token);
    session.containerStatus = 'failed';
    session.containerError = reason || 'unknown';
    this.appendEvent({
      type: 'session_container_failed',
      at: now,
      sessionId: session.id,
      payload: {
        reason: session.containerError,
        containerId: session.containerId,
      },
    });
    this.persistSession(session);
    return session;
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

      if (this.maxWorkspaceBytes > 0 && !session.saveRequestedAt) {
        const workspaceBytes = this.getDirectorySize(session.workspacePath);
        if (workspaceBytes > this.maxWorkspaceBytes) {
          session.saveRequestedAt = now;
          session.status = 'saving';
          this.appendEvent({
            type: 'session_workspace_quota_exceeded',
            at: now,
            sessionId: session.id,
            payload: {
              workspaceBytes,
              maxWorkspaceBytes: this.maxWorkspaceBytes,
            },
          });
          this.appendEvent({
            type: 'session_save_requested',
            at: now,
            sessionId: session.id,
            payload: { reason: 'workspace_quota_exceeded' },
          });
        }
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
        this.requestContainerStop(session, now, 'session_expired');
      }

      this.persistSession(session);
    }

    this.pruneRetiredSessions(now);
    return this.drainEvents();
  }

  drainEvents(): SessionEvent[] {
    if (!this.events.length) return [];
    const copy = this.events.slice();
    this.events.length = 0;
    return copy;
  }

  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [type, count] of this.eventCounts.entries()) {
      counts[type] = count;
    }
    return counts;
  }

  private appendEvent(event: SessionEvent): void {
    this.events.push(event);
    this.eventCounts.set(event.type, (this.eventCounts.get(event.type) || 0) + 1);
    if (this.eventLogPath) {
      try {
        fs.appendFileSync(this.eventLogPath, `${JSON.stringify(event)}\n`, 'utf-8');
      } catch {
        // ignore event log write failures
      }
    }
    if (this.onEvent) {
      try {
        this.onEvent(event);
      } catch {
        // ignore external sink callback failures
      }
    }
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

  private loadPersistedSessions(): void {
    try {
      const metadataRoot = this.getMetadataRoot();
      const entries = fs.readdirSync(metadataRoot);
      for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        const fullPath = path.join(metadataRoot, entry);
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Partial<ForgeSession>;
          if (!parsed.id || !parsed.userId || !parsed.game) continue;

          const restored: ForgeSession = {
            id: parsed.id,
            token: String(parsed.token || randomUUID().replace(/-/g, '')),
            userId: parsed.userId,
            game: parsed.game,
            createdAt: Number(parsed.createdAt || Date.now()),
            lastHeartbeatAt: Number(parsed.lastHeartbeatAt || parsed.createdAt || Date.now()),
            warningAt: Number(parsed.warningAt || Date.now()),
            expiresAt: Number(parsed.expiresAt || Date.now()),
            workspacePath: parsed.workspacePath || path.join(this.getWorkspacesRoot(), parsed.id),
            sessionPath: parsed.sessionPath || `/sessions/${parsed.id}`,
            status: parsed.status || 'active',
            containerStatus: parsed.containerStatus || 'start_requested',
            containerId: parsed.containerId,
            containerUpstreamUrl: parsed.containerUpstreamUrl,
            containerError: parsed.containerError,
            containerReadyAt: parsed.containerReadyAt,
            containerStopRequestedAt: parsed.containerStopRequestedAt,
            containerStoppedAt: parsed.containerStoppedAt,
            warningSentAt: parsed.warningSentAt,
            saveRequestedAt: parsed.saveRequestedAt,
            saveCompletedAt: parsed.saveCompletedAt,
          };
          this.sessions.set(restored.id, restored);
        } catch {
          // ignore malformed metadata rows
        }
      }
    } catch {
      // metadata directory may be empty on first run
    }
  }

  private pruneRetiredSessions(now: number): void {
    if (this.closedSessionRetentionMs <= 0) return;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status !== 'expired' && session.status !== 'closed') continue;
      if (session.containerStatus !== 'stopped' && session.containerStatus !== 'failed') continue;

      const terminalAt = session.status === 'expired'
        ? Math.max(
          session.saveCompletedAt || 0,
          session.containerStoppedAt || 0,
          session.containerStopRequestedAt || 0,
          session.expiresAt || 0,
          session.lastHeartbeatAt || 0
        )
        : Math.max(
          session.containerStoppedAt || 0,
          session.containerStopRequestedAt || 0,
          session.lastHeartbeatAt || 0
        );
      if ((now - terminalAt) < this.closedSessionRetentionMs) continue;

      const metadataPath = path.join(this.getMetadataRoot(), `${sessionId}.json`);
      try {
        fs.rmSync(session.workspacePath, { recursive: true, force: true });
      } catch {
        // ignore workspace cleanup failures
      }
      try {
        fs.rmSync(metadataPath, { force: true });
      } catch {
        // ignore metadata cleanup failures
      }
      this.sessions.delete(sessionId);
      this.appendEvent({
        type: 'session_pruned',
        at: now,
        sessionId,
        payload: {
          status: session.status,
          containerStatus: session.containerStatus,
        },
      });
    }
  }

  private requestContainerStop(session: ForgeSession, now: number, reason: 'session_closed' | 'session_expired'): void {
    if (session.containerStatus === 'stop_requested' || session.containerStatus === 'stopped') {
      return;
    }

    session.containerStatus = 'stop_requested';
    session.containerStopRequestedAt = now;
    this.appendEvent({
      type: 'session_container_stop_requested',
      at: now,
      sessionId: session.id,
      payload: {
        reason,
        containerId: session.containerId,
      },
    });
  }

  private findLatestActiveSessionByUser(userId: string, game: 'kotor' | 'tsl'): ForgeSession | undefined {
    let latest: ForgeSession | undefined;
    for (const session of this.sessions.values()) {
      if (session.userId !== userId || session.game !== game) continue;
      if (session.status === 'expired' || session.status === 'closed') continue;
      if (!latest || session.lastHeartbeatAt > latest.lastHeartbeatAt) {
        latest = session;
      }
    }
    return latest;
  }

  private getDirectorySize(directoryPath: string): number {
    try {
      const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
      let total = 0;
      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
          total += this.getDirectorySize(fullPath);
          continue;
        }
        if (entry.isFile()) {
          total += fs.statSync(fullPath).size;
        }
      }
      return total;
    } catch {
      return 0;
    }
  }

  private getWorkspacesRoot(): string {
    return path.join(this.dataRoot, 'workspaces');
  }

  private getMetadataRoot(): string {
    return path.join(this.dataRoot, 'sessions');
  }
}
