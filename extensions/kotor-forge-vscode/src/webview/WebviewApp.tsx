/**
 * Webview app that uses the real Forge editors from src/apps/forge.
 * Sets a host adapter so save/recent files delegate to VS Code; creates one tab per document.
 */
import React, { useState, useEffect, useRef } from 'react';

import { TabManager } from '@forge/components/tabs/TabManager';
import { LayoutContainerProvider } from '@forge/context/LayoutContainerContext';
import { TabManagerProvider } from '@forge/context/TabManagerContext';
import { EditorFile } from '@forge/EditorFile';
import { FileLocationType } from '@forge/enum/FileLocationType';
import { ForgeState } from '@forge/states/ForgeState';
import type { TabState } from '@forge/states/tabs/TabState';
import * as KotOR from '@kotor/KotOR';

import { createTabStateForEditorType } from './forgeEditorRegistry';
import { ForgeWebviewAdapter } from './ForgeWebviewAdapter';
import bridge from './WebviewBridge';

import 'bootstrap/dist/css/bootstrap.min.css';
import './WebviewApp.css';

const LOG_PREFIX = '[Webview]';
function logTrace(msg: string) {
  if (typeof console !== 'undefined' && console.debug) console.debug(`${LOG_PREFIX} [trace] ${msg}`);
}
function logDebug(msg: string) {
  if (typeof console !== 'undefined' && console.debug) console.debug(`${LOG_PREFIX} [debug] ${msg}`);
}
function logInfo(msg: string) {
  if (typeof console !== 'undefined' && console.info) console.info(`${LOG_PREFIX} [info] ${msg}`);
}
function logError(msg: string, err?: unknown) {
  if (typeof console !== 'undefined' && console.error) console.error(`${LOG_PREFIX} [error] ${msg}`, err ?? '');
}

function createEditorFile(fileName: string, fileData: Uint8Array, buffer2?: Uint8Array): EditorFile {
  logTrace(`createEditorFile() fileName=${fileName} fileDataLength=${fileData?.length ?? 0} buffer2Length=${buffer2?.length ?? 0}`);
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
  logTrace(`createEditorFile() created EditorFile resref=${resref} ext=${ext}`);
  return file;
}

export const WebviewApp: React.FC = () => {
  const [adapter] = useState(() => new ForgeWebviewAdapter());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initOnce = useRef(false);

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;
    logTrace('WebviewApp useEffect() initializing bridge handlers');


    bridge.on('init', async (data: unknown) => {
      const message = data as { editorType: string; fileData: number[]; fileName: string; fileData2?: number[] };
      logInfo(`init message received editorType=${message?.editorType} fileName=${message?.fileName} fileDataLength=${message?.fileData?.length ?? 0}`);
      try {
        const editorType = message.editorType;
        const fileData = new Uint8Array(message.fileData || []);
        const fileName = message.fileName || 'unknown';
        const buffer2 = message.fileData2 ? new Uint8Array(message.fileData2) : undefined;

        logTrace('ForgeState.setHostAdapter(adapter)');
        ForgeState.setHostAdapter(adapter);

        const editorFile = createEditorFile(fileName, fileData, buffer2);
        logTrace(`createTabStateForEditorType(${editorType})`);
        const TabStateClass = createTabStateForEditorType(editorType, { editorFile });
        adapter.getTabManager().addTab(TabStateClass);
        logInfo('Tab added, setReady(true)');
        setReady(true);
      } catch (e) {
        logError('Forge init failed', e);
        setError(e instanceof Error ? e.message : String(e));
      }
    });

    bridge.on('getFileData', (data: unknown) => {
      const message = data as { requestId?: number };
      logTrace(`getFileData message received requestId=${message?.requestId ?? 'n/a'}`);
      const manager = adapter.getTabManager();
      const tab = manager.currentTab;
      if (tab) {
        if (typeof (tab as TabState).updateFile === 'function') (tab as TabState).updateFile();
        tab.getExportBuffer().then((buffer) => {
          logTrace(`getFileData sending buffer length=${buffer?.length ?? 0}`);
          bridge.sendFileData(buffer, message.requestId);
        }).catch((err) => {
          logDebug(`getFileData getExportBuffer failed, sending empty: ${err}`);
          bridge.sendFileData(new Uint8Array(0), message.requestId);
        });
      } else {
        logTrace('getFileData no current tab, sending empty');
        bridge.sendFileData(new Uint8Array(0), message.requestId);
      }
    });

    bridge.on('undo', () => { logTrace('undo message received (host drives undo)'); });
    bridge.on('redo', () => { logTrace('redo message received (host drives redo)'); });

    logInfo('Bridge handlers registered, calling notifyReady()');
    bridge.notifyReady();
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
