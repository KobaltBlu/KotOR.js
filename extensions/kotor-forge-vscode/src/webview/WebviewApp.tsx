/**
 * Webview app that uses the real Forge editors from src/apps/forge.
 * Sets a host adapter so save/recent files delegate to VS Code; creates one tab per document.
 */
import React, { useState, useEffect, useRef } from 'react';

import { TabManager } from '@forge/components/tabs/TabManager';
import { LayoutContainerProvider } from '@forge/context/LayoutContainerContext';
import { TabManagerProvider } from '@forge/context/TabManagerContext';
import { EditorFile } from '@forge/EditorFile';
import type { EditorFileEventListenerTypes } from '@forge/EditorFile';
import { FileLocationType } from '@forge/enum/FileLocationType';
import { ForgeState } from '@forge/states/ForgeState';
import type { TabState } from '@forge/states/tabs/TabState';
import * as KotOR from '@kotor/KotOR';
import { createScopedLogger, LogScope, setLogLevel } from '@kotor/utility/Logger';

import { createTabStateForEditorType } from './forgeEditorRegistry';
import { ForgeWebviewAdapter } from './ForgeWebviewAdapter';
import bridge from './WebviewBridge';

import 'bootstrap/dist/css/bootstrap.min.css';
import './WebviewApp.css';

const log = createScopedLogger(LogScope.Webview);

function createEditorFile(fileName: string, fileData: Uint8Array, buffer2?: Uint8Array): EditorFile {
  log.trace(`createEditorFile() fileName=${fileName} fileDataLength=${fileData?.length ?? 0} buffer2Length=${buffer2?.length ?? 0}`);
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
  const resref = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
  const reskey = (KotOR.ResourceTypes as Record<string, number>)[ext] ?? 0;
  const path = `file:///${fileName}`;
  const file = new EditorFile({
    path,
    buffer: fileData,
    buffer2,
    resref,
    ext: ext || undefined,
    reskey: reskey || undefined,
    location: FileLocationType.OTHER
  });
  log.trace(`createEditorFile() created EditorFile resref=${resref} ext=${ext}`);
  return file;
}

export const WebviewApp: React.FC = () => {
  const [adapter] = useState(() => new ForgeWebviewAdapter());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initOnce = useRef(false);
  const suppressEditSyncRef = useRef(false);
  const detachEditSyncRef = useRef<(() => void) | null>(null);

  const attachEditSync = (tabState: TabState): (() => void) => {
    const file = tabState?.file;
    if (!(file instanceof EditorFile)) {
      return () => undefined;
    }

    let notifyTimeout: number | undefined;
    const onSaveStateChanged = () => {
      if (!file.unsaved_changes || suppressEditSyncRef.current) {
        return;
      }

      if (notifyTimeout) {
        window.clearTimeout(notifyTimeout);
      }

      notifyTimeout = window.setTimeout(async () => {
        if (suppressEditSyncRef.current) return;
        try {
          if (typeof tabState.updateFile === 'function') {
            tabState.updateFile();
          }
          const buffer = await tabState.getExportBuffer();
          bridge.notifyEdit('Edit', buffer);
        } catch (e) {
          log.warn(`Failed to notify edit to host: ${e}`);
        }
      }, 40);
    };

    file.addEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', onSaveStateChanged);
    return () => {
      if (notifyTimeout) {
        window.clearTimeout(notifyTimeout);
      }
      file.removeEventListener<EditorFileEventListenerTypes>('onSaveStateChanged', onSaveStateChanged);
    };
  };

  const applyHostContent = async (content: number[], markSaved = false): Promise<void> => {
    const manager = adapter.getTabManager();
    const tab = manager.currentTab as TabState | undefined;
    if (!tab?.file) return;

    suppressEditSyncRef.current = true;
    try {
      tab.file.buffer = new Uint8Array(content);
      if (markSaved) {
        tab.file.unsaved_changes = false;
      }
      if (typeof (tab as TabState & { openFile?: () => Promise<void> }).openFile === 'function') {
        await (tab as TabState & { openFile: () => Promise<void> }).openFile();
      }
    } finally {
      suppressEditSyncRef.current = false;
    }
  };

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;
    log.trace('WebviewApp useEffect() initializing bridge handlers');

    bridge.on('init', async (data: unknown) => {
      const message = data as {
        editorType: string;
        fileData: number[];
        fileName: string;
        fileData2?: number[];
        logLevel?: string;
      };
      if (message.logLevel != null) {
        setLogLevel(message.logLevel);
      }
      log.info(`init message received editorType=${message?.editorType} fileName=${message?.fileName} fileDataLength=${message?.fileData?.length ?? 0}`);
      try {
        const editorType = message.editorType;
        const fileData = new Uint8Array(message.fileData || []);
        const fileName = message.fileName || 'unknown';
        const buffer2 = message.fileData2 ? new Uint8Array(message.fileData2) : undefined;

        log.trace('ForgeState.setHostAdapter(adapter)');
        ForgeState.setHostAdapter(adapter);

        const editorFile = createEditorFile(fileName, fileData, buffer2);
        log.debug(`createTabStateForEditorType(editorType=${editorType}) creating tab state`);
        const tabState = createTabStateForEditorType(editorType, { editorFile });
        log.debug(`addTab() adding tab type=${tabState.constructor.name} id=${tabState.id}`);
        adapter.getTabManager().addTab(tabState);
        if (detachEditSyncRef.current) {
          detachEditSyncRef.current();
        }
        detachEditSyncRef.current = attachEditSync(tabState);
        log.info(`Tab added and shown; editor ready type=${editorType} tab=${tabState.constructor.name}`);
        setReady(true);
      } catch (e) {
        log.error('Forge init failed', e);
        setError(e instanceof Error ? e.message : String(e));
      }
    });

    bridge.on('getFileData', (data: unknown) => {
      const message = data as { requestId?: number };
      log.trace(`getFileData message received requestId=${message?.requestId ?? 'n/a'}`);
      const manager = adapter.getTabManager();
      const tab = manager.currentTab;
      if (tab) {
        if (typeof (tab as TabState).updateFile === 'function') (tab as TabState).updateFile();
        tab.getExportBuffer().then((buffer) => {
          log.trace(`getFileData sending buffer length=${buffer?.length ?? 0}`);
          bridge.sendFileData(buffer, message.requestId);
        }).catch((err) => {
          log.debug(`getFileData getExportBuffer failed, sending empty: ${err}`);
          bridge.sendFileData(new Uint8Array(0), message.requestId);
        });
      } else {
        log.trace('getFileData no current tab, sending empty');
        bridge.sendFileData(new Uint8Array(0), message.requestId);
      }
    });

    bridge.on('undo', (data: unknown) => {
      const msg = data as { content?: number[] };
      if (!Array.isArray(msg?.content)) return;
      log.trace(`undo message received contentLength=${msg.content.length}`);
      void applyHostContent(msg.content);
    });
    bridge.on('redo', (data: unknown) => {
      const msg = data as { content?: number[] };
      if (!Array.isArray(msg?.content)) return;
      log.trace(`redo message received contentLength=${msg.content.length}`);
      void applyHostContent(msg.content);
    });

    bridge.on('revert', (data: unknown) => {
      const msg = data as { content?: number[] };
      const content = msg?.content;
      if (!Array.isArray(content)) return;
      log.info('revert message received, applying to current tab');
      void applyHostContent(content, true);
    });

    log.info('Bridge handlers registered, calling notifyReady()');
    bridge.notifyReady();
    return () => {
      if (detachEditSyncRef.current) {
        detachEditSyncRef.current();
        detachEditSyncRef.current = null;
      }
    };
  }, [adapter]);

  if (error) {
    return (
      <div className="webviewApp-error">
        <h2>Failed to load editor</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="webviewApp-loading">
        <div>Loading KotOR Forge editor…</div>
      </div>
    );
  }

  return (
    <LayoutContainerProvider>
      <TabManagerProvider manager={adapter.getTabManager()}>
        <div id="app" data-theme="dark" className="webviewApp-root">
          <TabManager />
        </div>
      </TabManagerProvider>
    </LayoutContainerProvider>
  );
};

export default WebviewApp;
