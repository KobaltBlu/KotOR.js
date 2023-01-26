import React from "react";
import BaseTab from "./BaseTab";
import { BaseTabProps } from "../../interfaces/BaseTabProps";

export const TabProjectExplorer = function(props: BaseTabProps) {

  return (
    <div className="scroll-container" style={{ width:'100%', overflow: 'auto' }}>
      <ul className="tree css-treeview js">
        
      </ul>
    </div>
  );

}
