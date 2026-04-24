import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LoadingConsoleContext,
  LoadingConsoleContextValue,
  LoadingConsoleEntry,
  LoadingConsoleSeverity,
} from '@/apps/common/context/LoadingConsoleContext';

const MAX_ENTRIES = 500;
const BATCH_MS = 150;

function formatArg(arg: unknown): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function formatMessage(args: unknown[]): { message: string; rest: string[] } {
  if (args.length === 0) return { message: '', rest: [] };
  const first = args[0];
  const message = typeof first === 'string' ? first : formatArg(first);
  const rest = args.slice(1).map(formatArg);
  return { message, rest };
}

export function LoadingConsoleProvider(props: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<LoadingConsoleEntry[]>([]);
  const pendingRef = useRef<LoadingConsoleEntry[]>([]);
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const flushPending = useCallback(() => {
    if (pendingRef.current.length === 0) return;
    const toAdd = pendingRef.current;
    pendingRef.current = [];
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    setEntries((prev) => {
      const next = [...prev, ...toAdd];
      return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;
    });
  }, []);

  const addEntry = useCallback(
    (severity: LoadingConsoleSeverity, ...args: unknown[]) => {
      const { message, rest } = formatMessage(args);
      const entry: LoadingConsoleEntry = {
        id: ++idRef.current,
        time: Date.now(),
        severity,
        message,
        args: rest,
      };
      pendingRef.current.push(entry);
      if (!batchTimerRef.current) {
        batchTimerRef.current = setTimeout(flushPending, BATCH_MS);
      }
    },
    [flushPending]
  );

  useEffect(() => {
    const origLog = typeof console.log === 'function' ? console.log : (): void => {};
    const origInfo = typeof console.info === 'function' ? console.info : (): void => {};
    const origWarn = typeof console.warn === 'function' ? console.warn : (): void => {};
    const origError = typeof console.error === 'function' ? console.error : (): void => {};
    const origDebug = typeof console.debug === 'function' ? console.debug : (): void => {};

    console.log = (...args: unknown[]) => {
      addEntry('log', ...args);
      origLog.apply(console, args);
    };
    console.info = (...args: unknown[]) => {
      addEntry('info', ...args);
      origInfo.apply(console, args);
    };
    console.warn = (...args: unknown[]) => {
      addEntry('warn', ...args);
      origWarn.apply(console, args);
    };
    console.error = (...args: unknown[]) => {
      addEntry('error', ...args);
      origError.apply(console, args);
    };
    console.debug = (...args: unknown[]) => {
      addEntry('debug', ...args);
      origDebug.apply(console, args);
    };

    const onError = (event: ErrorEvent) => {
      const msg = event.message || String(event.error);
      const stack = event.error?.stack;
      addEntry('error', msg, stack || '');
      return false;
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : '';
      addEntry('error', 'Unhandled promise rejection: ' + msg, stack || '');
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      console.log = origLog;
      console.info = origInfo;
      console.warn = origWarn;
      console.error = origError;
      console.debug = origDebug;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    };
  }, [addEntry]);

  const clear = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    pendingRef.current = [];
    setEntries([]);
  }, []);

  const value: LoadingConsoleContextValue = {
    enabled: true,
    entries,
    clear,
  };

  return <LoadingConsoleContext.Provider value={value}>{props.children}</LoadingConsoleContext.Provider>;
}
