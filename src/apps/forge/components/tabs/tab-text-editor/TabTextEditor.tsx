import React, { useState } from "react";
import MonacoEditor from "react-monaco-editor";
import { useEffectOnce } from "../../../helpers/UseEffectOnce";
import { TabTextEditorState } from "../../../states/tabs";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { TabManagerProvider } from "../../../context/TabManagerContext";
import TabManager from "../TabManager";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";

export const TabTextEditor = function(props: any){
  const tab: TabTextEditorState = props.tab;

  // const [width, setWidth] = useState<any>(`100%`);
  // const [height, setHeight] = useState<any>(`100%`);
  const [code, setCode] = useState<string>(tab.code);

  const options: any = {

  };

  const onChange = (newValue: any, e: any) => {
    // console.log('onChange', newValue, e);
    tab.setCode(newValue);
  }

  const editorDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => {
    console.log('editorDidMount', editor, monaco)
    tab.setEditor(editor);
    tab.setMonaco(monaco);
    tab.triggerLinterTimeout();
  }

  const onEditorFileLoad = () => {
    setCode(tab.code);
  }

  useEffectOnce( () => {
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    }
  });

  const southContent = (
    <TabManagerProvider manager={tab.getSouthTabManager()}>
      <TabManager></TabManager>
    </TabManagerProvider>
  );

  return (
    <>
      <LayoutContainerProvider>
        <LayoutContainer southContent={southContent}>
          <MonacoEditor
            width={`100%`}
            height={`100%`}
            language="nwscript"
            theme="nwscript-dark"
            value={code}
            options={options}
            onChange={onChange}
            editorDidMount={editorDidMount}
            
          />
        </LayoutContainer>
      </LayoutContainerProvider>
    </>
  )
}

