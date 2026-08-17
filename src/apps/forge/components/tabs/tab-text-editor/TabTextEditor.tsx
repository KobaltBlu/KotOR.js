import React, { useState, useRef, useEffect } from "react";
import MonacoEditor from "react-monaco-editor";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabTextEditorState } from "@/apps/forge/states/tabs";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { LayoutContainerProvider } from "@/apps/forge/context/LayoutContainerContext";
import { TabManagerProvider } from "@/apps/forge/context/TabManagerContext";
import TabManager from "@/apps/forge/components/tabs/TabManager";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";
import { ForgeButton } from "@/apps/forge/components/ui";
import { NcsInspector } from "@/apps/forge/components/tabs/tab-ncs-inspector/NcsInspector";
import {
  getNcsInspectorDrawerOpen,
  getNcsInspectorDrawerWidth,
  setNcsInspectorDrawerOpen,
  setNcsInspectorDrawerWidth,
} from "@/apps/forge/components/tabs/tab-ncs-inspector/ncsInspectorConfig";
import { addForgeThemeChangeListener, removeForgeThemeChangeListener } from "@/apps/forge/settings/forgeTheme";
import {
  addForgeEditorSettingsListener,
  removeForgeEditorSettingsListener,
  toMonacoEditorOptions,
} from "@/apps/forge/settings/forgeEditorSettings";
import { formatKeybinding } from "@/apps/forge/commands/forgeKeybindings";

export const TabTextEditor = function(props: any){
  const tab: TabTextEditorState = props.tab;

  // const [width, setWidth] = useState<any>(`100%`);
  // const [height, setHeight] = useState<any>(`100%`);
  const [code, setCode] = useState<string>(tab.code);
  const [isDiffMode, setIsDiffMode] = useState<boolean>(tab.isDiffMode);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(() => getNcsInspectorDrawerOpen(false));
  const [inspectorWidth, setInspectorWidth] = useState<number>(() => getNcsInspectorDrawerWidth(440));
  const [ncsEpoch, setNcsEpoch] = useState(0);
  const [, forceUpdate] = useState({});
  const diffEditorContainerRef = useRef<HTMLDivElement>(null);

  const editorVisualOptions = toMonacoEditorOptions();
  const options: monacoEditor.editor.IEditorOptions = {
    automaticLayout: true,
    ...editorVisualOptions,
  };

  const diffOptions: monacoEditor.editor.IDiffEditorOptions = {
    automaticLayout: true,
    readOnly: false,
    originalEditable: false,
    enableSplitViewResizing: true,
    ...editorVisualOptions,
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

      editor.addAction({
        id: "nwscript.showInNcs",
        label: "Show in NCS",
        keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyN],
        contextMenuGroupId: "navigation",
        run: (ed) => {
          const line = ed.getPosition()?.lineNumber;
          if (line) {
            tab.revealNcsForLine(line);
          }
        },
      });
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

  const onRevealNss = (line: number) => {
    setTimeout(() => {
      if (tab.editor) {
        tab.editor.revealLineInCenter(line);
        tab.editor.setPosition({ lineNumber: line, column: 1 });
        tab.editor.focus();
      }
    }, 0);
  };

  const onCompileOrNcsChange = () => {
    setCode(tab.code);
    setNcsEpoch((value) => value + 1);
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
      theme: tab.getTheme()
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
    tab.addEventListener('onRevealNss', onRevealNss);
    tab.addEventListener('onCompile', onCompileOrNcsChange);
    const onHistoryChanged = () => forceUpdate({});
    tab.addEventListener('onHistoryChanged', onHistoryChanged);
    
    // Create diff editor if already in diff mode
    if(tab.isDiffMode && tab.monaco) {
      setTimeout(() => {
        createDiffEditor();
      }, 100);
    }
    
    const onThemeChange = () => {
      if (tab.monaco) {
        tab.monaco.editor.setTheme(tab.getTheme());
      }
      forceUpdate({});
    };
    const onEditorSettingsChange = () => {
      tab.applyEditorSettings();
      forceUpdate({});
    };
    addForgeThemeChangeListener(onThemeChange);
    addForgeEditorSettingsListener(onEditorSettingsChange);

    return () => {
      removeForgeThemeChangeListener(onThemeChange);
      removeForgeEditorSettingsListener(onEditorSettingsChange);
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
      tab.removeEventListener('onDiffModeChanged', onDiffModeChanged);
      tab.removeEventListener('onRevealNss', onRevealNss);
      tab.removeEventListener('onCompile', onCompileOrNcsChange);
      tab.removeEventListener('onHistoryChanged', onHistoryChanged);
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
  const onKeyDown = (event: KeyboardEvent) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    if (isCtrlOrCmd && event.key === 'f' && event.shiftKey) {
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
          label: 'Undo',
          shortcut: formatKeybinding('Mod+Z'),
          onClick: () => {
            tab.undo();
          },
          disabled: !tab.canUndo,
        },
        {
          label: 'Redo',
          shortcut: formatKeybinding('Mod+Y'),
          onClick: () => {
            tab.redo();
          },
          disabled: !tab.canRedo,
        },
        {
          separator: true
        },
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
        ...(tab.isNcsFile() ? [{
          label: inspectorOpen ? 'Hide NCS Inspector' : 'Inspect NCS',
          onClick: () => {
            const next = !inspectorOpen;
            setInspectorOpen(next);
            setNcsInspectorDrawerOpen(next);
          }
        }] : []),
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
              },
              checked: tab.tabSize === 2
            },
            {
              label: '4 Spaces',
              onClick: () => {
                setTimeout(() => {
                  tab.setTabSize(4);
                }, 0);
              },
              checked: tab.tabSize === 4
            },
            {
              label: '8 Spaces',
              onClick: () => {
                setTimeout(() => {
                  tab.setTabSize(8);
                }, 0);
              },
              checked: tab.tabSize === 8
            }
          ]
        },
        {
          separator: true
        },
        {
          label: 'Language',
          children: [
            {
              label: 'Auto-detect',
              onClick: () => {
                setTimeout(() => {
                  tab.setLanguageId(null);
                  forceUpdate({});
                }, 0);
              },
              checked: tab.manualLanguageId === null
            },
            {
              separator: true
            },
            {
              label: 'Plain Text',
              onClick: () => {
                setTimeout(() => {
                  tab.setLanguageId('plaintext');
                  forceUpdate({});
                }, 0);
              },
              checked: tab.manualLanguageId === 'plaintext'
            },
            {
              label: 'NWScript',
              onClick: () => {
                setTimeout(() => {
                  tab.setLanguageId('nwscript');
                  forceUpdate({});
                }, 0);
              },
              checked: tab.manualLanguageId === 'nwscript'
            },
            {
              label: 'LYT (Layout)',
              onClick: () => {
                setTimeout(() => {
                  tab.setLanguageId('lyt');
                  forceUpdate({});
                }, 0);
              },
              checked: tab.manualLanguageId === 'lyt'
            }
          ]
        }
      ]
    }
  ];

  const monacoPane = isDiffMode ? (
    <div ref={diffEditorContainerRef} style={{ width: '100%', height: '100%' }}></div>
  ) : (
    <MonacoEditor
      width="100%"
      height="100%"
      language={tab.getLanguageId()}
      theme={tab.getTheme()}
      value={code}
      options={options}
      onChange={onChange}
      editorDidMount={editorDidMount}
    />
  );

  const inspectorPane = (
    <NcsInspector
      key={`${ncsEpoch}-${tab.ncs?.length || 0}`}
      bytes={tab.ncs || new Uint8Array(0)}
      script={tab.nwScript}
      recoveredFunctions={tab.recoveredFunctions}
      nssLineMap={tab.nssLineMap}
      revealCodeOffset={tab.revealNcsCodeOffset}
      fileName={tab.file?.getFilename?.()}
      editorFile={tab.file}
      onClose={() => {
        setInspectorOpen(false);
        setNcsInspectorDrawerOpen(false);
      }}
      onShowInNss={(line) => tab.revealNssLine(line)}
    />
  );

  const southContent = (
    <TabManagerProvider manager={tab.getSouthTabManager()}>
      <TabManager></TabManager>
    </TabManagerProvider>
  );

  const center = (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MenuBar items={menuItems} />
      {tab.isNcsFile() && (
        <ForgeButton
          size="sm"
          variant={inspectorOpen ? "primary" : "secondary"}
          onClick={() => {
            const next = !inspectorOpen;
            setInspectorOpen(next);
            setNcsInspectorDrawerOpen(next);
          }}
          style={{ position: 'absolute', top: 2, right: 6, zIndex: 4, padding: '1px 8px' }}
        >
          {inspectorOpen ? 'Close Inspector' : 'Inspect NCS'}
        </ForgeButton>
      )}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 'calc(100% - 24px)'
      }}>
        {tab.isNcsFile() ? (
          <LayoutContainerProvider>
            <LayoutContainer
              eastContent={inspectorOpen ? inspectorPane : undefined}
              eastSize={inspectorWidth}
              onEastSizeChange={(width) => {
                setInspectorWidth(width);
                setNcsInspectorDrawerWidth(width);
              }}
            >
              {monacoPane}
            </LayoutContainer>
          </LayoutContainerProvider>
        ) : (
          monacoPane
        )}
      </div>
    </div>
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer southContent={southContent}>
        {center}
      </LayoutContainer>
    </LayoutContainerProvider>
  )
}
