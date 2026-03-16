import React from 'react';
import { ContextMenuItem } from '../../common/ContextMenu';
import * as KotOR from '../../../KotOR';
import { FileTypeManager } from '../../../FileTypeManager';
import { EditorFile } from '../../../EditorFile';
const exportAllResourceTypes = [KotOR.ResourceTypes['erf'], KotOR.ResourceTypes['mod'], KotOR.ResourceTypes['sav'], KotOR.ResourceTypes['rim']];

import * as fs from "fs";
declare const dialog: any;

export interface ERFContextMenuProps {
  archive: KotOR.ERFObject;
  resource: KotOR.IERFKeyEntry;
}

export const createERFContextMenuItems = (props: ERFContextMenuProps): ContextMenuItem[] => {
  const {
    archive, resource
  } = props;

  const exportItems: ContextMenuItem[] = [
    {
      id: 'open-file',
      label: 'Open File',
      onClick: async () => {
        let buffer: Uint8Array;
        let buffer2: Uint8Array;
        if(resource.resType == KotOR.ResourceTypes['mdl'] || resource.resType == KotOR.ResourceTypes['mdx']){
          buffer = await archive.getResourceBufferByResRef(resource.resRef, KotOR.ResourceTypes['mdl']);
          buffer2 = await archive.getResourceBufferByResRef(resource.resRef, KotOR.ResourceTypes['mdx']);
          FileTypeManager.onOpenResource(
            new EditorFile({
              resref: resource.resRef,
              reskey: KotOR.ResourceTypes['mdl'],
              buffer: buffer,
              buffer2: buffer2
            })
          );
        }else {
          buffer = await archive.getResourceBufferByResRef(resource.resRef, resource.resType);
          FileTypeManager.onOpenResource(
            new EditorFile({resref: resource.resRef, reskey: resource.resType, buffer: buffer })
          );
        }
      }
    },
    {
      id: 'export-file',
      label: 'Export File',
      onClick: async () => {
        const exportBuffer = await archive.getResourceBufferByResRef(resource.resRef, resource.resType)
        const newFile = new EditorFile({resref: resource.resRef, reskey: resource.resType, buffer: exportBuffer });
        if(!newFile.buffer) return;
        try{
          if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
            const savePath = await dialog.showSaveDialog({
              title: 'Save File As',
              defaultPath: newFile.getFilename(),
            });
            if(savePath && !savePath.cancelled){
              console.log('savePath', savePath.filePath);
              try{
                const saveBuffer = new Uint8Array(newFile.buffer)
                fs.writeFile(savePath.filePath, saveBuffer, () => {
                  newFile.setPath(savePath.filePath);
                  newFile.archive_path = undefined;
                  newFile.archive_path2 = undefined;
                  newFile.buffer = saveBuffer;
                  newFile.unsaved_changes = false;
                });
              }catch(e){
                console.error(e);
              }
            }
          }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
            const newHandle = await window.showSaveFilePicker({
              suggestedName: newFile.getFilename()
            });
            if(newHandle){
              newFile.handle = newHandle;
              log.debug('handle', newHandle.name, newHandle);
              try{
                newFile.setPath(`file://system.dir/${newHandle.name}`);
                const saveBuffer = new Uint8Array(newFile.buffer)
                const ws: FileSystemWritableFileStream = await newHandle.createWritable();
                await ws.write(saveBuffer || new Uint8Array(0));
                await ws.close();
                newFile.buffer = saveBuffer;
                newFile.unsaved_changes = false;
              }catch(e){
                console.error(e);
              }
            }else{
              console.error('save handle invalid');
            }
          }
        }catch(e: any){
          console.error(e);
        }
      }
    }
  ];

  if(exportAllResourceTypes.includes(resource.resType)){
    exportItems.push(...[
      { id: 'separator-1', separator: true },
      {
        id: 'export-all-files',
        label: `${resource.resRef}: Export All Files`,
        onClick: async () => {
          const exportBufferArchive = await archive.getResourceBufferByResRef(resource.resRef, resource.resType);
          if(resource.resType == KotOR.ResourceTypes['erf'] || resource.resType == KotOR.ResourceTypes['mod'] || resource.resType == KotOR.ResourceTypes['sav']){
            const erf = resource.resType == KotOR.ResourceTypes['rim'] ? new KotOR.RIMObject(exportBufferArchive) : new KotOR.ERFObject(exportBufferArchive);
            await erf.load();
            if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
              const savePath = await dialog.showSaveDialog({
                title: 'Choose export directory',
                properties: ['openDirectory', 'createDirectory'],
              });
              if(!savePath || savePath.cancelled){
                console.error('save path invalid');
                return;
              }
              console.log('savePath', savePath.filePath);
              const resources = (erf as any).keyList ? (erf as any).keyList : (erf as any).resources;
              for(const key of resources){
                const exportBuffer = await erf.getResourceBufferByResRef(key.resRef, key.resType);
                fs.writeFile(savePath.filePath + '/' + key.resRef+'.'+KotOR.ResourceTypes.getKeyByValue(key.resType), exportBuffer, () => {
                  console.log('exported file', key.resRef+'.'+KotOR.ResourceTypes.getKeyByValue(key.resType));
                });
              }
            }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
              const directoryHandle = await window.showDirectoryPicker({
                writable: true,
                mode: 'readwrite',
              });
              if(!directoryHandle){
                console.error('directory handle invalid');
                return;
              }
              const resources = (erf as any).keyList ? (erf as any).keyList : (erf as any).resources;
              for(const key of resources){
                const exportBuffer = await erf.getResourceBufferByResRef(key.resRef, key.resType);
                const fileHandle = await directoryHandle.getFileHandle(key.resRef+'.'+KotOR.ResourceTypes.getKeyByValue(key.resType), { create: true });
                if(!fileHandle){
                  console.error('file handle invalid');
                  continue;
                }
                const ws: FileSystemWritableFileStream = await fileHandle.createWritable();
                await ws.write(exportBuffer as any);
                await ws.close();
              }
            }
          }
        }
      }
    ]);
  }

  return exportItems;
};
