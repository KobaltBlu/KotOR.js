import React from "react";
import { EditorFile } from "../../../../editor/EditorFile";
// import { EditorTab } from "../../../../editor/tabs/EditorTab";

export interface EditorTabProps {
  file: EditorFile,
  children: React.ReactNode,
  northPaneContent: React.ReactNode,
  southPaneContent: React.ReactNode,
  eastPaneContent: React.ReactNode,
  westPaneContent: React.ReactNode,
}

class EditorTab extends React.Component<EditorTabProps, {}> {

  constructor(props: EditorTabProps){
    super(props);
  }


  render(): React.ReactNode {
    // let content = this.props.tab.tabContentView.render();
    return (
      <></>
      // <div className={`tab-pane ${this.props.tab.visible ? 'show': ''}`} key={this.props.tab.id}>
      //   {content}
      // </div>
    );
  }

}

export default EditorTab;