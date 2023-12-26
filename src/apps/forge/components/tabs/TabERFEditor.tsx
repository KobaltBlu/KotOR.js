import React, { useState } from "react";
import { Menu, Item, Separator, Submenu, useContextMenu, ItemParams } from 'react-contexify';
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { TabERFEditorState } from "../../states/tabs";

import * as KotOR from "../../KotOR";
import { FileTypeManager } from "../../FileTypeManager";
import { EditorFile } from "../../EditorFile";
import * as fs from "fs";

declare const dialog: any;

const MENU_ID = 'context-tab-erf-editor-entry';

export const TabERFEditor = function(props: BaseTabProps) {
  const tab = props.tab as TabERFEditorState;
  const [entries, setEntries] = useState<KotOR.ERFKeyEntry[]>();
  const [resources, setResources] = useState<KotOR.ERFResource[]>();
  const [selectedEntry, setSelectedEntry] = useState<KotOR.ERFKeyEntry>();

  
  const { show } = useContextMenu({
    id: MENU_ID,
  });

  const handleContextItemClick = async ({ id, event, props, data }: ItemParams<KotOR.ERFKeyEntry, any>) => {
    switch (id) {
      case "open-file":
        console.log(event, props)
        if(props){
          openERFResource(props);
        }
        break;
      case "export-file":
        console.log(event, props);
        if(props){
          tab.erf.getRawResource(props.resRef, props.resType).then( async (buffer) => {
            const currentFile = new EditorFile({resref: props.resRef, reskey: props.resType, buffer: buffer });
            if(!currentFile.buffer) return;
            try{
              if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
                let savePath = await dialog.showSaveDialog({
                  title: 'Save File As',
                  defaultPath: currentFile.getFilename(),
                });
                if(savePath && !savePath.cancelled){
                  console.log('savePath', savePath.filePath);
                  try{
                    let saveBuffer = Buffer.from(currentFile.buffer)
                    fs.writeFile(savePath.filePath, saveBuffer, () => {
                      currentFile.setPath(savePath.filePath);
                      currentFile.archive_path = undefined;
                      currentFile.archive_path2 = undefined;
                      currentFile.buffer = saveBuffer;
                      currentFile.unsaved_changes = false;
                    });
                  }catch(e){
                    console.error(e);
                  }
                }
              }else if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
                let newHandle = await window.showSaveFilePicker();
                if(newHandle){
                  currentFile.handle = newHandle;
                  console.log('handle', newHandle.name, newHandle);
                  try{
                    currentFile.setPath(newHandle.name);
                    let saveBuffer = Buffer.from(currentFile.buffer)
                    let ws: FileSystemWritableFileStream = await newHandle.createWritable();
                    await ws.write(saveBuffer || Buffer.allocUnsafe(0));
                    currentFile.buffer = saveBuffer;
                    currentFile.unsaved_changes = false;
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
          });
        }
        break;
    }
  }

  const onEditorFileLoad = () => {
    setEntries(tab.erf.keyList);
    setResources(tab.erf.resources);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    }
  });

  const onResourceClick = (e: React.MouseEvent<HTMLLIElement>, key: KotOR.ERFKeyEntry) => {
    setSelectedEntry(key);
  }

  const onResourceDoubleClick = (e: React.MouseEvent<HTMLLIElement>, key: KotOR.ERFKeyEntry) => {
    setSelectedEntry(key);
    openERFResource(key);
  }

  const onContextMenu = (event: React.MouseEvent<HTMLLIElement>, key: KotOR.ERFKeyEntry) => {
    console.log('handleContextMenu', event);
    setSelectedEntry(key);
    show({
      event,
      props: key
    })
  }

  const openERFResource = async (key: KotOR.ERFKeyEntry) => {
    let buffer: Buffer;
    let buffer2: Buffer;
    if(key.resType == KotOR.ResourceTypes['mdl'] || key.resType == KotOR.ResourceTypes['mdx']){
      buffer = await tab.erf.getRawResource(key.resRef, KotOR.ResourceTypes['mdl']);
      buffer2 = await tab.erf.getRawResource(key.resRef, KotOR.ResourceTypes['mdx']);
      FileTypeManager.onOpenResource(
        new EditorFile({
          resref: key.resRef,
          reskey: KotOR.ResourceTypes['mdl'],
          buffer: buffer,
          buffer2: buffer2
        })
      );
    }else {
      buffer = await tab.erf.getRawResource(key.resRef, key.resType);
      FileTypeManager.onOpenResource(
        new EditorFile({resref: key.resRef, reskey: key.resType, buffer: buffer })
      );
    }
  }

  return (
    <>
      <div className="file-browser">
        <div className="file-browser-header">
          <span>Name</span>
          <span>Type</span>
          <span>Size</span>
        </div>
        <ul className="file-browser-list">
          {
            entries?.map( (key: KotOR.ERFKeyEntry) => {
              const resource = tab.erf.getResourceByKey(key.resRef, key.resType);
              return (
                <li className={`file-browser-item ${selectedEntry == key ? `selected` : ``}`} onClick={(e) => onResourceClick(e, key)} onDoubleClick={(e) => onResourceDoubleClick(e, key)} onContextMenu={(e) => onContextMenu(e, key)}>
                  <span>{key.resRef}</span>
                  <span>{KotOR.ResourceTypes.getKeyByValue(key.resType)}</span>
                  <span>{KotOR.Utility.bytesToSize( resource ? resource.size : 0 )}</span>
                </li>
              )
            })
          }
        </ul>
        <Menu id={MENU_ID} theme={'dark'}>
          <Item id="open-file" onClick={handleContextItemClick}>Open</Item>
          <Item id="export-file" onClick={handleContextItemClick}>Export</Item>
        </Menu>
      </div>
    </>
  );
}