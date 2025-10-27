import React, { useCallback, useEffect, useState } from "react";
// import { Menu, Item, Separator, Submenu, useContextMenu, ItemParams } from 'react-contexify';
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabERFEditorState } from "../../../states/tabs";
import * as KotOR from "../../../KotOR";
import { FileTypeManager } from "../../../FileTypeManager";
import { EditorFile } from "../../../EditorFile";
import { ForgeTreeView } from "../../treeview/ForgeTreeView";
import { FileBrowserNode } from "../../../FileBrowserNode";
import { ERFListNode } from "../../treeview/ERFListNode";
import { useContextMenu } from "../../common/ContextMenu";
import { createERFContextMenuItems } from "./ERFContextMenu";

const MENU_ID = 'context-tab-erf-editor-entry';

const exportAllResourceTypes = [KotOR.ResourceTypes['erf'], KotOR.ResourceTypes['mod'], KotOR.ResourceTypes['sav'], KotOR.ResourceTypes['rim']];

interface ContextMenuProps {
  archive: KotOR.ERFObject;
  resource: KotOR.IERFKeyEntry;
}

export const TabERFEditor = function(props: BaseTabProps) {
  const tab = props.tab as TabERFEditorState;
  const [entries, setEntries] = useState<FileBrowserNode[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<FileBrowserNode>();
  const { showContextMenu, ContextMenuComponent } = useContextMenu();

  const [selectedFilename, setSelectedFilename] = useState<string>('');
  const [selectedFiletype, setSelectedFiletype] = useState<string>('');
  const [selectedFilesize, setSelectedFilesize] = useState<string>('');

  const onEditorFileLoad = () => {
    setEntries(tab.files);
  };

  useEffectOnce( () => { //constructor
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => { //destructor
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    }
  });

  useEffect(() => {
    if(!selectedEntry) return;
    const { resource, archive } = selectedEntry.data || {};
    const res = archive.getResource(resource?.resRef, resource?.resType);
    setSelectedFilename(resource?.resRef);
    setSelectedFiletype(KotOR.ResourceTypes.getKeyByValue(resource?.resType));
    setSelectedFilesize(KotOR.Utility.bytesToSize( res ? res.size : 0 ));
  }, [selectedEntry]);

  const onResourceClick = (node: FileBrowserNode) => {
    console.log('onResourceClick', node);
    if(!node.data.resource){ return; }
    setSelectedEntry(node);
  }

  const onResourceDoubleClick = (node: FileBrowserNode) => {
    console.log('onResourceDoubleClick', node);
    if(!node.data.resource){ return; }
    openERFResource(node.data.archive, node.data.resource);
  }

  const onContextMenu = (event: React.MouseEvent<any>, node: FileBrowserNode) => {
    console.log('handleContextMenu', event, node);
    event.preventDefault();
    event.stopPropagation();
    if(!node.data.resource){ return; }
    setSelectedEntry(node);
    
    const contextMenuItems = createERFContextMenuItems({
      archive: node.data.archive,
      resource: node.data.resource
    });

    console.log('contextMenuItems', contextMenuItems);
    showContextMenu(event.clientX, event.clientY, contextMenuItems);
  };

  const openERFResource = async (archive: KotOR.ERFObject, key: KotOR.IERFKeyEntry) => {
    let buffer: Uint8Array;
    let buffer2: Uint8Array;
    if(key.resType == KotOR.ResourceTypes['mdl'] || key.resType == KotOR.ResourceTypes['mdx']){
      buffer = await archive.getResourceBufferByResRef(key.resRef, KotOR.ResourceTypes['mdl']);
      buffer2 = await archive.getResourceBufferByResRef(key.resRef, KotOR.ResourceTypes['mdx']);
      FileTypeManager.onOpenResource(
        new EditorFile({
          resref: key.resRef,
          reskey: KotOR.ResourceTypes['mdl'],
          buffer: buffer,
          buffer2: buffer2
        })
      );
    }else {
      buffer = await archive.getResourceBufferByResRef(key.resRef, key.resType);
      FileTypeManager.onOpenResource(
        new EditorFile({resref: key.resRef, reskey: key.resType, buffer: buffer })
      );
    }
  }

  return (
    <>
      <div className="file-browser">
        <div className="d-flex h-100">
          <ForgeTreeView style={{flex: 0.5, height: '100%', overflow: 'auto'}}>
            {
              entries.map( (node: FileBrowserNode) => {
                return (
                  <ERFListNode key={node.id} node={node} onContextMenu={onContextMenu} onSelect={onResourceClick} onDoubleClick={onResourceDoubleClick} />
                )
              })
            }
          </ForgeTreeView>
          <div style={{flex: 0.5, height: '100%'}}>
            {selectedEntry && (
              <div className="d-flex flex-column h-100 text-center align-items-center justify-content-center text-uppercase">
                <span><i className="fas fa-file-alt"></i></span>
                <span className="text-primary font-weight-bold">{selectedFilename}</span>
                <span className="text-secondary">{selectedFiletype}</span>
                <span className="text-muted">{selectedFilesize}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {ContextMenuComponent}
    </>
  );
}
