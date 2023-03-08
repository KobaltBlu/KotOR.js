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

  function handleContextMenu(event: React.MouseEvent<HTMLLIElement>, key: KotOR.ERFKeyEntry){
    console.log('handleContextMenu', event);
    show({
      event,
      props: key
    })
  }

  const handleContextItemClick = ({ id, event, props, data }: ItemParams<KotOR.ERFKeyEntry, any>) => {
    switch (id) {
      case "open-file":
        console.log(event, props)
        if(props){
          tab.erf.getResourceDataAsync(props.ResRef, props.ResType).then( (buffer) => {
            FileTypeManager.onOpenResource(
              new EditorFile({resref: props.ResRef, reskey: props.ResType, buffer: buffer })
            );
          });
        }
        break;
      case "export-file":
        console.log(event, props);
        if(props){
          tab.erf.getResourceDataAsync(props.ResRef, props.ResType).then( async (buffer) => {
            const currentFile = new EditorFile({resref: props.ResRef, reskey: props.ResType, buffer: buffer });
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
    setEntries(tab.erf.KeyList);
    setResources(tab.erf.Resources);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    }
  });

  const onResourceClick = (e: React.MouseEvent<HTMLLIElement>, key: KotOR.ERFKeyEntry) => {
    setSelectedEntry(selectedEntry);
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
              const resource = tab.erf.getResourceByKey(key.ResRef, key.ResType);
              return (
                <li className="file-browser-item" onClick={(e) => onResourceClick(e, key)} onContextMenu={(e) => handleContextMenu(e, key)}>
                  <span>{key.ResRef}</span>
                  <span>{KotOR.ResourceTypes.getKeyByValue(key.ResType)}</span>
                  <span>{KotOR.Utility.bytesToSize( resource ? resource.ResourceSize : 0 )}</span>
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