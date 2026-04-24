import React, { useState, useCallback, useRef } from 'react';
import * as fs from 'fs';
import * as nodePath from 'path';
import TabManager from '@/apps/forge/components/tabs/TabManager';
import { TabManagerProvider } from '@/apps/forge/context/TabManagerContext';
import { ForgeState } from '@/apps/forge/states/ForgeState';
import { MenuTop } from '@/apps/forge/components/MenuTop';
import { LayoutContainerProvider } from '@/apps/forge/context/LayoutContainerContext';
import { LayoutContainer } from '@/apps/forge/components/LayoutContainer/LayoutContainer';
import ModalGrantAccess from '@/apps/forge/components/modal/ModalGrantAccess';
import { ModalChangeGame } from '@/apps/forge/components/modal/ModalChangeGame';
import { useEffectOnce } from '@/apps/forge/helpers/UseEffectOnce';
import { useApp } from '@/apps/forge/context/AppContext';
import { ModalManager } from '@/apps/forge/components/modal/ModalManager';
import { LoadingScreen } from '@/apps/common/components/loadingScreen/LoadingScreen';
import { FileTypeManager } from '@/apps/forge/FileTypeManager';
import { ForgeFileSystem } from '@/apps/forge/ForgeFileSystem';
import { pathParse } from '@/apps/forge/helpers/PathParse';
import { EditorFileProtocol } from '@/apps/forge/enum/EditorFileProtocol';
import * as KotOR from '@/KotOR';

export const App = (props: any) => {
  const appContext = useApp();
  const [appReady, setAppReady] = appContext.appReady;
  const [showGrantModal, setShowGrantModal] = appContext.showGrantModal;
  const [showLoadingScreen] = appContext.showLoadingScreen;
  const [loadingScreenMessage] = appContext.loadingScreenMessage;
  const [loadingScreenBackgroundURL] = appContext.loadingScreenBackgroundURL;
  const [loadingScreenLogoURL] = appContext.loadingScreenLogoURL;
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const onUserGrant = () => {
    setShowGrantModal(false);
    beginInit();
  };

  const beginInit = () => {
    ForgeState.InitializeApp().then(() => {
      onInitComplete();
    });
  };

  const onInitComplete = () => {
    setAppReady(true);
    setTimeout(() => {
      dispatchEvent(new Event('resize'));
    }, 100);

    // console.log('start');
    // TabResourceExplorerState.GenerateResourceList().then( () => {
    //   console.log('end');
    // })
  };

  const onUserCancel = () => {
    setShowGrantModal(true);
    window.close();
  };

  useEffectOnce(() => {
    ForgeState.VerifyGameDirectory(
      () => {
        console.log('Game Directory', 'verified');
        setShowGrantModal(false);
        beginInit();
      },
      () => {
        console.warn('Game Directory', 'not found');
        setShowGrantModal(true);
      }
    );

    return () => {
      //Deconstructor
    };
  });

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = ('open' as any) || 'copy';
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);

    if (KotOR.ApplicationProfile.ENV === KotOR.ApplicationEnvironment.ELECTRON) {
      const allFiles = Array.from(e.dataTransfer.files);
      const mdlFiles = allFiles.filter((f) => pathParse(f.name).ext.toLowerCase() === 'mdl');
      const mdxFiles = allFiles.filter((f) => pathParse(f.name).ext.toLowerCase() === 'mdx');
      const otherFiles = allFiles.filter((f) => {
        const ext = pathParse(f.name).ext.toLowerCase();
        return ext !== 'mdl' && ext !== 'mdx';
      });

      for (const file of otherFiles) {
        const parsed = pathParse(file.name);
        FileTypeManager.onOpenFile({
          path: (file as any).path,
          filename: file.name,
          resref: parsed.name,
          ext: parsed.ext,
        });
      }

      // Track MDX files that get paired so we don't open them again standalone
      const pairedMdxPaths = new Set<string>();

      for (const mdlFile of mdlFiles) {
        const parsed = pathParse(mdlFile.name);
        const filePath = (mdlFile as any).path as string;

        // Prefer a counterpart from the same drop batch
        const batchMdx = mdxFiles.find(
          (f) =>
            pathParse(f.name).name.toLowerCase() === parsed.name.toLowerCase() && !pairedMdxPaths.has((f as any).path)
        );

        let path2: string | undefined;
        if (batchMdx) {
          path2 = (batchMdx as any).path;
          pairedMdxPaths.add(path2);
        } else {
          // Auto-detect: look for the MDX sitting next to the MDL on disk
          const dir = nodePath.dirname(filePath);
          const candidate = nodePath.join(dir, `${parsed.name}.mdx`);
          if (fs.existsSync(candidate)) {
            path2 = candidate;
          }
        }

        FileTypeManager.onOpenFile({
          path: filePath,
          path2: path2,
          filename: mdlFile.name,
          resref: parsed.name,
          ext: parsed.ext,
        });
      }

      // Handle any MDX files that weren't paired with a dropped MDL
      for (const mdxFile of mdxFiles) {
        const mdxPath = (mdxFile as any).path as string;
        if (pairedMdxPaths.has(mdxPath)) continue;

        const parsed = pathParse(mdxFile.name);
        const dir = nodePath.dirname(mdxPath);
        const candidateMdl = nodePath.join(dir, `${parsed.name}.mdl`);

        if (fs.existsSync(candidateMdl)) {
          // Open the MDL as primary with the dropped MDX as secondary
          FileTypeManager.onOpenFile({
            path: candidateMdl,
            path2: mdxPath,
            filename: `${parsed.name}.mdl`,
            resref: parsed.name,
            ext: 'mdl',
          });
        } else {
          FileTypeManager.onOpenFile({
            path: mdxPath,
            filename: mdxFile.name,
            resref: parsed.name,
            ext: parsed.ext,
          });
        }
      }
    } else {
      // Browser: use FileSystemFileHandle via dataTransfer.items.
      // All getAsFileSystemHandle() calls must be initiated synchronously before
      // any await, because the browser clears the DataTransfer object on the
      // first yield back to the event loop.
      const items = Array.from(e.dataTransfer.items).filter((item) => item.kind === 'file');
      const handlePromises = items
        .filter((item) => 'getAsFileSystemHandle' in item)
        .map((item) => (item as any).getAsFileSystemHandle() as Promise<FileSystemFileHandle>);

      const resolvedHandles = await Promise.all(handlePromises);
      const handles = resolvedHandles.filter((h) => h && h.kind === 'file');

      const mdlHandles = handles.filter((h) => pathParse(h.name).ext.toLowerCase() === 'mdl');
      const mdxHandles = handles.filter((h) => pathParse(h.name).ext.toLowerCase() === 'mdx');
      const otherHandles = handles.filter((h) => {
        const ext = pathParse(h.name).ext.toLowerCase();
        return ext !== 'mdl' && ext !== 'mdx';
      });

      for (const handle of otherHandles) {
        const parsed = pathParse(handle.name);
        FileTypeManager.onOpenFile({
          path: `${EditorFileProtocol.FILE}//system.dir/${handle.name}`,
          handle: handle,
          filename: handle.name,
          resref: parsed.name,
          ext: parsed.ext,
        });
      }

      const pairedMdxHandles = new Set<FileSystemFileHandle>();

      for (const mdlHandle of mdlHandles) {
        const parsed = pathParse(mdlHandle.name);

        // Prefer a counterpart from the same drop batch
        const batchMdx = mdxHandles.find(
          (h) => pathParse(h.name).name.toLowerCase() === parsed.name.toLowerCase() && !pairedMdxHandles.has(h)
        );

        if (batchMdx) {
          pairedMdxHandles.add(batchMdx);
          FileTypeManager.onOpenFile({
            path: `${EditorFileProtocol.FILE}//system.dir/${mdlHandle.name}`,
            path2: `${EditorFileProtocol.FILE}//system.dir/${batchMdx.name}`,
            handle: mdlHandle,
            handle2: batchMdx,
            filename: mdlHandle.name,
            resref: parsed.name,
            ext: parsed.ext,
          });
        } else {
          // Prompt the user to locate the MDX counterpart
          const originalTitle = document.title;
          document.title = `Open MDX File (${parsed.name}.mdx)`;
          const mdxResponse = await ForgeFileSystem.OpenFile({ ext: ['.mdx'] });
          document.title = originalTitle;

          if (Array.isArray(mdxResponse.handles) && mdxResponse.handles.length > 0) {
            const [mdxHandle] = mdxResponse.handles as FileSystemFileHandle[];
            FileTypeManager.onOpenFile({
              path: `${EditorFileProtocol.FILE}//system.dir/${mdlHandle.name}`,
              path2: `${EditorFileProtocol.FILE}//system.dir/${mdxHandle.name}`,
              handle: mdlHandle,
              handle2: mdxHandle,
              filename: mdlHandle.name,
              resref: parsed.name,
              ext: parsed.ext,
            });
          } else {
            // User cancelled – open MDL alone
            FileTypeManager.onOpenFile({
              path: `${EditorFileProtocol.FILE}//system.dir/${mdlHandle.name}`,
              handle: mdlHandle,
              filename: mdlHandle.name,
              resref: parsed.name,
              ext: parsed.ext,
            });
          }
        }
      }

      // Handle any MDX files that weren't paired with a dropped MDL
      for (const mdxHandle of mdxHandles) {
        if (pairedMdxHandles.has(mdxHandle)) continue;

        const parsed = pathParse(mdxHandle.name);

        // Prompt the user to locate the MDL counterpart
        const originalTitle = document.title;
        document.title = `Open MDL File (${parsed.name}.mdl)`;
        const mdlResponse = await ForgeFileSystem.OpenFile({ ext: ['.mdl'] });
        document.title = originalTitle;

        if (Array.isArray(mdlResponse.handles) && mdlResponse.handles.length > 0) {
          const [mdlHandle] = mdlResponse.handles as FileSystemFileHandle[];
          FileTypeManager.onOpenFile({
            path: `${EditorFileProtocol.FILE}//system.dir/${mdlHandle.name}`,
            path2: `${EditorFileProtocol.FILE}//system.dir/${mdxHandle.name}`,
            handle: mdlHandle,
            handle2: mdxHandle,
            filename: mdlHandle.name,
            resref: parsed.name,
            ext: 'mdl',
          });
        } else {
          // User cancelled – open MDX alone
          FileTypeManager.onOpenFile({
            path: `${EditorFileProtocol.FILE}//system.dir/${mdxHandle.name}`,
            handle: mdxHandle,
            filename: mdxHandle.name,
            resref: parsed.name,
            ext: parsed.ext,
          });
        }
      }
    }
  }, []);

  const westContent = (
    <div id="tabs-explorer" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <TabManagerProvider manager={ForgeState.explorerTabManager}>
        <TabManager></TabManager>
      </TabManagerProvider>
    </div>
  );

  return (
    <>
      <div
        id="app"
        style={{ opacity: appReady ? '1' : '0' }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <MenuTop />
        <div id="container">
          <LayoutContainerProvider>
            <LayoutContainer westContent={westContent}>
              <TabManagerProvider manager={ForgeState.tabManager}>
                <TabManager></TabManager>
              </TabManagerProvider>
            </LayoutContainer>
          </LayoutContainerProvider>
        </div>
        <ModalChangeGame></ModalChangeGame>
        {isDragOver && (
          <div className="drag-drop-overlay">
            <div className="drag-drop-overlay__content">
              <i className="fas fa-file-import"></i>
              <span>Drop files to open</span>
            </div>
          </div>
        )}
      </div>
      <ModalManager manager={ForgeState.modalManager}></ModalManager>
      <ModalGrantAccess onUserGrant={onUserGrant} onUserCancel={onUserCancel}></ModalGrantAccess>
      <LoadingScreen
        active={showLoadingScreen}
        message={loadingScreenMessage}
        backgroundURL={loadingScreenBackgroundURL}
        logoURL={loadingScreenLogoURL}
      />
    </>
  );
};
