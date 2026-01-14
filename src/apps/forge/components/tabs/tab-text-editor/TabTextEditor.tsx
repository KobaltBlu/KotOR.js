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
    
    // Ensure cursor is at the beginning with no selection when editor mounts
    if(editor && monaco) {
      setTimeout(() => {
        editor.setPosition({ lineNumber: 1, column: 1 });
        editor.setSelection(new monaco.Selection(1, 1, 1, 1));
      }, 0);
    }

    // Register custom handler for smart comment continuation
    if(editor && monaco) {
      // Use onKeyDown to intercept Enter key in comments
      const disposable = editor.onKeyDown((e: monacoEditor.IKeyboardEvent) => {
        if (e.keyCode === monaco.KeyCode.Enter) {
          // @stub
        }
      });

      // Store disposable for cleanup if needed
      (editor as any)._nwscriptCommentDisposable = disposable;
    }
  };
  
  const onEditorFileLoad = () => {
    setCode(tab.code);
    if(tab.isDiffMode && tab.modifiedModel) {
      tab.modifiedModel.setValue(tab.code);
    }
    // Reset cursor position to beginning to prevent auto-selection
    if(tab.editor && tab.monaco) {
      setTimeout(() => {
        tab.editor.setPosition({ lineNumber: 1, column: 1 });
        tab.editor.setSelection(new tab.monaco.Selection(1, 1, 1, 1));
      }, 0);
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
    
    // Apply tab size to the diff editor
    tab.updateTabSize();

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

  // Update editor options when tabSize changes
  useEffect(() => {
    if(tab.editor) {
      tab.updateTabSize();
    }
  }, [tab.tabSize]);

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
    // Ctrl+Shift+F / Cmd+Shift+F - Format Document
    else if (isCtrlOrCmd && event.key === 'f' && event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      if(tab.editor && tab.monaco) {
        tab.editor.getAction('editor.action.formatDocument')?.run();
      }
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
      label: 'Edit',
      children: [
        {
          label: 'Format Document',
          onClick: () => {
            if(tab.editor && tab.monaco) {
              tab.editor.getAction('editor.action.formatDocument')?.run();
            }
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
        },
        {
          separator: true
        },
        {
          label: 'Tab Size',
          children: [
            {
              label: '2 Spaces',
              onClick: () => {
                // Use setTimeout to ensure update happens after menu closes
                setTimeout(() => {
                  tab.setTabSize(2);
                }, 0);
              }
            },
            {
              label: '4 Spaces',
              onClick: () => {
                setTimeout(() => {
                  tab.setTabSize(4);
                }, 0);
              }
            },
            {
              label: '8 Spaces',
              onClick: () => {
                setTimeout(() => {
                  tab.setTabSize(8);
                }, 0);
              }
            }
          ]
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
