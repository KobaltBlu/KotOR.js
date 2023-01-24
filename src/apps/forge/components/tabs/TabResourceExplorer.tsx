import React from "react";
import BaseTab, { BaseTabProps } from "./BaseTab";

export default class TabResourceExplorer extends BaseTab {

  constructor(props: BaseTabProps){
    super(props);
  }

  render(): React.ReactNode {
    return (
      <div className="scroll-container" style={{ width:'100%', overflow: 'auto' }}>
        <ul className="tree css-treeview js" />
      </div>
    );
  }

}
