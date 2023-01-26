import React from "react";
import {TabState} from "../../states/tabs/TabState";
import {LayoutContainer} from "../LayoutContainer";
import {LayoutContainerProvider} from "../../context/LayoutContainerContext";
import { BaseTabProps } from "../../interfaces/BaseTabProps";

class BaseTab extends React.Component<BaseTabProps, {}> {
  northContent?: JSX.Element;
  southContent?: JSX.Element;
  eastContent?: JSX.Element;
  westContent?: JSX.Element;

  constructor(props: BaseTabProps){
    super(props);

    this.northContent = props.northContent;
    this.southContent = props.southContent;
    this.eastContent  = props.eastContent;
    this.westContent  = props.westContent;
  }

  render(): React.ReactNode {
    let content = this.props.tab.tabContentView.render();
    return (
      <div className={`tab-pane ${this.props.tab.visible ? 'show': ''}`} key={this.props.tab.id}>
        <LayoutContainerProvider>
          <LayoutContainer 
            northContent={this.northContent} 
            southContent={this.southContent} 
            eastContent={this.eastContent}
            westContent={this.westContent}
          >
            {content}
          </LayoutContainer>
        </LayoutContainerProvider>
      </div>
    );
  }

}

export default BaseTab;