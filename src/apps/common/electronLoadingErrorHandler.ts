/**
 * Registers global error handlers for Electron app windows. When an unhandled
 * rejection or error occurs, shows a native OS message box with the error message
 * and closes the window (launcher will show again). Ensures the user is notified
 * instead of leaving loading animations running indefinitely.
 */
function formatErrorPayload(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message || String(reason);
  }
  if (typeof reason === 'string') return reason;
  try {
    return String(reason);
  } catch {
    return 'An error occurred.';
  }
}

function isElectronWithHandler(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location?.origin !== 'file://') return false;
  const electron = (window as unknown as { electron?: { showLoadingErrorAndExit?: (msg: string) => Promise<void> } })
    .electron;
  return typeof electron?.showLoadingErrorAndExit === 'function';
}

let handling = false;

function handleError(message: string) {
  if (handling) return;
  handling = true;
  const electron = (window as unknown as { electron: { showLoadingErrorAndExit: (msg: string) => Promise<void> } })
    .electron;
  const text = message.trim() || 'An error occurred while loading.';
  electron.showLoadingErrorAndExit(text).catch(() => {
    handling = false;
  });
}

export function registerElectronLoadingErrorHandler(): void {
  if (!isElectronWithHandler()) return;

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const message = formatErrorPayload(event.reason);
    handleError(message);
    event.preventDefault();
  });

  window.addEventListener('error', (event: ErrorEvent) => {
    const message = event.message || formatErrorPayload(event.error);
    handleError(message);
  });
}
