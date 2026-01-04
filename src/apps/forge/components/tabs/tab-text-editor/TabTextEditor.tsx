import React, { useState, useRef, useEffect } from "react";
import MonacoEditor from "react-monaco-editor";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabTextEditorState } from "../../../states/tabs";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { TabManagerProvider } from "../../../context/TabManagerContext";
import TabManager from "../TabManager";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { MenuBar, MenuItem } from "../../common/MenuBar";

export const TabTextEditor = function(props: any){
  const tab: TabTextEditorState = props.tab;

  // const [width, setWidth] = useState<any>(`100%`);
  // const [height, setHeight] = useState<any>(`100%`);
  const [code, setCode] = useState<string>(tab.code);
  const [isDiffMode, setIsDiffMode] = useState<boolean>(tab.isDiffMode);
  const diffEditorContainerRef = useRef<HTMLDivElement>(null);

  const options: monacoEditor.editor.IEditorOptions = {
    automaticLayout: true
  };

  const diffOptions: monacoEditor.editor.IDiffEditorOptions = {
    automaticLayout: true,
    readOnly: false,
    originalEditable: false,
    enableSplitViewResizing: true
  };

  const onChange = (newValue: any, e: any) => {
    // console.log('onChange', newValue, e);
    tab.setCode(newValue);
  };

  const onDiffEditorChange = () => {
    if(tab.diffEditor) {
      const modifiedEditor = tab.diffEditor.getModifiedEditor();
      const modifiedText = modifiedEditor.getValue();
      tab.setCode(modifiedText);
    }
  };

  const editorDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
    console.log('editorDidMount', editor, monaco)
    tab.setEditor(editor);
    tab.setMonaco(monaco);
    tab.triggerLinterTimeout();
  };

  const onEditorFileLoad = () => {
    setCode(tab.code);
    if(tab.isDiffMode && tab.modifiedModel) {
      tab.modifiedModel.setValue(tab.code);
    }
  };

  const onDiffModeChanged = () => {
    setIsDiffMode(tab.isDiffMode);
    if(tab.isDiffMode) {
      // Wait for next render to create diff editor
      setTimeout(() => {
        createDiffEditor();
      }, 0);
    } else {
      // Clean up diff editor
      if(tab.diffEditor) {
        tab.diffEditor.dispose();
        tab.diffEditor = null as any;
      }
    }
  };

  const createDiffEditor = () => {
    if(!tab.monaco || !diffEditorContainerRef.current || !tab.isDiffMode) return;
    
    if(tab.diffEditor) {
      tab.diffEditor.dispose();
    }

    const diffEditor = tab.monaco.editor.createDiffEditor(diffEditorContainerRef.current, {
      ...diffOptions,
      theme: 'nwscript-dark'
    });

    if(tab.originalModel && tab.modifiedModel) {
      diffEditor.setModel({
        original: tab.originalModel,
        modified: tab.modifiedModel
      });
    }

    tab.setDiffEditor(diffEditor);

    // Listen for changes in the modified editor
    const modifiedEditor = diffEditor.getModifiedEditor();
    modifiedEditor.onDidChangeModelContent(() => {
      onDiffEditorChange();
    });
  };

  useEffectOnce( () => {
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    tab.addEventListener('onDiffModeChanged', onDiffModeChanged);
    
    // Create diff editor if already in diff mode
    if(tab.isDiffMode && tab.monaco) {
      setTimeout(() => {
        createDiffEditor();
      }, 100);
    }
    
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onDiffModeChanged', onDiffModeChanged);
      if(tab.diffEditor) {
        tab.diffEditor.dispose();
      }
    }
  });

  // Update diff editor when code changes externally
  useEffect(() => {
    if(tab.isDiffMode && tab.modifiedModel && tab.code !== tab.modifiedModel.getValue()) {
      tab.modifiedModel.setValue(tab.code);
    }
  }, [tab.code, tab.isDiffMode]);

  // Handle keyboard shortcuts using TabState's keybinding system
  const onKeyDown = (event: KeyboardEvent, tabState: TabTextEditorState) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    // Ctrl+S / Cmd+S - Save
    if (isCtrlOrCmd && event.key === 's' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      tab.save();
    }
    // Ctrl+Shift+S / Cmd+Shift+S - Save As
    else if (isCtrlOrCmd && event.key === 's' && event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      tab.saveAs();
    }
    // Ctrl+B / Cmd+B - Compile
    else if (isCtrlOrCmd && event.key === 'b') {
      event.preventDefault();
      event.stopPropagation();
      tab.compile();
    }
  };

  useEffectOnce(() => {
    tab.addEventListener('onKeyDown', onKeyDown);
    return () => {
      tab.removeEventListener('onKeyDown', onKeyDown);
    };
  });

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        {
          label: 'Save',
          onClick: () => {
            tab.save();
          }
        },
        {
          label: 'Save As',
          onClick: () => {
            tab.saveAs();
          }
        },
        {
          separator: true
        },
        {
          label: 'Compile',
          onClick: () => {
            tab.compile();
          }
        }
      ]
    },
    {
      label: 'View',
      children: [
        {
          label: 'Toggle Diff Mode',
          onClick: () => {
            if(tab.isDiffMode) {
              tab.switchToRegularMode();
            } else {
              tab.switchToDiffMode();
            }
          }
        }
      ]
    }
  ];

  const southContent = (
    <TabManagerProvider manager={tab.getSouthTabManager()}>
      <TabManager></TabManager>
    </TabManagerProvider>
  );

  return (
    <>
      <LayoutContainerProvider>
        <LayoutContainer southContent={southContent}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <MenuBar items={menuItems} />
            <div style={{ 
              position: 'absolute',
              top: '24px',
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: 'calc(100% - 24px)'
            }}>
              {isDiffMode ? (
                <div ref={diffEditorContainerRef} style={{ width: '100%', height: '100%' }}></div>
              ) : (
                <MonacoEditor
                  width="100%"
                  height="100%"
                  language="nwscript"
                  theme="nwscript-dark"
                  value={code}
                  options={options}
                  onChange={onChange}
                  editorDidMount={editorDidMount}
                />
              )}
            </div>
          </div>
        </LayoutContainer>
      </LayoutContainerProvider>
    </>
  )
}
